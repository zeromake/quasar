/* eslint-disable */
/**
 * THIS FILE IS GENERATED AUTOMATICALLY.
 * DO NOT EDIT.
 *
 * You are probably looking into adding hooks in your code. This should be done by means of
 * src-bex/js/content-hooks.js which has access to the browser instance and communication bridge
 **/

/* global chrome */

import { BexBridge } from './bex-bridge.js'
import runDevlandContentScript from 'app/src-bex/__IMPORT_NAME__'

let bridge = null

function useBridge ({ name, debug }) {
  if (bridge === null) {
    bridge = new BexBridge({
      type: 'content-script',
      name,
      debug
    })
  }

  return bridge
}

runDevlandContentScript({ useBridge })
