import fse from 'fs-extra'
import { join, relative } from 'node:path'

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
    return { err, bexManifestPath }
  }

  if (json.manifest_version === void 0) {
    warn('The BEX manifest requires a "manifest_version" prop, which is currently missing.')
    return { err: true, bexManifestPath }
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
    bexManifestPath,
    ...extractBexScripts(quasarConf, json)
  }
}

function extractBexScripts (quasarConf, bexManifest) {
  const bgName = (
    bexManifest.background?.service_worker // Manifest v3
    || bexManifest.background?.scripts?.[ 0 ] // Manifest v2
  )

  const bexBackgroundScript = bgName
    ? {
        name: bgName,
        from: quasarConf.ctx.appPaths.resolve.bex(bgName),
        to: join(quasarConf.build.distDir, bgName)
      }
    : null

  const bexContentScriptList = []
  const rawContentScriptSet = new Set()

  if (bexManifest.content_scripts) {
    bexManifest.content_scripts.forEach(entry => {
      if (entry.js?.length > 0) {
        entry.js.forEach(script => {
          if (rawContentScriptSet.has(script) === true) return

          rawContentScriptSet.add(script)
          bexContentScriptList.push({
            name: script,
            from: quasarConf.ctx.appPaths.resolve.bex(script),
            to: join(quasarConf.build.distDir, script)
          })
        })
      }
    })
  }

  if (quasarConf.bex.dynamicScripts.length !== 0) {
    quasarConf.bex.dynamicScripts.forEach(rawEntry => {
      const filePath = resolveExtension(quasarConf.ctx.appPaths.resolve.bex(rawEntry))
      if (filePath === void 0) {
        warn()
        warn(`The file for BEX script "${ rawEntry }" does NOT exists. Skipping.`)
        warn()
        console.log(rawEntry, '||||', quasarConf.ctx.appPaths.resolve.bex(rawEntry))
        return
      }

      const entry = relative(quasarConf.ctx.appPaths.bexDir, filePath)
      const extension = entry.substring(entry.lastIndexOf('.') + 1)
      const scriptName = entry.substring(0, entry.length - extension.length - 1)
      const jsScriptName = `${ scriptName }.js`

      if (rawContentScriptSet.has(jsScriptName) === true) {
        warn()
        warn(`BEX script "${ scriptName }" is defined both in quasar config > bex > dynamicScripts and in the BEX manifest > content_scripts.`)
        warn()
        return
      }

      rawContentScriptSet.add(jsScriptName)
      bexContentScriptList.push({
        name: jsScriptName,
        from: filePath,
        to: join(quasarConf.build.distDir, jsScriptName)
      })
    })
  }

  return {
    bexBackgroundScript,
    bexContentScriptList
  }
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
