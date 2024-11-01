import { join } from 'node:path'
import fse from 'fs-extra'
import archiver from 'archiver'

import { AppBuilder } from '../../app-builder.js'
import { progress } from '../../utils/logger.js'
import { quasarBexConfig } from './bex-config.js'
import { createManifest, copyBexAssets } from './bex-utils.js'

export class QuasarModeBuilder extends AppBuilder {
  async build () {
    const viteConfig = await quasarBexConfig.vite(this.quasarConf)
    await this.buildWithVite('BEX UI', viteConfig)

    const { err, bexBackgroundScript, bexContentScriptList, bexOtherScriptList } = createManifest(this.quasarConf)
    if (err !== void 0) process.exit(1)

    if (bexBackgroundScript !== null) {
      const bgConfig = await quasarBexConfig.backgroundScript(this.quasarConf, bexBackgroundScript)
      await this.buildWithEsbuild(`Background Script (${ bexBackgroundScript.name })`, bgConfig)
    }

    for (const entry of bexContentScriptList) {
      const contentConfig = await quasarBexConfig.contentScript(this.quasarConf, entry)
      await this.buildWithEsbuild(`Content Script (${ entry.name })`, contentConfig)
    }

    for (const entry of bexOtherScriptList) {
      const contentConfig = await quasarBexConfig.otherScript(this.quasarConf, entry)
      await this.buildWithEsbuild(`Other Script (${ entry.name })`, contentConfig)
    }

    copyBexAssets(this.quasarConf)

    this.printSummary(this.quasarConf.build.distDir)
    this.#bundlePackage(this.quasarConf.build.distDir)
  }

  #bundlePackage (dir) {
    const done = progress('Bundling in progress...')
    const zipName = `Packaged.${ this.ctx.pkg.appPkg.name }.zip`
    const file = join(dir, zipName)

    const output = fse.createWriteStream(file)
    const archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level.
    })

    archive.pipe(output)
    archive.directory(dir, false, entryData => ((entryData.name !== zipName) ? entryData : false))
    archive.finalize()

    done(`Bundle has been generated at: ${ file }`)
  }
}
