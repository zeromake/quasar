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
import runDevlandBackgroundScript from 'app/src-bex/<%= importName %>'

<% if (isDev === true && isChrome === true) { %>
  const devServerPort = <%= devServerPort %>

  interceptRequests()
  connectToDevServer()

  function interceptRequests () {
    /**
     * We intercept all fetch requests from the extension page and redirect them to the dev server
     * for HMR purposes.
     */

    const bexOrigin = `chrome-extension://${ chrome.runtime.id }`
    const hrefRE = /=$|=(?=&)/g

    async function getDevServerResponse (url) {
      // point it to the dev server
      url.protocol = 'http:'
      url.host = 'localhost'
      url.port = devServerPort

      // ensure we have a fresh version of the response
      url.searchParams.set('t', Date.now())

      const request = await fetch(
        url.href.replace(hrefRE, '')
      )

      return new Response(request.body, {
        headers: {
          'Content-Type': request.headers.get('Content-Type') || 'text/javascript',
          'Cache-Control': request.headers.get('Cache-Control') || ''
        }
      })
    }

    self.addEventListener('fetch', evt => {
      const url = new URL(evt.request.url)

      if (url.origin === bexOrigin) {
        evt.respondWith(
          getDevServerResponse(url)
        )
      }
    })
  }

  function connectToDevServer() {
    const pingUrl = `http://localhost:${ devServerPort }/__vite_ping`
    const socket = new WebSocket(`ws://localhost:${ devServerPort }`, 'vite-hmr')

    const contentScriptPortList = new Set()
    const contentScriptPortNameRE = /^quasar@hmr\/content-script\//

    function reloadExtension () {
      const len = contentScriptPortList.size
      const suffix = len !== 0
        ? ` along with ${ len } content script${ len > 1 ? 's' : '' }`
        : ''

      console.log(`[QBex|HMR] Reloading extension${ suffix }...`)

      for (const port of contentScriptPortList) {
        port.postMessage('qbex:hmr:reload-content')
      }

      chrome.runtime.reload()
    }

    // Listen for messages
    socket.addEventListener('message', ({ data }) => {
      const { type } = JSON.parse(data)

      if (type === 'connected') {
        console.log(`[QBex|HMR] Connected`)
        // send a ping every 30s to keep the connection alive
        const interval = setInterval(() => socket.send('ping'), 30000)
        socket.addEventListener('close', () => clearInterval(interval))
        return
      }

      if (type === 'qbex:hmr:reload') {
        reloadExtension()
      }
    })

    socket.addEventListener('close', async ({ wasClean }) => {
      if (wasClean) return
      console.log(`[QBex|HMR] Lost connection. Reconnecting...`)

      let tries = 1
      while (true) {
        try {
          if (tries > 2000) {
            console.log(`[QBex|HMR] Aborting re-connect after 2000 failed attempts. Please manually reload the extension.`)
            return
          }

          await fetch(pingUrl)
          break
        }
        catch (_) {
          console.log(`[QBex|HMR] Could not re-connect. Retrying...`)
          await new Promise((resolve) => setTimeout(resolve, 1000))
          tries++
        }
      }

      reloadExtension()
    })

    chrome.runtime.onConnect.addListener(port => {
      const { name } = port

      if (contentScriptPortNameRE.test(name) === true) {
        contentScriptPortList.add(port)

        port.onDisconnect.addListener(() => {
          contentScriptPortList.delete(port)
        })

        port.postMessage('qbex:hmr:hello')
      }
    })
  }
<% } %>

let bridge = null

function useBridge ({ debug } = {}) {
  if (bridge === null) {
    bridge = new BexBridge({
      type: 'background',
      debug
    })
  }

  return bridge
}

runDevlandBackgroundScript({ useBridge })
