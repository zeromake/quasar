// Hooks added here have a bridge allowing communication between the BEX Content Script and the Quasar Application.
// More info: https://quasar.dev/quasar-cli/developing-browser-extensions/content-hooks

import { bexContent } from 'quasar/wrappers'

export default bexContent(({ useBridge }) => {
  const bridge = useBridge({ name: 'my-content-script', debug: false })

  // Hook into the bridge to listen for events sent from the client BEX.
  /*
  bridge.on('some.event', message => {
    if (message.payload.yourProp) {
      // Access a DOM element from here.
      // Document in this instance is the underlying website the contentScript runs on
      const el = document.getElementById('some-id')
      if (el) {
        el.value = 'Quasar Rocks!'
      }
    }
  })
  */

  // More examples
  /*
  // send a message to background
  bridge.send({ event: 'test', to: 'background', payload: 'Hello from content-script!' })

  // send a message to app
  bridge.send({ event: 'test', to: 'app', payload: 'Hello from content-script!' })

  // send a message and wait for a response
  const { payload } = await bridge.send({
    event: 'test',
    to: 'background',
    reply: true, // required to get a response
    payload: 'Hello from content-script'
  })

  // send a message to all other content scripts
  bridge.send({ event: 'test', to: 'content-script', payload: 'Hello from content-script!' })

  // broadcast a message to app & content scripts
  bridge.send({ event: 'test', payload: 'Hello from background!' })

  // broadcast a message to all content scripts
  bridge.send({ event: 'test', to: 'content-script', payload: 'Hello from background!' })
  */
})
