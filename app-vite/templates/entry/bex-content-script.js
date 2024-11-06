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
import runDevlandContentScript from 'app/src-bex/<%= importName %>'

<% if (isDev === true && isChrome === true) { %>
  const { runtime } = process.env.TARGET === 'firefox' ? browser : chrome
  const portName = 'quasar@hmr/content-script/<%= importName %>'
  const banner = '[QBex|HMR] [<%= importName %>]'

  let isReloading = false

  function onMessage (message) {
    if (message === 'qbex:hmr:hello') {
      console.log(`${ banner } Connected to background`)
      return
    }

    if (message === 'qbex:hmr:reload-content') {
      console.log(`${ banner } Reload requested by background...`)
      isReloading = true

      // reload the page with a small delay,
      // to allow the extension to be also reloaded
      setTimeout(() => {
        location.reload()
      }, 100)
    }
  }

  function connect () {
    const port = runtime.connect({ name: portName })

    port.onMessage.addListener(onMessage)
    port.onDisconnect.addListener(() => {
      if (isReloading === true) return
      port.onMessage.removeListener(onMessage)

      console.log(
        runtime.lastError?.message?.indexOf('Could not establish connection') !== -1
          ? `${ banner } Could not connect to background`
          : `${ banner } Lost connection to background`
      )

      setTimeout(connect, 1000)
    })
  }

  connect()
<% } %>

let bridge = null

function useBridge ({ debug } = {}) {
  if (bridge === null) {
    bridge = new BexBridge({
      type: 'content',
      name: '<%= importName %>',
      debug
    })
  }

  return bridge
}

runDevlandContentScript({ useBridge })
