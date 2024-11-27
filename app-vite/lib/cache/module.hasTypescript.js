import { existsSync } from 'node:fs'

import { getPackagePath } from '../utils/get-package-path.js'

export function createInstance ({ appPaths }) {
  const hasTypescript = (
    existsSync(appPaths.resolve.app('tsconfig.json'))
  )

  if (hasTypescript === true) {
    const typescriptPath = getPackagePath('typescript', appPaths.appDir)
    if (typescriptPath === void 0) {
      return false
    }
  }

  return hasTypescript
}
