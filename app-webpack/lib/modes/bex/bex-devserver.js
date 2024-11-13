const { join } = require('node:path')
const fse = require('fs-extra')
const debounce = require('lodash/debounce.js')
const chokidar = require('chokidar')
const webpack = require('webpack')
const WebpackDevServer = require('webpack-dev-server')

const { AppDevserver } = require('../../app-devserver.js')
const { quasarBexConfig } = require('./bex-config.js')
const { createManifest, copyBexAssets } = require('./bex-utils.js')

const reloadPayload = JSON.stringify({ type: 'custom', event: 'qbex:hmr:reload' })

module.exports.QuasarModeDevserver = class QuasarModeDevserver extends AppDevserver {
  #webpackWatcherList = []
  #manifestWatcher = null
  #scriptWatcherList = []

  #webpackServer = null
  #scriptList = []

  constructor (opts) {
    super(opts)

    this.registerDiff('distDir', quasarConf => [
      quasarConf.build.distDir
    ])

    this.registerDiff('bexManifest', quasarConf => [
      quasarConf.sourceFiles.bexManifestFile,
      quasarConf.bex.extendBexManifestJson,
      quasarConf.build.distDir
    ])

    this.registerDiff('bexScripts', (quasarConf, diffMap) => [
      quasarConf.build.distDir,
      quasarConf.devServer.port,

      quasarConf.bex.extraScripts,
      quasarConf.bex.extendBexScriptsConf,

      // extends 'esbuild' diff
      ...diffMap.esbuild(quasarConf)
    ])
  }

  run (quasarConf, __isRetry) {
    const { diff, queue } = super.run(quasarConf, __isRetry)

    if (diff('distDir', quasarConf)) {
      return queue(() => this.#stopWatchers(quasarConf))
    }

    if (diff('bexManifest', quasarConf)) {
      return queue(() => this.#compileBexManifest(quasarConf, queue))
    }

    if (diff('bexScripts', quasarConf)) {
      return queue(() => this.#compileBexScripts(quasarConf))
    }

    if (diff('webpack', quasarConf)) {
      return queue(() => this.#runWebpack(quasarConf))
    }
  }

  async #stopWatchers (quasarConf) {
    if (this.#manifestWatcher !== null) {
      this.#manifestWatcher.close()
      this.#manifestWatcher = null
    }

    await this.clearWatcherList(this.#webpackWatcherList, () => { this.#webpackWatcherList = [] })
    await this.clearWatcherList(this.#scriptWatcherList, () => { this.#scriptWatcherList = [] })

    this.cleanArtifacts(quasarConf.build.distDir)
  }

  async #compileBexManifest (quasarConf, queue) {
    if (this.#manifestWatcher !== null) {
      this.#manifestWatcher.close()
    }

    const { err, scriptList } = createManifest(quasarConf)
    if (err !== void 0) process.exit(1)

    const setScripts = list => {
      this.#scriptList = list
      return JSON.stringify(list)
    }

    let scriptSnapshot = setScripts(scriptList)
    const updateClient = () => {
      this.printBanner(quasarConf)
      this.#triggerExtensionReload()
    }

    this.#manifestWatcher = chokidar.watch(quasarConf.metaConf.bexManifestFile, { ignoreInitial: true })
    this.#manifestWatcher.on('change', debounce(() => {
      const { err, scriptList } = createManifest(quasarConf)
      if (err !== void 0) return

      const newSnapshot = setScripts(scriptList)

      if (newSnapshot === scriptSnapshot) {
        updateClient()
        return
      }

      scriptSnapshot = newSnapshot
      queue(() => this.#compileBexScripts(quasarConf).then(updateClient))
    }, 1000))
  }

  async #compileBexScripts (quasarConf) {
    await this.clearWatcherList(this.#scriptWatcherList, () => { this.#scriptWatcherList = [] })

    const onRebuild = () => {
      this.printBanner(quasarConf)
      this.#triggerExtensionReload()
    }

    for (const entry of this.#scriptList) {
      const contentConfig = await quasarBexConfig.bexScript(quasarConf, entry)

      await this.watchWithEsbuild(`Bex Script (${ entry.name })`, contentConfig, onRebuild)
        .then(esbuildCtx => { this.#scriptWatcherList.push({ close: esbuildCtx.dispose }) })
    }
  }

  #triggerExtensionReload () {
    this.#webpackServer?.webSocketServer.clients.forEach(client => {
      client.send(reloadPayload)
    })
  }

  async #runWebpack (quasarConf) {
    await this.clearWatcherList(this.#webpackWatcherList, () => { this.#webpackWatcherList = [] })

    const webpackConf = await quasarBexConfig.webpack(quasarConf)

    let started = false

    this.#webpackWatcherList.push(
      this.#getBexAssetsDirWatcher(quasarConf)
    )

    return new Promise(resolve => {
      const compiler = webpack(webpackConf)

      compiler.hooks.done.tap('done-compiling', stats => {
        if (started === true) return

        // start dev server if there are no errors
        if (stats.hasErrors() === true) return

        started = true
        resolve()

        this.printBanner(quasarConf)
      })

      // start building & launch server
      this.#webpackServer = new WebpackDevServer(quasarConf.devServer, compiler)
      this.#webpackServer.start()

      this.#webpackWatcherList.push(
        {
          close: () => {
            const server = this.#webpackServer
            this.#webpackServer = null
            return server.stop()
          }
        }
      )

      if (this.ctx.target.firefox) {
        this.#webpackWatcherList.push(
          this.#getAppSourceWatcher(quasarConf, viteConfig, queue),
          this.#getPublicDirWatcher(quasarConf)
        )
      }
    })
  }

  // chrome & firefox
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

  // firefox only
  #getAppSourceWatcher (quasarConf, viteConfig, queue) {
    const watcher = chokidar.watch([
      this.ctx.appPaths.srcDir,
      this.ctx.appPaths.resolve.app(quasarConf.sourceFiles.indexHtmlTemplate)
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

  // firefox only
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
}
