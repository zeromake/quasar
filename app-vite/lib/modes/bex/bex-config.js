import { join } from 'node:path'

import {
  createViteConfig, extendViteConfig,
  createBrowserEsbuildConfig, extendEsbuildConfig
} from '../../config-tools.js'

import { getBuildSystemDefine } from '../../utils/env.js'

function generateDefaultEntry (quasarConf) {
  return {
    rawName: 'file',
    name: 'file.js',
    from: quasarConf.ctx.appPaths.resolve.bex('file.js'),
    to: join(quasarConf.build.distDir, 'file.js')
  }
}

export const quasarBexConfig = {
  vite: async quasarConf => {
    const cfg = await createViteConfig(quasarConf, { compileId: 'vite-bex' })

    if (quasarConf.ctx.target.firefox) {
      cfg.build.outDir = join(quasarConf.build.distDir, 'www')
    }

    return extendViteConfig(cfg, quasarConf, { isClient: true })
  },

  bexScript (quasarConf, entry = generateDefaultEntry(quasarConf)) {
    const cfg = createBrowserEsbuildConfig(quasarConf, { compileId: `bex:script:${ entry.name }` })

    cfg.define = {
      ...cfg.define,
      ...getBuildSystemDefine({
        buildEnv: {
          __QUASAR_BEX_SCRIPT_NAME__: entry.rawName,
          __QUASAR_BEX_SERVER_PORT__: quasarConf.devServer.port || 0
        }
      })
    }

    cfg.entryPoints = [ entry.from ]
    cfg.outfile = entry.to

    return extendEsbuildConfig(cfg, quasarConf.bex, quasarConf.ctx, 'extendBexScriptsConf')
  }
}

export const modeConfig = quasarBexConfig
