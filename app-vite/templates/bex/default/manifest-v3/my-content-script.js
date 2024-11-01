// Hooks added here have a bridge allowing communication between the BEX Content Script and the Quasar Application.
// More info: https://quasar.dev/quasar-cli/developing-browser-extensions/content-hooks

import { bexContent } from 'quasar/wrappers'

export default bexContent(({ useBridge }) => {
  const bridge = useBridge({ name: 'my-content-script', debug: false })

  // Hook into the bridge to listen for events sent from the client BEX.
  bridge.on('some.event', message => {
    if (message.payload.yourProp) {
      // Access a DOM element from here.
      // Document in this instance is the underlying website the contentScript runs on
      const el = document.getElementById('some-id')
      if (el) {
        el.innerText = 'Quasar Rocks!'
      }
    }
  })

  /*
  // More examples:

  // Listen to a message from the client
  bridge.on('test', message => {
    console.log(message)
  })

  // Send a message and split payload into chunks
  // to avoid max size limit of BEX messages.
  // Warning! This happens automatically when the payload is an array.
  // If you actually want to send an Array, wrap it in an object.
  bridge.send({
    event: 'test',
    to: 'app',
    payload: [ 'chunk1', 'chunk2', 'chunk3', ... ]
  }).then(responsePayload => { ... }).catch(err => { ... })

  // Send a message and wait for a response
  bridge.send({
    event: 'test',
    to: 'background',
    payload: { banner: 'Hello from content-script' }
  }).then(responsePayload => { ... }).catch(err => { ... })

  // Listen to a message from the client and respond synchronously
  bridge.on('test', message => {
    console.log(message)
    return { banner: 'Hello from a content-script!' }
  })

  // Listen to a message from the client and respond asynchronously
  bridge.on('test', async message => {
    console.log(message)
    const result = await someAsyncFunction()
    return result
  })
  bridge.on('test', message => {
    console.log(message)
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ banner: 'Hello from a content-script!' })
      }, 1000)
    })
  })

  // Broadcast a message to background, app & the other content scripts
  bridge.portList.forEach(portName => {
    bridge.send({ event: 'test', to: portName, payload: 'Hello from content-script!' })
  })

  // Find any connected content script and send a message to it
  const contentPort = bridge.portList.find(portName => portName.startsWith('content@'))
  if (contentPort) {
    bridge.send({ event: 'test', to: contentPort, payload: 'Hello from a content-script!' })
  }

  // Send a message to a certain content script
  bridge
    .send({ event: 'test', to: 'content@my-content-script-2345', payload: 'Hello from a content-script!' })
    .then(responsePayload => { ... })
    .catch(err => { ... })

  // Listen for connection events
  // (the "@quasar:ports" is an internal event name registered automatically by the bridge)
  // --> ({ portList: string[], added?: string } | { portList: string[], removed?: string })
  bridge.on('@quasar:ports', ({ portList, added, removed }) => {
    console.log('Ports:', portList)
    if (added) {
      console.log('New connection:', added)
    } else if (removed) {
      console.log('Connection removed:', removed)
    }
  })

  // Send a message to the client based on something happening.
  chrome.tabs.onCreated.addListener(tab => {
    bridge.send(...).then(responsePayload => { ... }).catch(err => { ... })
  })

  // Send a message to the client based on something happening.
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
      bridge.send(...).then(responsePayload => { ... }).catch(err => { ... })
    }
  })

  // Current bridge port name (can be 'content@<name>-<xxxxx>')
  console.log(bridge.name)

  // Log a message on the console (if debug is enabled)
  bridge.log('Hello world!')
  bridge.log('Hello world!', { some: 'data' })
  // Log a warning on the console (regardless of the debug setting)
  bridge.warn('Hello world!')
  bridge.warn('Hello world!', { some: 'data' })
  */
})
