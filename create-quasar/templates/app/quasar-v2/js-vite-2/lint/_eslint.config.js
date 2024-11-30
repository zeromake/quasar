import js from '@eslint/js'
import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'
<% if (lintConfig === 'standard') { %>
import standard from 'eslint-config-standard'
import importPlugin from 'eslint-plugin-import'
import nodePlugin from 'eslint-plugin-n'
import pluginPromise from 'eslint-plugin-promise'
<% } else if (lintConfig === 'prettier') { %>
import eslintConfigPrettier from 'eslint-config-prettier'<% } %>

export default [
  {
    ignores: [
      'node_modules/*',
      'dist/*',
      'src-capacitor/*',
      'src-cordova/*',
      '.quasar/*',
      'eslint.config.js',
      'quasar.config.*.temporary.compiled*'
    ]
  },

  js.configs.recommended,
  ...pluginVue.configs[ 'flat/essential' ],
  <% if (lintConfig === 'standard') { %>
  standard,
  importPlugin.flatConfigs.recommended,
  nodePlugin.configs["flat/recommended-script"],
  pluginPromise.configs['flat/recommended'],
  <% } else if (lintConfig === 'prettier') { %>
  eslintConfigPrettier,
  <% } %>

  {
    languageOptions: {
      sourceType: 'module',

      globals: {
        ...globals.browser,
        ga: 'readonly', // Google Analytics
        process: 'readonly',
        cordova: 'readonly',
        Capacitor: 'readonly',
        chrome: 'readonly', // BEX related
        browser: 'readonly' // BEX related
      }
    },

    // add your custom rules here
    rules: {
      <% if (lintConfig === 'standard') { %>
      // allow async-await
      'generator-star-spacing': 'off',
      // allow paren-less arrow functions
      'arrow-parens': 'off',
      'one-var': 'off',
      'no-void': 'off',
      'multiline-ternary': 'off',

      'import/first': 'off',
      'import/named': 'error',
      'import/namespace': 'error',
      'import/default': 'error',
      'import/export': 'error',
      'import/extensions': 'off',
      'import/no-unresolved': 'off',
      'import/no-extraneous-dependencies': 'off',
      <% } %>'prefer-promise-reject-errors': 'off',

      // allow debugger during development only
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off'
    }
  }
]
