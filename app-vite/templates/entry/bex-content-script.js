/* eslint-disable */
/**
 * THIS FILE IS GENERATED AUTOMATICALLY.
 * DO NOT EDIT.
 *
 * You are probably looking into adding hooks in your code. This should be done by means of
 * src-bex/js/content-hooks.js which has access to the browser instance and communication bridge
 **/

/* global chrome */

import Bridge from './bex-bridge.js'
import runDevlandContentScript from 'app/src-bex/__IMPORT_NAME__'

const port = chrome.runtime.connect({
  name: 'contentScript:__CONNECT_NAME__'
})

let disconnected = false
port.onDisconnect.addListener(() => {
  disconnected = true
})

let bridge = new Bridge({
  listen (fn) {
    port.onMessage.addListener(fn)
  },
  send (data) {
    if (!disconnected) {
      port.postMessage(data)
      window.postMessage({
        ...data,
        from: 'bex-content-script'
      }, '*')
    }
  }
})

runDevlandContentScript(bridge)
