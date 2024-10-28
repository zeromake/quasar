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
  // EXAMPLES
  // Listen to a message from the client
  bridge.on('test', message => {
    console.log(message)
  })

  // Send a message and split payload into chunks
  // (to avoid max size limit of BEX messages)
  bridge.send({
    event: 'test',
    to: 'app',
    payload: [ 'chunk1', 'chunk2', 'chunk3', ... ]
  })

  // Send a message and wait for a response
  const { payload } = await bridge.send({
    event: 'test',
    to: 'background',
    respond: true, // required to get a response
    payload: { banner: 'Hello from content-script' }
  })

  // Listen to a message from the client and only respond if requested so
  bridge.on('test', message => {
    console.log(message)
    if (message.respond === true) {
      return { banner: 'Hello from background!' }
    }
  })

  // Listen to a message from the client and only respond if requested so
  bridge.on('test', async message => {
    console.log(message)
    if (message.respond === true) {
      const result = await someAsyncFunction()
      return result
    }
  })

  // Broadcast a message to app & content scripts
  bridge.send({ event: 'test', payload: 'Hello from background!' })

  // Broadcast a message to all content scripts
  bridge.send({ event: 'test', to: 'content-script', payload: 'Hello from background!' })

  // Send a message to a certain content script
  bridge.send({ event: 'test', to: 'content-script@my-content-script-2345', payload: 'Hello from background!' })
  */
})
