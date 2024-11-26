---
title: Supporting TypeScript
desc: (@quasar/app-vite) How to enable support for TypeScript in a Quasar app.
related:
  - /quasar-cli-vite/quasar-config-file
---

If you didn't select TypeScript support when creating your project, you can still add it later. This guide will show you how to add TypeScript support to your existing JavaScript-based Quasar project.

::: tip
If you selected TypeScript support when creating your project, you can skip this guide.
:::

## Installation of TypeScript Support

Install the `typescript` package:

```tabs
<<| bash Yarn |>>
$ yarn add --dev typescript
<<| bash NPM |>>
$ npm install --save-dev typescript
<<| bash PNPM |>>
$ pnpm add -D typescript
<<| bash Bun |>>
$ bun add --dev typescript
```

Then, create `/tsconfig.json` file at the root of you project with this content:

```json /tsconfig.json
{
  "extends": "./.quasar/tsconfig.json"
}
```

Run `$ quasar prepare` in the root of your project folder.

Now you can start using TypeScript into your project. Note that some IDEs might require a restart for the new setup to fully kick in.

::: tip
Remember that you must change the extension of your JavaScript files to `.ts` to be allowed to write TypeScript code inside them. To use TypeScript in Vue files, you must update the script tag to include the `lang="ts"` attribute, like `<script lang="ts">` or `<script setup lang="ts">`
:::

::: warning
If you forget to add the `tsconfig.json` file, the application will break at compile time!
:::

### Linting setup

First add the needed dependencies:

```tabs
<<| bash Yarn |>>
$ yarn add --dev eslint vite-plugin-checker vue-tsc@2 @typescript-eslint/parser @typescript-eslint/eslint-plugin
# you might also want to install the `eslint-plugin-vue` package.
<<| bash NPM |>>
$ npm install --save-dev eslint vite-plugin-checker vue-tsc@2 @typescript-eslint/parser @typescript-eslint/eslint-plugin
# you might also want to install the `eslint-plugin-vue` package.
<<| bash PNPM |>>
$ pnpm add -D eslint vite-plugin-checker vue-tsc@2 @typescript-eslint/parser @typescript-eslint/eslint-plugin
# you might also want to install the `eslint-plugin-vue` package.
<<| bash Bun |>>
$ bun add --dev eslint vite-plugin-checker vue-tsc@2 @typescript-eslint/parser @typescript-eslint/eslint-plugin
# you might also want to install the `eslint-plugin-vue` package.
```

Then update your ESLint configuration accordingly, like in the following example:

```js /.eslintrc.cjs
module.exports = {
  // https://eslint.org/docs/user-guide/configuring#configuration-cascading-and-hierarchy
  // This option interrupts the configuration hierarchy at this file
  // Remove this if you have an higher level ESLint config file (it usually happens into a monorepos)
  root: true,

  // https://eslint.vuejs.org/user-guide/#how-to-use-a-custom-parser
  // Must use parserOptions instead of "parser" to allow vue-eslint-parser to keep working
  // `parser: 'vue-eslint-parser'` is already included with any 'plugin:vue/**' config and should be omitted
  parserOptions: {
    parser: require.resolve('@typescript-eslint/parser'),
    extraFileExtensions: [ '.vue' ]
  },

  env: {
    browser: true,
    es2021: true,
    node: true
  },

  // Rules order is important, please avoid shuffling them
  extends: [
    // Base ESLint recommended rules
    // 'eslint:recommended',

    // https://typescript-eslint.io/getting-started/legacy-eslint-setup
    // ESLint typescript rules
    'plugin:@typescript-eslint/recommended',

    // Uncomment any of the lines below to choose desired strictness,
    // but leave only one uncommented!
    // See https://eslint.vuejs.org/rules/#available-rules
    'plugin:vue/vue3-essential', // Priority A: Essential (Error Prevention)
    // 'plugin:vue/vue3-strongly-recommended', // Priority B: Strongly Recommended (Improving Readability)
    // 'plugin:vue/vue3-recommended', // Priority C: Recommended (Minimizing Arbitrary Choices and Cognitive Overhead)

    // https://github.com/prettier/eslint-config-prettier#installation
    // usage with Prettier, provided by 'eslint-config-prettier'.
    'prettier'
  ],

  plugins: [
    // required to apply rules which need type information
    '@typescript-eslint',

    // https://eslint.vuejs.org/user-guide/#why-doesn-t-it-work-on-vue-files
    // required to lint *.vue files
    'vue'

    // https://github.com/typescript-eslint/typescript-eslint/issues/389#issuecomment-509292674
    // Prettier has not been included as plugin to avoid performance impact
    // add it as an extension for your IDE

  ],

  globals: {
    ga: 'readonly', // Google Analytics
    cordova: 'readonly',
    __statics: 'readonly',
    __QUASAR_SSR__: 'readonly',
    __QUASAR_SSR_SERVER__: 'readonly',
    __QUASAR_SSR_CLIENT__: 'readonly',
    __QUASAR_SSR_PWA__: 'readonly',
    process: 'readonly',
    Capacitor: 'readonly',
    chrome: 'readonly'
  },

  // add your custom rules here
  rules: {

    'prefer-promise-reject-errors': 'off',

    quotes: ['warn', 'single', { avoidEscape: true }],

    // this rule, if on, would require explicit return type on the `render` function
    '@typescript-eslint/explicit-function-return-type': 'off',

    // in plain CommonJS modules, you can't use `import foo = require('foo')` to pass this rule, so it has to be disabled
    '@typescript-eslint/no-var-requires': 'off',

    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports' },
    ],

    // The core 'no-unused-vars' rules (in the eslint:recommended ruleset)
    // does not work with type definitions
    'no-unused-vars': 'off',

    // allow debugger during development only
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off'
  }
}
```

