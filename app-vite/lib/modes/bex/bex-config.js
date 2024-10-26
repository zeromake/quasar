import { join, sep } from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'

import {
  createViteConfig, extendViteConfig,
  createBrowserEsbuildConfig, extendEsbuildConfig
} from '../../config-tools.js'

import { resolveToCliDir } from '../../utils/cli-runtime.js'

const jsExtRE = /\.js$/
const scriptTemplates = {
  background: readFileSync(
    resolveToCliDir('templates/entry/bex-background.js'),
    'utf-8'
  ),

  'content-script': readFileSync(
    resolveToCliDir('templates/entry/bex-content-script.js'),
    'utf-8'
  )
}

// returns a Promise
function createScript ({ quasarConf, type, entry }) {
  const filename = entry.name.replaceAll(sep, '_').replace(jsExtRE, '')
  const entryPath = quasarConf.ctx.appPaths.resolve.entry(`bex-entry-${ type }-${ filename }.js`)

  const content = scriptTemplates[ type ]
    .replace('__IMPORT_NAME__', entry.name.replaceAll('\\', '/').replace(jsExtRE, ''))

  writeFileSync(entryPath, content, 'utf-8')

  const cfg = createBrowserEsbuildConfig(quasarConf, { compileId: `bex:${ type }:${ entry.name }` })

  cfg.entryPoints = [ entryPath ]
  cfg.outfile = join(quasarConf.build.distDir, entry.name)

  return extendEsbuildConfig(cfg, quasarConf.bex, quasarConf.ctx, 'extendBexScriptsConf')
}

export const quasarBexConfig = {
  vite: async quasarConf => {
    const cfg = await createViteConfig(quasarConf, { compileId: 'vite-bex' })

    cfg.build.outDir = join(quasarConf.build.distDir, 'www')

    return extendViteConfig(cfg, quasarConf, { isClient: true })
  },

  backgroundScript: (quasarConf, entry) => createScript({ quasarConf, type: 'background', entry }),
  contentScript: (quasarConf, entry) => createScript({ quasarConf, type: 'content-script', entry })
}

export const modeConfig = quasarBexConfig
