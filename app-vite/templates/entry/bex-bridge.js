/* eslint-disable */
/**
 * THIS FILE IS GENERATED AUTOMATICALLY.
 * DO NOT EDIT.
 **/

export class BexBridge {
  /**
   * Public properties
   */
  portMap = {}
  listeners = {} // { type: 'on' | 'once' | 'reply', callback: message => void }

  /**
   * Private properties
   */
  #id = null
  #debug = false
  #banner = null

  constructor ({ type, name, debug }) {
    this.#id = type

    if (type === 'content-script') {
      /**
       * There can be multiple instances of the same content script
       * but for different tabs, so we need to differentiate them.
       *
       * Generating an easy to handle id for the content script.
       */
      this.#id = `${ type }@${ name.replaceAll('@', '-') }-${ Math.floor(Math.random() * 10000) }`
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

  send ({ event, to, reply = false, payload } = {}) {
    if (event === void 0) {
      const log = 'Tried to send message with no "event" prop specified'
      this.#warn(log, { event, to, reply, payload })
      return Promise.reject(log)
    }

    if (to === void 0) {
      const log = 'Tried to send message with no "to" prop specified'
      this.#warn(log, { event, to, reply, payload })
      return Promise.reject(log)
    }

    const message = {
      event,
      from: this.#id,
      to,
      reply: reply === true,
      payload,
      timestamp: Date.now()
    }

    this.#log(
      `Sending event "${ event }" to "${ to }"`,
      { event, to, reply, payload }
    )

    if (message.reply === false) {
      this.#handleMessage(message)
      return Promise.resolve() // be consistent with the return value
    }

    return new Promise(resolve => {
      // flag the message with the event that should trigger the reply
      message.reply = `${ event }____quasarResponseFrom:${ to }:${ message.timestamp }`

      // register a temporary callback to be called when a reply is received
      this.listeners[ message.reply ] = [ { type: 'reply', callback: resolve } ]

      this.#handleMessage(message)
    })
  }

  setDebug (value) {
    this.#debug = value === true
  }

  reset () {
    this.listeners = {}
    this.#log('All listeners were removed')
  }

  #isMessage (message) {
    if (Object(message) !== message) return false
    if (Array.isArray(message)) return false
    if (message.event === void 0) return false
    if (message.from === void 0) return false
    if (message.to === void 0) return false
    if (message.timestamp === void 0) return false
    return true
  }

  #createReplyMessage (message, replyPayload) {
    return {
      event: message.reply,
      from: this.#id,
      to: message.from,
      payload: replyPayload,
      timestamp: Date.now()
    }
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
    let replyPayload

    if (list === void 0) {
      this.#warn(
        `Event "${ message.event }" was sent from "${ message.from }" but there is no listener attached`,
        message
      )
    }
    else {
      const plural = list.length > 1 ? 's' : ''
      this.#log(
        `Triggering ${ list.length } listener${ plural } for "${ message.event }" event`,
        message
      )

      // ensure the message is not tampered with
      const callbackParam = message.payload !== void 0
        ? JSON.parse(JSON.stringify(message.payload))
        : void 0

      for (const { type, callback } of list.slice(0)) {
        if (type !== 'on') {
          this.off(message.event, callback)
        }

        if (message.reply !== void 0 && replyPayload === void 0) {
          replyPayload = await callback(callbackParam)
        }
        else {
          callback(callbackParam)
        }
      }
    }

    typeof message.reply === 'string' && this.#handleMessage(
      this.#createReplyMessage(message, replyPayload)
    )
  }

  #getPort (to) {
    const [ type, name ] = to.split('@')
    const target = this.portMap[ type ]
    return name === void 0
      ? target
      : target?.[ name ]
  }

  #handleMessage (message) {
    // if it's not ours, then ignore
    if (this.#isMessage(message) === false) return

    const { to } = message

    // if it's for us, then trigger the event
    if (to === this.#id) {
      this.#trigger(message)
      return
    }

    if (this.#id === 'background') {
      const port = this.#getPort(to)

      if (port !== void 0) {
        port.postMessage(message)
        return
      }

      this.#warn(
        `Event "${ message.event }" was sent to "${ to }" but there is no such connection`,
        message
      )

      // if it requires an answer but there is no one to answer,
      // then we do it for resources to free up...
      if (message.reply !== void 0) {
        const fromPort = this.#getPort(message.from)

        // if the port does not exist anymore,
        // then the reply is already not needed anymore
        if (fromPort === void 0) {
          this.#warn(
            `Event "${ message.event }" was sent from "${ message.from }" but there is no such connection to reply to`,
            message
          )
        }
        else {
          fromPort.postMessage(
            this.#createReplyMessage(message)
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
