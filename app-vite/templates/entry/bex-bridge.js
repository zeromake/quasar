/* eslint-disable */
/**
 * THIS FILE IS GENERATED AUTOMATICALLY.
 * DO NOT EDIT.
 **/

function getRandomId (max) {
  return Math.floor(Math.random() * max)
}

export class BexBridge {
  /**
   * Public properties
   */
  portMap = {}
  listeners = {} // { type: 'on' | 'once' | 'response', callback: message => void }

  /**
   * Private properties
   */
  #id = null
  #type = null
  #debug = false
  #banner = null

  constructor ({ type, name, debug }) {
    this.#id = type
    this.#type = type

    if (type === 'content-script') {
      /**
       * There can be multiple instances of the same content script
       * but for different tabs, so we need to differentiate them.
       *
       * Generating an easy to handle id for the content script.
       */
      this.#id = `${ type }@${ name.replaceAll('@', '-') }-${ getRandomId(10_000) }`
    }

    this.#banner = `[Quasar BEX | ${ this.#id }]`
    this.#debug = debug === true

    if (type === 'content-script' && name.indexOf('@') !== -1) {
      this.#warn(
        `The "@" character is not allowed in the content script name (${ name }).`
        + ' It was replaced with a "-".'
      )
    }

    const onMessage = message => { this.#handleMessage(message) }

    if (type === 'background') {
      chrome.runtime.onConnect.addListener(port => {
        if (this.portMap[ port.name ] !== void 0) {
          this.#warn(
            `Connection with "${ port.name }" already exists.`
            + ' Disconnecting the previous one and connecting the new one.'
          )
          this.portMap[ port.name ].disconnect()
        }

        this.portMap[ port.name ] = port

        port.onMessage.addListener(onMessage)
        port.onDisconnect.addListener(() => {
          port.onMessage.removeListener(onMessage)
          delete this.portMap[ port.name ]
          this.#log(`Closed connection with "${ port.name }".`)
        })

        this.#log(`Opened connection with ${ port.name }.`)
      })

      return
    }

    // else we're a content script or a popup/page

    const portToBackground = chrome.runtime.connect({ name: this.#id })
    this.portMap = { background: portToBackground }

    portToBackground.onMessage.addListener(onMessage)
    portToBackground.onDisconnect.addListener(() => {
      portToBackground.onMessage.removeListener(onMessage)
      delete this.portMap.background
      this.reset()
      this.#log('Connection with the background script was closed.')
    })
  }

  on (event, callback) {
    const target = this.listeners[ event ] || (this.listeners[ event ] = [])
    target.push({ type: 'on', callback })
    this.#log(`Started listening for "${ event }"`)
    return this // chainable
  }

  once (event, callback) {
    const target = this.listeners[ event ] || (this.listeners[ event ] = [])
    target.push({ type: 'once', callback })
    this.#log(`Started listening once for "${ event }"`)
    return this // chainable
  }

  off (event, callback) {
    const list = this.listeners[ event ]

    if (list === void 0) {
      this.#warn(`Tried to remove listener for "${ event }" but there is no listener attached`)
      return this // chainable
    }

    if (callback === void 0) {
      delete this.listeners[ event ]
      return this // chainable
    }

    const liveEvents = list.filter(entry => entry.callback !== callback)

    if (liveEvents.length !== 0) {
      this.listeners[ event ] = liveEvents
    }
    else {
      delete this.listeners[ event ]
    }

    this.#log(`Stopped listening for "${ event }"`)
    return this // chainable
  }

  // params: { event: string, to: string, respond: boolean, payload: any }
  send (params = {}) {
    const message = this.#createMessage(params)

    if (message.event === void 0) {
      const log = 'Tried to send message with no "event" prop specified'
      this.#warn(log, message)
      return Promise.reject(log)
    }

    const isBroadcast = this.#isBroadcastDestination(message.to)

    if (isBroadcast === true && message.respond === true) {
      const log = 'Broadcasting a message and requiring a response (respond: true) is not allowed'
      this.#warn(log, message)
      return Promise.reject(log)
    }

    this.#log(
      message.to === 'content-script'
        ? `Broadcasting event "${ message.event }" to all content scripts`
        : (
            message.to === void 0
              ? `Broadcasting event "${ message.event }"`
              : `Sending event "${ message.event }" to "${ message.to }"`
          ),
      message
    )

    const sendMessage = () => {
      if (Array.isArray(message.payload) === false) {
        this.#handleMessage(message)
        return
      }

      const chunkEvent = `${ message.event }@@@quasar:chunks:${ getRandomId(1000_000) }`
      this.#handleMessage({
        ...message,
        payload: void 0,
        chunks: {
          number: message.payload.length,
          event: chunkEvent
        }
      })