If anything goes wrong, read the [typescript-eslint guide](https://typescript-eslint.io/getting-started/legacy-eslint-setup), on which this example is based.

As a last step, update your `package.json > scripts > lint` script to also lint `.ts` files. Example:

```diff /package.json
{
  "scripts": {
-   "lint": "eslint --ext .js,.vue .",
+   "lint": "eslint --ext .js,.ts,.vue .",
  }
}
```

### TypeScript Declaration Files

If you chose TypeScript support when scaffolding the project, the following declaration file was automatically scaffolded for you. If TypeScript support wasn't enabled during project creation, create it:

```ts /src/env.d.ts
/* eslint-disable */

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string;
    VUE_ROUTER_MODE: 'hash' | 'history' | 'abstract' | undefined;
    VUE_ROUTER_BASE: string | undefined;
    // Define any custom env variables you have here, if you wish
  }
}
```

See the following sections for the features and build modes you are using.

#### Pinia

If you are using [Pinia](/quasar-cli-vite/state-management-with-pinia), add the section below to your project. Quasar CLI provides the `router` property, you may need to add more global properties if you have them.

```ts /src/stores/index.ts
import type { Router } from 'vue-router';

/*
 * When adding new properties to stores, you should also
 * extend the `PiniaCustomProperties` interface.
 * @see https://pinia.vuejs.org/core-concepts/plugins.html#typing-new-store-properties
 */
declare module 'pinia' {
  export interface PiniaCustomProperties {
    readonly router: Router;
  }
}
```

#### PWA mode

If you are using [PWA mode](/quasar-cli-vite/developing-pwa/introduction), make the following modifications to your project, and create any files that do not exist:

```ts /src-pwa/pwa-env.d.ts
/* eslint-disable */

declare namespace NodeJS {
  interface ProcessEnv {
    SERVICE_WORKER_FILE: string;
    PWA_FALLBACK_HTML: string;
    PWA_SERVICE_WORKER_REGEX: string;
  }
}
```

```ts /src-pwa/custom-service-worker.ts
// at the top of the file
declare const self: ServiceWorkerGlobalScope &
  typeof globalThis & { skipWaiting: () => void };
```

```json /src-pwa/tsconfig.json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "lib": ["WebWorker", "ESNext"]
  },
  "include": ["*.ts", "*.d.ts"]
}
```

```js /src-pwa/.eslintrc.cjs
const { resolve } = require('node:path');

module.exports = {
  parserOptions: {
    project: resolve(__dirname, './tsconfig.json'),
  },

  overrides: [
    {
      files: ['custom-service-worker.ts'],

      env: {
        serviceworker: true,
      },
    },
  ],
};
```

#### Electron mode

If you are using [Electron mode](/quasar-cli-vite/developing-electron-apps/introduction), add the section below to your project.

```ts /src-electron/electron-env.d.ts
/* eslint-disable */

declare namespace NodeJS {
  interface ProcessEnv {
    QUASAR_PUBLIC_FOLDER: string;
    QUASAR_ELECTRON_PRELOAD_FOLDER: string;
    QUASAR_ELECTRON_PRELOAD_EXTENSION: string;
    APP_URL: string;
  }
}
```

#### BEX mode

If you are using [BEX mode](/quasar-cli-vite/developing-browser-extensions/introduction), add the section below to your project. You may need to adjust it to your needs depending on the events you are using. The key is the event name, the value is a tuple where the first element is the input and the second is the output type.

```ts /src-bex/background.ts
declare module '@quasar/app-vite' {
  interface BexEventMap {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    log: [{ message: string; data?: any[] }, never];
    getTime: [never, number];

    'storage.get': [{ key: string | null }, any];
    'storage.set': [{ key: string; value: any }, any];
    'storage.remove': [{ key: string }, any];
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }
}
```

You'll also need this in every content script file:

```ts /src-bex/my-content-script.ts
declare module '@quasar/app-vite' {
  interface BexEventMap {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    'some.event': [{ someProp: string }, void];
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }
}
```
