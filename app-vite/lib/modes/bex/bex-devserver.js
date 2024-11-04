import fse from 'fs-extra'
import debounce from 'lodash/debounce.js'
import chokidar from 'chokidar'

import { AppDevserver } from '../../app-devserver.js'
import { quasarBexConfig } from './bex-config.js'
import { createManifest, copyBexAssets } from './bex-utils.js'

export class QuasarModeDevserver extends AppDevserver {
  #uiWatchers = []
  #manifestWatcher = null
  #scriptWatchers = []

  constructor (opts) {
    super(opts)

    this.registerDiff('distDir', quasarConf => [
      quasarConf.build.distDir
    ])

    this.registerDiff('bex', (quasarConf, diffMap) => [
      quasarConf.sourceFiles.bexManifestFile,
      quasarConf.bex.extendBexManifestJson,
      quasarConf.bex.dynamicContentScripts,
      quasarConf.bex.otherScripts,
      quasarConf.bex.extendBexScriptsConf,
      quasarConf.build.distDir,

      // extends 'esbuild' diff
      ...diffMap.esbuild(quasarConf)
    ])
  }

  run (quasarConf, __isRetry) {
    const { diff, queue } = super.run(quasarConf, __isRetry)

    if (diff('distDir', quasarConf)) {
      this.#uiWatchers.forEach(watcher => { watcher.close() })
      this.#uiWatchers = []

      if (this.#manifestWatcher !== null) {
        this.#manifestWatcher.close()
        this.#manifestWatcher = null
      }

      this.#scriptWatchers.forEach(watcher => { watcher.close() })
      this.#scriptWatchers = []

      this.cleanArtifacts(quasarConf.build.distDir)
    }

    if (diff('bex', quasarConf)) {
      return queue(() => this.#compileBex(quasarConf, queue))
    }

    if (diff('vite', quasarConf)) {
      return queue(() => this.#compileUI(quasarConf, queue))
    }
  }

  async #compileBex (quasarConf, queue) {
    if (this.#manifestWatcher !== null) {
      this.#manifestWatcher.close()
      this.#manifestWatcher = null
    }

    const { err, bexManifestPath, bexBackgroundScript, bexContentScriptList, bexOtherScriptList } = createManifest(quasarConf)

    if (err !== void 0) process.exit(1)

    this.#manifestWatcher = chokidar.watch(bexManifestPath, { ignoreInitial: true })

    this.#manifestWatcher.on('change', debounce(() => {
      queue(() => {
        const { err, bexBackgroundScript, bexContentScriptList, bexOtherScriptList } = createManifest(quasarConf)
        if (err !== void 0) return

        return this.#compileBexScripts(quasarConf, bexBackgroundScript, bexContentScriptList, bexOtherScriptList)
          .then(() => { this.printBanner(quasarConf) })
      })
    }, 1000))

    return this.#compileBexScripts(quasarConf, bexBackgroundScript, bexContentScriptList, bexOtherScriptList)
  }

  async #compileBexScripts (quasarConf, bexBackgroundScript, bexContentScriptList, bexOtherScriptList) {
    this.#scriptWatchers.forEach(watcher => { watcher.close() })
    this.#scriptWatchers = []

    const rebuilt = () => {
      this.printBanner(quasarConf)
    }

    if (bexBackgroundScript !== null) {
      const bgConfig = await quasarBexConfig.backgroundScript(quasarConf, bexBackgroundScript)
      await this.watchWithEsbuild(`Background Script (${ bexBackgroundScript.name })`, bgConfig, rebuilt)
        .then(esbuildCtx => { this.#scriptWatchers.push({ close: esbuildCtx.dispose }) })
    }

    for (const entry of bexContentScriptList) {
      const contentConfig = await quasarBexConfig.contentScript(quasarConf, entry)

      await this.watchWithEsbuild(`Content Script (${ entry.name })`, contentConfig, rebuilt)
        .then(esbuildCtx => { this.#scriptWatchers.push({ close: esbuildCtx.dispose }) })
    }

    for (const entry of bexOtherScriptList) {
      const contentConfig = await quasarBexConfig.otherScript(quasarConf, entry)

      await this.watchWithEsbuild(`Other Script (${ entry.name })`, contentConfig, rebuilt)
        .then(esbuildCtx => { this.#scriptWatchers.push({ close: esbuildCtx.dispose }) })
    }
  }

  async #compileUI (quasarConf, queue) {
    this.#uiWatchers.forEach(watcher => { watcher.close() })
    this.#uiWatchers = []

    const viteConfig = await quasarBexConfig.vite(quasarConf)
    await this.buildWithVite('BEX UI', viteConfig)

    this.#uiWatchers = [
      this.#getViteWatcher(quasarConf, viteConfig, queue),
      this.#getBexAssetsDirWatcher(quasarConf)
    ]

    if (quasarConf.build.ignorePublicFolder !== true) {
      this.#uiWatchers.push(
        this.#getPublicDirWatcher(quasarConf)
      )
    }

    this.printBanner(quasarConf)
  }

  #getViteWatcher (quasarConf, viteConfig, queue) {
    const watcher = chokidar.watch([
      this.ctx.appPaths.srcDir,
      this.ctx.appPaths.resolve.app('index.html')
    ], {
      ignoreInitial: true
    })

    const rebuild = debounce(() => {
      queue(() => {
        return this.buildWithVite('BEX UI', viteConfig)
          .then(() => { this.printBanner(quasarConf) })
      })
    }, 1000)

    watcher.on('add', rebuild)
    watcher.on('change', rebuild)
    watcher.on('unlink', rebuild)

    return watcher
  }

  #getPublicDirWatcher (quasarConf) {
    const watcher = chokidar.watch(this.ctx.appPaths.publicDir, { ignoreInitial: true })

    const copy = debounce(() => {
      fse.copySync(this.ctx.appPaths.publicDir, quasarConf.build.distDir)
      this.printBanner(quasarConf)
    }, 1000)

    watcher.on('add', copy)
    watcher.on('change', copy)

    return watcher
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
