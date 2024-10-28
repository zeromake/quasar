import { bexBackground } from 'quasar/wrappers'

chrome.browserAction.onClicked.addListener((/* tab */) => {
  // Opens our extension in a new browser window.
  // Only if a popup isn't defined in the manifest.
  chrome.tabs.create({
    url: chrome.extension.getURL('www/index.html')
  }, (/* newTab */) => {
    // Tab opened.
  })
})

export default bexBackground(({ useBridge }) => {
  const bridge = useBridge({ debug: false })

  bridge.on('log', ({ from, payload }) => {
    console.log(`[BEX] @log from "${ from }"`, payload)
  })

  bridge.on('getTime', () => {
    return Date.now()
  })

  bridge.on('storage.get', ({ payload }) => {
    let result

    if (payload === void 0) {
      chrome.storage.local.get(null, items => {
        // Group the values up into an array to take advantage of the bridge's chunk splitting.
        result = Object.values(items)
      })
    } else {
      chrome.storage.local.get([payload], items => {
        result = items[payload]
      })
    }

    return result
  })
  // Usage:
  // const { payload } = await bridge.send({
  //   event: 'storage.get',
  //   to: 'background',
  //   reply: true,
  //   payload: key
  // })

  bridge.on('storage.set', ({ payload }) => {
    chrome.storage.local.set({ [payload.key]: payload.value })
  })
  // Usage:
  // await bridge.send({
  //   event: 'storage.set',
  //   to: 'background',
  //   payload: { key: 'someKey', value: 'someValue' }
  // })

  bridge.on('storage.remove', ({ payload }) => {
    chrome.storage.local.remove(payload)
  })
  // Usage:
  // await bridge.send({
  //   event: 'storage.remove',
  //   to: 'background',
  //   payload: 'someKey'
  // })

  /*
  // EXAMPLES
  // Listen to a message from the client
  bridge.on('test', message => {
    console.log(message)
  })

  // Send a message to the client based on something happening.
  chrome.tabs.onCreated.addListener(tab => {
    bridge.send(...)
  })

  // Send a message to the client based on something happening.
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
      bridge.send(...)
    }
  })

  // send a message and wait for a response
  const { payload } = await bridge.send({
    event: 'test',
    to: 'app',
    reply: true, // required to get a response
    payload: 'Hello from content-script'
  })

  // broadcast a message to app & content scripts
  bridge.send({ event: 'test', payload: 'Hello from background!' })

  // broadcast a message to all content scripts
  bridge.send({ event: 'test', to: 'content-script', payload: 'Hello from background!' })
  */
})
