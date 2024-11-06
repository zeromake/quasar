import { join, sep } from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'
import compileTemplate from 'lodash/template.js'

import {
  createViteConfig, extendViteConfig,
  createBrowserEsbuildConfig, extendEsbuildConfig
} from '../../config-tools.js'

import { resolveToCliDir } from '../../utils/cli-runtime.js'

const jsExtRE = /\.js$/
const templateInterpolateRE = /<%=([\s\S]+?)%>/g

const scriptTemplates = {
  background: compileTemplate(
    readFileSync(
      resolveToCliDir('templates/entry/bex-background.js'),
      'utf-8'
    ),
    { interpolate: templateInterpolateRE }
  ),

  'content-script': compileTemplate(
    readFileSync(
      resolveToCliDir('templates/entry/bex-content-script.js'),
      'utf-8'
    ),
    { interpolate: templateInterpolateRE }
  )
}

function generateDefaultEntry (quasarConf) {
  return {
    name: 'file.js',
    from: quasarConf.ctx.appPaths.resolve.bex('file.js'),
    to: join(quasarConf.build.distDir, 'file.js')
  }
}

// returns a Promise
function createScript ({ quasarConf, type, entry }) {
  const filename = entry.name.replaceAll(sep, '_').replace(jsExtRE, '')
  const entryPath = quasarConf.ctx.appPaths.resolve.entry(`bex-entry-${ type }-${ filename }.js`)

  const content = scriptTemplates[ type ]({
    importName: entry.name.replaceAll('\\', '/').replace(jsExtRE, ''),
    isDev: quasarConf.ctx.dev,
    isChrome: quasarConf.ctx.target.chrome,
    devServerPort: quasarConf.devServer.port
  })

  writeFileSync(entryPath, content, 'utf-8')

  const cfg = createBrowserEsbuildConfig(quasarConf, { compileId: `bex:${ type }:${ entry.name }` })

  cfg.entryPoints = [ entryPath ]
  cfg.outfile = join(quasarConf.build.distDir, entry.name)

  return extendEsbuildConfig(cfg, quasarConf.bex, quasarConf.ctx, 'extendBexScriptsConf')
}

export const quasarBexConfig = {
  vite: async quasarConf => {
    const cfg = await createViteConfig(quasarConf, { compileId: 'vite-bex' })

    if (quasarConf.ctx.target.firefox) {
      cfg.build.outDir = join(quasarConf.build.distDir, 'www')
    }

    return extendViteConfig(cfg, quasarConf, { isClient: true })
  },

  backgroundScript: (quasarConf, entry = generateDefaultEntry(quasarConf)) => {
    return createScript({ quasarConf, type: 'background', entry })
  },

  contentScript: (quasarConf, entry = generateDefaultEntry(quasarConf)) => {
    return createScript({ quasarConf, type: 'content-script', entry })
  },

  otherScript: (quasarConf, entry = generateDefaultEntry(quasarConf)) => {
    const cfg = createBrowserEsbuildConfig(quasarConf, { compileId: `bex:other-script:${ entry.name }` })

    cfg.entryPoints = [ entry.from ]
    cfg.outfile = entry.to

    return extendEsbuildConfig(cfg, quasarConf.bex, quasarConf.ctx, 'extendBexScriptsConf')
  }
}

export const modeConfig = quasarBexConfig
