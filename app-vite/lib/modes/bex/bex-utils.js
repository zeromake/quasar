import fse from 'fs-extra'
import { join, relative } from 'node:path'
import { merge } from 'webpack-merge'

import { warn } from '../../utils/logger.js'
import { resolveExtension } from '../../utils/resolve-extension.js'

export function createManifest (quasarConf) {
  let json
  const bexManifestPath = quasarConf.metaConf.bexManifestFile

  try {
    json = JSON.parse(
      fse.readFileSync(bexManifestPath, 'utf-8')
    )
  }
  catch (err) {
    warn('Could not read BEX manifest. Please check its syntax.')
    return { err }
  }

  json = merge({}, json.all || {}, json[ quasarConf.ctx.targetName ] || {})

  if (json.manifest_version === void 0) {
    warn('The BEX manifest requires a "manifest_version" prop, which is currently missing.')
    return { err: true }
  }

  const {
    appPkg: { productName, name, description, version }
  } = quasarConf.ctx.pkg

  if (json.name === void 0) { json.name = productName || name }
  if (json.short_name === void 0) { json.short_name = json.name }
  if (json.description === void 0) { json.description = description }
  if (json.version === void 0) { json.version = version }

  if (json.manifest_version === 2) {
    json.browser_action = json.browser_action || {}

    if (json.browser_action.default_title === void 0) {
      json.browser_action.default_title = json.name
    }
  }
  else if (json.manifest_version === 3) {
    json.action = json.action || {}
    if (json.action.default_title === void 0) {
      json.action.default_title = json.name
    }
  }
  else {
    warn()
    warn(`The bex manifest version specified (${ json.manifest_version }) is NOT yet officially supported by Quasar CLI. Things might go wrong.`)
    warn()
  }

  if (typeof quasarConf.bex.extendBexManifestJson === 'function') {
    quasarConf.bex.extendBexManifestJson(json)
  }

  fse.ensureDirSync(quasarConf.build.distDir)
  fse.writeFileSync(
    join(quasarConf.build.distDir, 'manifest.json'),
    JSON.stringify(json, null, quasarConf.build.minify === true ? void 0 : 2),
    'utf-8'
  )

  return {
    scriptList: extractBexScripts(quasarConf, json)
  }
}

const scriptRawNameRE = /\.[jt]sx?$/i

function getScriptRawName (item) {
  return item.replace(scriptRawNameRE, '')
}

function getScriptSetEntry (quasarConf, filePath) {
  const entry = relative(quasarConf.ctx.appPaths.bexDir, filePath)
  const extension = entry.substring(entry.lastIndexOf('.') + 1)
  const scriptName = entry.substring(0, entry.length - extension.length - 1)

  return {
    name: scriptName.replaceAll('\\', '/'),
    from: filePath,
    to: join(quasarConf.build.distDir, `${ scriptName }.js`)
  }
}

function extractBexScripts (quasarConf, bexManifest) {
  const scriptList = []
  const nameSet = new Set()

  if (bexManifest.background?.service_worker) {
    const rawName = getScriptRawName(bexManifest.background.service_worker)
    const filePath = resolveExtension(quasarConf.ctx.appPaths.resolve.bex(rawName))

    if (filePath === void 0) {
      warn()
      warn(`The file defined in bex manifest > background > service_worker > "${ rawName }" does NOT exists. Skipping.`)
      warn()
    }
    else {
      const entry = getScriptSetEntry(quasarConf, filePath)
      if (nameSet.has(entry.name) === false) {
        nameSet.add(entry.name)
        scriptList.push(entry)
      }
    }
  }

  bexManifest.background?.scripts?.forEach(entry => {
    entry.js?.forEach(item => {
      const rawName = getScriptRawName(item)
      const filePath = resolveExtension(quasarConf.ctx.appPaths.resolve.bex(rawName))

      if (filePath === void 0) {
        warn()
        warn(`The file defined in bex manifest > background > scripts > "${ rawName }" does NOT exists. Skipping.`)
        warn()
        return
      }

      const entry = getScriptSetEntry(quasarConf, filePath)
      if (nameSet.has(entry.name) === false) {
        nameSet.add(entry.name)
        scriptList.push(entry)
      }
    })
  })

  bexManifest.content_scripts?.forEach(contentScript => {
    contentScript.js?.forEach(item => {
      const rawName = getScriptRawName(item)
      const filePath = resolveExtension(quasarConf.ctx.appPaths.resolve.bex(rawName))

      if (filePath === void 0) {
        warn()
        warn(`The file defined in bex manifest > content_scripts > js > "${ rawName }" does NOT exists. Skipping.`)
        warn()
        return
      }

      const entry = getScriptSetEntry(quasarConf, filePath)
      if (nameSet.has(entry.name) === false) {
        nameSet.add(entry.name)
        scriptList.push(entry)
      }
    })
  })

  quasarConf.bex.extraScripts.forEach(item => {
    const rawName = getScriptRawName(item)
    const filePath = resolveExtension(quasarConf.ctx.appPaths.resolve.bex(rawName))
    if (filePath === void 0) {
      warn()
      warn(`The file defined in quasar.config > bex > extraScripts > "${ rawName }" does NOT exists. Skipping.`)
      warn()
      return
    }

    const entry = getScriptSetEntry(quasarConf, filePath)
    if (nameSet.has(entry.name) === false) {
      nameSet.add(entry.name)
      scriptList.push(entry)
    }
  })

  return scriptList
}

export function copyBexAssets (quasarConf) {
  const { appPaths, cacheProxy } = quasarConf.ctx

  const { assetsFolder, iconsFolder, localesFolder } = cacheProxy.getRuntime('runtimeBexUtils', () => ({
    assetsFolder: appPaths.resolve.bex('assets'),
    iconsFolder: appPaths.resolve.bex('icons'),
    localesFolder: appPaths.resolve.bex('_locales')
  }))

  const folders = [ assetsFolder, iconsFolder ]

  fse.copySync(assetsFolder, join(quasarConf.build.distDir, 'assets'))
  fse.copySync(iconsFolder, join(quasarConf.build.distDir, 'icons'))

  if (fse.existsSync(localesFolder) === true) {
    folders.push(localesFolder)
    fse.copySync(localesFolder, join(quasarConf.build.distDir, '_locales'))
  }

  return folders
}
