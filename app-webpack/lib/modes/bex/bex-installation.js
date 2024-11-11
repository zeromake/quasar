const fs = require('node:fs')
const fse = require('fs-extra')

const { log, warn } = require('../../utils/logger.js')
const { generateTypesFeatureFlag } = require('../../utils/types-feature-flags.js')

function isModeInstalled (appPaths) {
  return fs.existsSync(appPaths.bexDir)
}
module.exports.isModeInstalled = isModeInstalled

module.exports.addMode = async function addMode ({
  ctx: { appPaths, cacheProxy },
  silent
}) {
  if (isModeInstalled(appPaths)) {
    if (silent !== true) {
      warn('Browser Extension support detected already. Aborting.')
    }
    return
  }

  console.log()
  log('Creating Browser Extension source folder...')

  fse.copySync(appPaths.resolve.cli('templates/bex/common'), appPaths.bexDir)
  generateTypesFeatureFlag('bex', appPaths)

  const hasTypescript = cacheProxy.getModule('hasTypescript')
  const format = hasTypescript ? 'ts' : 'default'
  fse.copySync(appPaths.resolve.cli(`templates/bex/${ format }`), appPaths.bexDir)

  log('Browser Extension support was added')
}

module.exports.removeMode = function removeMode ({
  ctx: { appPaths }
}) {
  if (!isModeInstalled(appPaths)) {
    warn('No Browser Extension support detected. Aborting.')
    return
  }

  log('Removing Browser Extension source folder')
  fse.removeSync(appPaths.bexDir)

  log('Browser Extension support was removed')
}
