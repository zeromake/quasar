---
title: Convert project to Quasar CLI with Vite
desc: (@quasar/app-vite) How to convert a Quasar CLI with Webpack project to a Quasar CLI with Vite one.
---

This page will guide you on how to convert a Quasar CLI with Webpack (`@quasar/app-webpack v4`) project into a Quasar CLI with Vite one (`@quasar/app-vite v2`).

### Step 1: Edit package.json

A Quasar CLI with Webpack project relies on `/package.json > browserslist` to specify which browsers you are targeting. That property no longer has any meaning. Projects managed by Quasar CLI with Vite work completely different and you might want to check the [Browser Compatibility](/quasar-cli-vite/browser-compatibility) page.

```diff /package.json
+ "type": "module", // very important!

dependencies: {
- core-js
},

devDependencies: {
- "@quasar/app-webpack": "^4.0.0"
+ "@quasar/app-vite": "^2.0.0"

- eslint-webpack-plugin
- ts-loader
- workbox-webpack-plugin
}

- browserslist: {}
```

Remember to yarn/npm/pnpm/bun install.

### Step 2: Various files

* Delete `/babel.config.cjs`. It will serve no purpose now.
* Edit `/.eslintignore` and remove the entry for `babel.config.cjs`
* Rename `/postcss.config.cjs` to `/postcss.config.js` and port it to the ESM format:

  ```js /postcss.config.js
  /* eslint-disable */
  // https://github.com/michael-ciniawsky/postcss-load-config

  import autoprefixer from 'autoprefixer'
  // import rtlcss from 'postcss-rtlcss'

  export default {
    plugins: [
      // https://github.com/postcss/autoprefixer
      autoprefixer({
        overrideBrowserslist: [
          'last 4 Chrome versions',
          'last 4 Firefox versions',
          'last 4 Edge versions',
          'last 4 Safari versions',
          'last 4 Android versions',
          'last 4 ChromeAndroid versions',
          'last 4 FirefoxAndroid versions',
          'last 4 iOS versions'
        ]
      }),

      // https://github.com/elchininet/postcss-rtlcss
      // If you want to support RTL css, then
      // 1. yarn/pnpm/bun/npm install postcss-rtlcss
      // 2. optionally set quasar.config.js > framework > lang to an RTL language
      // 3. uncomment the following line (and its import statement above):
      // rtlcss()
    ]
  }
  ```

### Step 3: Copy folders from original folder

From your original project folder, copy these as they are:
  * /src
  * /src-cordova
  * /src-capacitor
  * /src-electron
  * /src-pwa
  * /src-ssr (with small caveat; see next steps)
  * /src-bex (with small caveat; see next steps)

### Step 4: Explicitly specify extensions on all your import statements

Make sure that all your Vue component files (SFC) are imported with their `.vue` extension explicitly specified. Omitting the file extension works with Webpack (due to Quasar CLI configured list of extensions for it to try), but not with Vite too.

```js
// BAD! Will not work:
import MyComponent from './MyComponent'

// GOOD:
import MyComponent from './MyComponent.vue'
```

### Step 5: Check the new quasar.config file

The following props are detailed in the [quasar.config file](/quasar-cli-vite/quasar-config-file) page.

```diff
- eslint: {
-   // fix: true,
-   // include: [],
-   // exclude: [],
-   // cache: false,
-   // rawEsbuildEslintOptions: {},
-   // rawWebpackEslintPluginOptions: {},
-   warnings: true,
-   errors: true
- },

build: {
- esbuildTarget: {
+ target: {
    browser: [ 'es2022', 'firefox115', 'chrome115', 'safari14' ],
    node: 'node20'
  },

- webpackTranspile
- webpackTranspileDependencies
- webpackDevtool

- htmlFilename
- rtl
- showProgress
- gzip
- vueCompiler

- extendWebpack () {}
- chainWebpack () {}
+ extendViteConf (viteConf, { isServer, isClient }) {}

+ viteVuePluginOptions
+ vitePlugins

+ useFilenameHashes
+ polyfillModulePreload

- uglifyOptions
- scssLoaderOptions
- sassLoaderOptions
- stylusLoaderOptions
- lessLoaderOptions
- vueLoaderOptions
- tsLoaderOptions
},

devServer: {
- server: {
-  type: 'http'
- }
},

sourceFiles: {
- indexHtmlTemplate: 'index.html'
}
```

### Step 6: SSR related

```diff /src-ssr/server.js
export const renderPreloadTag = defineSsrRenderPreloadTag((file/* , { ssrContext } */) => {
  if (jsRE.test(file) === true) {
-   return `<script src="${file}" defer crossorigin></script>`;
+   return `<link rel="modulepreload" href="${file}" crossorigin>`;
  }
```

### Step 7: BEX related

```diff /src-bex/background.js
- declare module '@quasar/app-webpack' {
+ declare module '@quasar/app-vite' {
  interface BexEventMap {
    // ...
  }
}
```

```diff /src-bex/my-content-script.js
// for ALL content script files:

- declare module '@quasar/app-webpack' {
+ declare module '@quasar/app-vite' {
  interface BexEventMap {
    // ...
  }
}
```

### Step 8: And we're done

```bash
$ quasar prepare
$ quasar dev
$ quasar build
```
