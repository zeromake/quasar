---
title: Linter
desc: (@quasar/app-vite) How to configure a code linter in a Quasar app.
---

Having a code linter (like [ESLint](https://eslint.org/)) in place is highly recommended and ensures your code looks legible. It also helps you capture some errors before even running the code.

When you scaffold a Quasar project folder it will ask you if you want a linter and which setup you want for ESLint:

* [Prettier](https://github.com/prettier/prettier)
* [Standard](https://github.com/standard/standard)
* [Airbnb](https://github.com/airbnb/javascript)
* .. or you can configure one yourself

Two dot files will be created:

* .eslintrc.cjs -- ESLint configuration, including rules
* .eslintignore -- what ESLint should ignore when linting

Further extension of one of the ESLint setups above can be made. Your project will by default use `eslint-plugin-vue` to handle your Vue files. Take a quick look at `/.eslintrc.cjs` and notice it:

```js /.eslintrc.cjs
extends: [
  // https://eslint.vuejs.org/rules/#priority-a-essential-error-prevention-for-vue-js-3-x
  // consider switching to `plugin:vue/strongly-recommended` or `plugin:vue/recommended` for stricter rules.
  'plugin:vue/strongly-recommended'
]
```

Also note that you need the following file:

```bash /.eslintignore
/dist
/src-capacitor
/src-cordova
/.quasar
/node_modules
.eslintrc.cjs
/quasar.config.*.temporary.compiled*
```

## Lint Rules
The linting rules can be removed, changed, or added. Notice some things:

* Some rules are for the Standard, Airbnb or Prettier standards (whichever you chose when project was created). Example: 'brace-style'.
* Some rules are for eslint-plugin-vue. Example: 'vue/max-attributes-per-line'.

You can add/remove/change rules by first visiting [https://eslint.org/docs/rules/](https://eslint.org/docs/rules/) or [https://eslint.vuejs.org/rules](https://eslint.vuejs.org/rules).

Example of ESLint rules below:

```js /.eslintrc.cjs
'rules': {
  'brace-style': [2, 'stroustrup', { 'allowSingleLine': true }],

  'vue/max-attributes-per-line': 0,
  'vue/valid-v-for': 0,

  // allow async-await
  'generator-star-spacing': 'off',

  // allow paren-less arrow functions
  'arrow-parens': 0,
  'one-var': 0,

  'import/first': 0,
  'import/named': 2,
  'import/namespace': 2,
  'import/default': 2,
  'import/export': 2,
  'import/extensions': 0,
  'import/no-unresolved': 0,
  'import/no-extraneous-dependencies': 0,

  // allow debugger during development
  'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0
}
```

## TypeScript projects linting

```tabs
<<| bash Yarn |>>
$ yarn add --dev vite-plugin-checker vue-tsc@2 typescript
<<| bash NPM |>>
$ npm install --save-dev vite-plugin-checker vue-tsc@2 typescript
<<| bash PNPM |>>
$ pnpm add -D vite-plugin-checker vue-tsc@2 typescript
<<| bash Bun |>>
$ bun add --dev vite-plugin-checker vue-tsc@2 typescript
```

```js [highlight=3-8] /quasar.config file
build: {
  vitePlugins: [
    ['vite-plugin-checker', {
      vueTsc: true,
      eslint: {
        lintCommand: 'eslint "./**/*.{js,ts,mjs,cjs,vue}"'
      }
    }, { server: false }]
  ]
}
```

## JavaScript projects linting

```tabs
<<| bash Yarn |>>
$ yarn add --dev vite-plugin-checker
<<| bash NPM |>>
$ npm install --save-dev vite-plugin-checker
<<| bash PNPM |>>
$ pnpm add -D vite-plugin-checker
<<| bash Bun |>>
$ bun add --dev vite-plugin-checker
```

```diff [highlight=3-7] /quasar.config file
build: {
  vitePlugins: [
    ['vite-plugin-checker', {
      eslint: {
        lintCommand: 'eslint "./**/*.{js,mjs,cjs,vue}"'
      }
    }, { server: false }]
  ]
}
```