      message.payload.forEach(data => {
        this.#handleMessage(
          this.#createMessage({
            event: chunkEvent,
            to: message.to,
            payload: data
          })
        )
      })
    }

    if (message.respond === false) {
      sendMessage()
      return Promise.resolve() // be consistent with the return value
    }

    return new Promise(resolve => {
      const respondEvent = `${ message.event }@@@quasar:response:${ getRandomId(1_000_000) }`

      // flag the message with the event that should trigger the response
      message.respondEvent = respondEvent

      // register a temporary callback to be called when a response is received
      this.listeners[ respondEvent ] = [ {
        type: 'response',
        callback: payload => {
          delete this.listeners[ respondEvent ]
          resolve(payload)
        }
      } ]

      sendMessage()
    })
  }

  setDebug (value) {
    this.#debug = value === true
  }

  reset () {
    this.listeners = {}
    this.#log('All listeners were removed')
  }

  #createMessage ({ event, to, respond, payload }) {
    return {
      event,
      from: this.#id,
      to,
      respond: respond === true,
      payload,
      timestamp: Date.now()
    }
  }

  #createResponseMessage (message, responsePayload) {
    return {
      event: message.respondEvent,
      from: this.#id,
      to: message.from,
      payload: responsePayload,
      respond: false,
      timestamp: Date.now()
    }
  }

  #isMessage (message) {
    return (
      Object(message) === message
      && Array.isArray(message) === false
      && message.event !== void 0
      && message.from !== void 0
      && message.timestamp !== void 0
    )
  }

  #isBroadcastDestination (to) {
    return (
      to === void 0
      || to === 'content-script'
    )
  }

  #formatLog (message) {
    return `${ this.#banner } ${ message }`
  }

  #log (message, debugObject) {
    if (this.#debug !== true) return

    const log = this.#formatLog(message)

    if (debugObject !== void 0) {
      console.groupCollapsed(log)
      console.dir(debugObject)
      console.groupEnd(log)
    }
    else {
      console.log(log)
    }
  }

  #warn (message, debugObject) {
    const log = this.#formatLog(message)
    if (debugObject !== void 0) {
      console.warn(log, debugObject)
    }
    else {
      console.warn(log)
    }
  }

  async #trigger (message) {
    const list = this.listeners[ message.event ]
    const isBroadcasted = this.#isBroadcastDestination(message.to)
    let responsePayload

    if (list === void 0) {
      // if it's a broadcast, we shouldn't complain
      // when no listener is attached
      if (isBroadcasted === true) return

      this.#warn(
        `Event "${ message.event }" was sent from "${ message.from }" but there is no listener attached`,
        message
      )
    }
    else {
      const plural = list.length > 1 ? 's' : ''
      const broadcasted = message.to === void 0
        ? '(broadcasted) '
        : (
            message.to === 'content-script'
              ? '(broadcasted to all content scripts) '
              : ''
          )

      this.#log(
        `Triggering ${ list.length } listener${ plural } for ${ broadcasted }"${ message.event }" event`,
        message
      )

      if (message.chunks !== void 0) {
        let localResolve
        const promise = new Promise(resolve => {
          localResolve = resolve
        })

        const acc = []
        let chunksReceived = 0

        // register a temporary callback to receive the chunk list
        this.listeners[ message.chunks.event ] = [ {
          type: 'chunk',
          callback: chunk => {
            acc.push(chunk)
            chunksReceived++

            if (chunksReceived === message.chunks.number) {
              // we're done. free up the temporary listener
              delete this.listeners[ message.chunks.event ]
              localResolve(acc)
            }
          }
        } ]

        message.payload = await promise
      }

      for (const { type, callback } of list.slice(0)) {
        if (type === 'once') {
          this.off(message.event, callback)
        }

        if (message.respond === true && responsePayload === void 0) {
          responsePayload = await callback(message)
        }
        else {
          callback(message)
        }
      }
    }

    if (isBroadcasted === false && message.respondEvent !== void 0) {
      this.#handleMessage(
        this.#createResponseMessage(message, responsePayload)
      )
    }
  }

  #getPort (to) {
    const [ type, name ] = to.split('@')
    const target = this.portMap[ type ]
    return name === void 0
      ? target
      : target?.[ name ]
  }

  #handleMessage (message) {
    // if it's NOT generated by the bridge then ignore it
    if (this.#isMessage(message) === false) return

    const { to } = message

    if (this.#isBroadcastDestination(to) === true) {
      if (this.#type === 'background') {
        if (to === 'content-script') {
          // broadcast it to all content-scripts (only)
          for (const name in this.portMap) {
            if (
              name !== message.from
              && name.startsWith('content-script') === true
            ) {
              this.portMap[ name ].postMessage(message)
            }
          }
        }
        else {
          // broadcasting it to all connected ports...
          for (const name in this.portMap) {
            if (name !== message.from) {
              this.portMap[ name ].postMessage(message)
            }
          }

          // then trigger it for background too
          this.#trigger(message)
        }

        return
      }

      if (message.from === this.#id) {
        // if it's us who sent it, then
        // relay to background to broadcast it
        this.portMap.background.postMessage(message)
        return
      }

      if (
        to === 'content-script'
        && this.#type === 'content-script'
      ) {
        this.#trigger(message)
        return
      }
    }

    // if it's for us (or a broadcast),
    // then trigger the event
    if (to === this.#id || to === void 0) {
      this.#trigger(message)
      return
    }

    if (this.#type === 'background') {
      const port = this.#getPort(to)

      if (port !== void 0) {
        port.postMessage(message)
        return
      }

      this.#warn(
        `Event "${ message.event }" was sent from "${ message.from }" to "${ to }" but there is no such connection`,
        message
      )

      // if it requires an answer but there is no one to answer,
      // then we do it for resources to free up...
      if (message.respond === true) {
        const fromPort = this.#getPort(message.from)

        // if the port does not exist anymore,
        // then the response is already not needed anymore
        if (fromPort === void 0) {
          this.#warn(
            `Event "${ message.event }" was sent from "${ message.from }" but there is no such connection to respond to`,
            message
          )
        }
        else {
          fromPort.postMessage(
            this.#createResponseMessage(message)
          )
        }
      }

      return
    }

    // otherwise we're a script that connects to the background
    // so send/relay to the message to the background (it'll know what to do with it)
    this.portMap.background.postMessage(message)
  }
}
