import { join } from 'node:path'
import fse from 'fs-extra'
import debounce from 'lodash/debounce.js'
import chokidar from 'chokidar'
import { createServer } from 'vite'

import { AppDevserver } from '../../app-devserver.js'
import { quasarBexConfig } from './bex-config.js'
import { createManifest, copyBexAssets } from './bex-utils.js'

export class QuasarModeDevserver extends AppDevserver {
  #viteWatchers = []
  #manifestWatcher = null
  #scriptWatchers = []

  #viteServer = null
  #scripts = {
    background: null,
    contentList: [],
    otherList: []
  }

  constructor (opts) {
    super(opts)

    this.registerDiff('distDir', quasarConf => [
      quasarConf.build.distDir
    ])

    this.registerDiff('bex-manifest', quasarConf => [
      quasarConf.sourceFiles.bexManifestFile,
      quasarConf.bex.extendBexManifestJson,
      quasarConf.build.distDir
    ])

    this.registerDiff('bex-scripts', (quasarConf, diffMap) => [
      quasarConf.build.distDir,
      quasarConf.devServer.port,

      quasarConf.bex.dynamicContentScripts,
      quasarConf.bex.otherScripts,
      quasarConf.bex.extendBexScriptsConf,

      // extends 'esbuild' diff
      ...diffMap.esbuild(quasarConf)
    ])
  }

  run (quasarConf, __isRetry) {
    const { diff, queue } = super.run(quasarConf, __isRetry)

    if (diff('distDir', quasarConf)) {
      this.#viteWatchers.forEach(watcher => { watcher.close() })
      this.#viteWatchers = []

      if (this.#manifestWatcher !== null) {
        this.#manifestWatcher.close()
        this.#manifestWatcher = null
      }

      this.#scriptWatchers.forEach(watcher => { watcher.close() })
      this.#scriptWatchers = []

      this.cleanArtifacts(quasarConf.build.distDir)
    }

    if (diff('bex-manifest', quasarConf)) {
      return queue(() => this.#compileBexManifest(quasarConf, queue))
    }

    if (diff('bex-scripts', quasarConf)) {
      return queue(() => this.#compileBexScripts(quasarConf))
    }

    if (diff('vite', quasarConf)) {
      return queue(() => this.#runVite(quasarConf))
    }
  }

  async #compileBexManifest (quasarConf, queue) {
    if (this.#manifestWatcher !== null) {
      this.#manifestWatcher.close()
    }

    const { err, bexBackgroundScript, bexContentScriptList, bexOtherScriptList } = createManifest(quasarConf)
    if (err !== void 0) process.exit(1)

    const setScripts = (background, contentList, otherList) => {
      this.#scripts.background = background || null
      this.#scripts.contentList = contentList
      this.#scripts.otherList = otherList

      return JSON.stringify(this.#scripts)
    }

    let scriptSnapshot = setScripts(bexBackgroundScript, bexContentScriptList, bexOtherScriptList)
    const updateClient = () => {
      this.printBanner(quasarConf)
      this.#viteServer?.ws.send({ type: 'qbex:hmr:reload' })
    }

    this.#manifestWatcher = chokidar.watch(quasarConf.metaConf.bexManifestFile, { ignoreInitial: true })
    this.#manifestWatcher.on('change', debounce(() => {
      const { err, bexBackgroundScript, bexContentScriptList, bexOtherScriptList } = createManifest(quasarConf)
      if (err === void 0) {
        const newSnapshot = setScripts(bexBackgroundScript, bexContentScriptList, bexOtherScriptList)

        if (newSnapshot === scriptSnapshot) {
          updateClient()
          return
        }

        scriptSnapshot = newSnapshot
        queue(() => this.#compileBexScripts(quasarConf).then(updateClient))
      }
    }, 1000))
  }

  async #compileBexScripts (quasarConf) {
    this.#scriptWatchers.forEach(watcher => { watcher.close() })
    this.#scriptWatchers = []

    const onRebuild = () => {
      this.printBanner(quasarConf)
      this.#viteServer?.ws.send({ type: 'qbex:hmr:reload' })
    }

    if (this.#scripts.background !== null) {
      const bgConfig = await quasarBexConfig.backgroundScript(quasarConf, this.#scripts.background)
      await this.watchWithEsbuild(`Background Script (${ this.#scripts.background.name })`, bgConfig, onRebuild)
        .then(esbuildCtx => { this.#scriptWatchers.push({ close: esbuildCtx.dispose }) })
    }

    for (const entry of this.#scripts.contentList) {
      const contentConfig = await quasarBexConfig.contentScript(quasarConf, entry)

      await this.watchWithEsbuild(`Content Script (${ entry.name })`, contentConfig, onRebuild)
        .then(esbuildCtx => { this.#scriptWatchers.push({ close: esbuildCtx.dispose }) })
    }

    for (const entry of this.#scripts.otherList) {
      const contentConfig = await quasarBexConfig.otherScript(quasarConf, entry)

      await this.watchWithEsbuild(`Other Script (${ entry.name })`, contentConfig, onRebuild)
        .then(esbuildCtx => { this.#scriptWatchers.push({ close: esbuildCtx.dispose }) })
    }
  }

  async #runVite (quasarConf) {
    this.#viteWatchers.forEach(watcher => { watcher.close() })
    this.#viteWatchers = []

    const viteConfig = await quasarBexConfig.vite(quasarConf)
    this.#viteServer = await createServer(viteConfig)

    await this.#viteServer.listen()

    this.#viteWatchers.push(
      {
        close: () => {
          this.#viteServer.close()
          this.#viteServer = null
        }
      },
      this.#getIndexHtmlWatcher(quasarConf, this.#viteServer),
      this.#getBexAssetsDirWatcher(quasarConf)
    )

    this.printBanner(quasarConf)
  }

  #getIndexHtmlWatcher (quasarConf, viteServer) {
    fse.ensureDirSync(join(quasarConf.build.distDir, 'www'))

    const templatePath = this.ctx.appPaths.resolve.app('index.html')
    const htmlPath = join(quasarConf.build.distDir, 'www/index.html')

    const updateTemplate = () => {
      const template = fse.readFileSync(templatePath, 'utf-8')
      viteServer.transformIndexHtml('/', template).then(html => {
        fse.writeFileSync(htmlPath, html, 'utf-8')
        viteServer.ws.send({ type: 'full-reload' })
      })
    }

    const htmlWatcher = chokidar.watch(templatePath).on('change', updateTemplate)

    updateTemplate()
    return htmlWatcher
  }

  #getBexAssetsDirWatcher (quasarConf) {
    const folders = copyBexAssets(quasarConf)
    const watcher = chokidar.watch(folders, { ignoreInitial: true })

    const copy = debounce(() => {
      copyBexAssets(quasarConf)
      this.printBanner(quasarConf)
    }, 1000)

    watcher.on('add', copy)
    watcher.on('change', copy)

    return watcher
  }
}
