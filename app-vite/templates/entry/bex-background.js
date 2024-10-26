/* eslint-disable */
/**
 * THIS FILE IS GENERATED AUTOMATICALLY.
 * DO NOT EDIT.
 *
 * You are probably looking into adding hooks in your code. This should be done by means of
 * src-bex/js/background-hooks.js which have access to the browser instance and communication bridge
 * and all the active client connections.
 **/

/* global chrome */

import { BexBridge } from './bex-bridge.js'
import runDevlandBackgroundScript from 'app/src-bex/__IMPORT_NAME__'

let bridge = null

function useBridge ({ debug }) {
  if (bridge === null) {
    bridge = new BexBridge({
      type: 'background',
      debug
    })
  }

  return bridge
}

runDevlandBackgroundScript({ useBridge })
