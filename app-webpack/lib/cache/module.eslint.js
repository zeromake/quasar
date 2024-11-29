const { existsSync } = require('node:fs')

const { getPackage } = require('../utils/get-package.js')

module.exports.createInstance = function createInstance ({ appPaths }) {
  const eslintConfigFile = [
    'eslint.config.js',
    '.eslintrc.cjs',
    '.eslintrc.js',
    '.eslintrc.yaml',
    '.eslintrc.yml',
    '.eslintrc.json'
  ].find(path => existsSync(appPaths.resolve.app(path)))

  const acc = {
    eslintConfigFile,
    hasEslint: eslintConfigFile !== void 0
  }

  if (acc.hasEslint === true) {
    acc.configType = eslintConfigFile === 'eslint.config.js' ? 'flat' : 'eslintrc'

    const linter = getPackage('eslint', appPaths.appDir)

    if (linter !== void 0 && linter.ESLint !== void 0) {
      acc.ESLint = linter.ESLint
    }

    const webpackPlugin = getPackage('eslint-webpack-plugin', appPaths.appDir)

    if (webpackPlugin !== void 0) {
      acc.EslintWebpackPlugin = webpackPlugin
    }
  }

  return acc
}
