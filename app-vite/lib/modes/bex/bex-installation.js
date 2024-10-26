import fs from 'node:fs'
import fse from 'fs-extra'
import inquirer from 'inquirer'

import { log, warn } from '../../utils/logger.js'
import { generateTypesFeatureFlag } from '../../utils/types-feature-flags.js'

export function isModeInstalled (appPaths) {
  return fs.existsSync(appPaths.bexDir)
}

export async function addMode ({
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
  const answer = await inquirer.prompt([ {
    name: 'manifestVersion',
    type: 'list',
    choices: [
      { name: 'Manifest v2 (works with both Chrome and FF)', value: 'manifest-v2' },
      { name: 'Manifest v3 (works with Chrome only currently)', value: 'manifest-v3' }
    ],
    message: 'What version of manifest would you like?'
  } ])

  log('Creating Browser Extension source folder...')

  fse.copySync(appPaths.resolve.cli('templates/bex/common'), appPaths.bexDir)
  generateTypesFeatureFlag('bex', appPaths)

  const hasTypescript = await cacheProxy.getModule('hasTypescript')
  const format = hasTypescript ? 'ts' : 'default'
  fse.copySync(appPaths.resolve.cli(`templates/bex/${ format }/${ answer.manifestVersion }`), appPaths.bexDir)

  log('Browser Extension support was added')
}

export async function removeMode ({
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
