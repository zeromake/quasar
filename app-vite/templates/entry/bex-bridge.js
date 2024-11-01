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
  name = null
  listeners = {} // { type: "on" | "once", callback: Message => void }
  portMap = {} // { [portName]: chrome.runtime.Port }
  portList = [] // [ portName, ... ]
  messageMap = {} // { [id]: { portName, resolve, reject } }
  chunkMap = {} // { [id]: { portName, number, messageType, messageProps, payload: [] } }

  /**
   * Private properties
   */
  #type = null
  #debug = false
  #banner = null

  // param: {
  //   type: "background" | "content" | "app"
  //   name?: string (used & required for content scripts only)
  //   debug?: boolean
  // }
  constructor ({ type, name = '', debug }) {
    this.name = type
    this.#type = type

    if (type === 'content') {
      /**
       * There can be multiple instances of the same content script
       * but for different tabs, so we need to differentiate them.
       *
       * Generating an easy to handle id for the content script.
       */
      this.name = `${ type }@${ name.replaceAll('@', '-') }-${ getRandomId(10_000) }`
    }

    this.#banner = `[Quasar BEX | ${ this.name }]`
    this.#debug = debug === true

    if (type === 'content') {
      if (!name) {
        this.warn('Content script name was not specified on instantiation.')
        return
      }

      if (name.indexOf('@') !== -1) {
        this.warn(
          `The "@" character is not allowed in the content script name (${ name }).`
          + ' It was replaced with a "-".'
        )
      }
    }

    const onPacket = this.#onPacket.bind(this)

    if (type === 'background') {
      chrome.runtime.onConnect.addListener(port => {
        if (this.portMap[ port.name ] !== void 0) {
          this.warn(
            `Connection with "${ port.name }" already exists.`
            + ' Disconnecting the previous one and connecting the new one.'
          )
          this.portMap[ port.name ].disconnect()
          this.#cleanupPort(port.name)
        }

        this.portMap[ port.name ] = port

        port.onMessage.addListener(onPacket)
        port.onDisconnect.addListener(() => {
          port.onMessage.removeListener(onPacket)
          this.#cleanupPort(port.name)
          this.log(`Closed connection with ${ port.name }.`)
          this.#updatePortList({ removed: port.name })
        })

        this.log(`Opened connection with ${ port.name }.`)
        this.#updatePortList({ added: port.name})
      })

      return
    }

    // else we're a content script or a popup/page

    const portToBackground = chrome.runtime.connect({ name: this.name })
    this.portMap = { background: portToBackground }

    portToBackground.onMessage.addListener(onPacket)
    portToBackground.onDisconnect.addListener(() => {
      portToBackground.onMessage.removeListener(onPacket)

      this.chunkMap = {}
      this.portMap = {}
      this.portList = []

      for (const id in this.packetMap) {
        const packet = this.packetMap[ id ]
        packet.reject('Connection was closed')
      }

      for (const id in this.messageMap) {
        const packet = this.messageMap[ id ]
        packet.reject('Connection was closed')
      }

      this.log('Closed connection with the background script.')
    })

    this.on('@quasar:ports', ({ payload }) => {
      this.portList = payload.portList
      if (payload.removed !== void 0) {
        this.#cleanupPort(payload.removed)
      }
    })
  }

  // event: string
  // callback: (message: { from: string, to: string, payload?: any }) => void
  on (event, callback) {
    const target = this.listeners[ event ] || (this.listeners[ event ] = [])
    target.push({ type: 'on', callback })
    this.log(`Listening for event: "${ event }"`)
  }

  // event: string
  // callback: (message: { from: string, to: string, payload?: any }) => void
  once (event, callback) {
    const target = this.listeners[ event ] || (this.listeners[ event ] = [])
    target.push({ type: 'once', callback })
    this.log(`Listening once for event: "${ event }"`)
  }

  // event: string
  // callback: (message: { from: string, to: string, payload?: any }) => void
  off (event, callback) {
    const list = this.listeners[ event ]

    if (list === void 0) {
      this.warn(`Tried to remove listener for "${ event }" event but there is no such listener attached`)
      return
    }

    if (callback === void 0) {
      delete this.listeners[ event ]
      return
    }

    const liveEvents = list.filter(entry => entry.callback !== callback)

    if (liveEvents.length !== 0) {
      this.listeners[ event ] = liveEvents
    }
    else {
      delete this.listeners[ event ]
    }

    this.log(`Stopped listening for "${ event }"`)
  }

  // ({
  //   event: string,
  //   to?: "background" | "app" | "content@<name>-<xxxxx>",
  //   payload?: any (if it's Array then it will be split into chunks)
  // }) => Promise<any | void>
  //
  // Returns a Promise that resolves with the response payload
  send ({ event, to, payload } = {}) {
    if (!event) {
      return Promise.reject(
        'Tried to send message with no "event" prop specified',
        { event, to, payload }
      )
    }

    if (!to) {
      return Promise.reject(
        'Tried to send message with no "to" prop specified',
        { event, to, payload }
      )
    }

    if (this.portList.includes(to) === false) {
      return Promise.reject(
        this.#type === 'background'
          ? `Tried to send message to "${ to }" but there is no such port registered`
          : `Tried to send message to "${ to }" but the port to background is not available to send through`
      )
    }

    const id = getRandomId(1_000_000)

    return this.#sendMessage({
      id,
      to,
      payload,
      messageType: 'event-send',
      messageProps: { event }
    }).then(() => new Promise((resolve, reject) => {
      if (this.portList.includes(to) === false) {
        return Promise.reject(
          `Connection to "${ to }" was closed while waiting for a response`
        )
      }

      this.messageMap[ id ] = {
        portName: to,
        resolve: responsePayload => {
          delete this.messageMap[ id ]
          resolve(responsePayload)
        },
        reject: err => {
          delete this.messageMap[ id ]
          reject(err)
        }
      }
    }))
  }

  // value: boolean
  setDebug (value) {
    this.#debug = value === true
  }

  // str: string
  #formatLog (str) {
    return `${ this.#banner } ${ str }`
  }

  // ({ str: string, debugObject?: any | void }) => void
  log (str, debugObject) {
    if (this.#debug !== true) return

    const log = this.#formatLog(str)

    if (debugObject !== void 0) {
      console.groupCollapsed(log)
      console.dir(debugObject)
      console.groupEnd(log)
    }
    else {
      console.log(log)
    }
  }

  // ({ str: string, debugObject?: any | void }) => void
  warn (str, debugObject) {
    const log = this.#formatLog(str)
    if (debugObject !== void 0) {
      console.warn(log, debugObject)
    }
    else {
      console.warn(log)
    }
  }

  // reason: ({ added?: string } | { removed?: string })
  #updatePortList (reason) {
    this.portList = Object.keys(this.portMap)
    const list = [ 'background', ...this.portList ]

    for (const portName of this.portList) {
      this.send({
        event: '@quasar:ports',
        to: portName,
        payload: {
          portList: list.filter(name => name !== portName),
          ...reason
        }
      }).catch(err => {
        this.warn(
          `Failed to inform "${ portName }" about the port list`,
          err
        )
      })
    }
  }

  // message: { from: string, to: string, event: string, payload: any | undefined }
  async #triggerMessageEvent (message) {
    const list = this.listeners[ message.event ]

    if (list === void 0) return

    const plural = list.length > 1 ? 's' : ''
    this.log(
      `Triggering ${ list.length } listener${ plural } for event: "${ message.event }"`,
      { message, listeners: list }
    )

    let responsePayload
    for (const { type, callback } of list.slice(0)) {
      if (type === 'once') {
        this.off(message.event, callback)
      }

      try {
        if (responsePayload === void 0) {
          const value = callback(message)
          responsePayload = value instanceof Promise
            ? await value
            : value
        }
        else {
          callback(message)
        }
      }
      catch (err) {
        this.warn(
          `Error while triggering listener${ plural } for event: "${ message.event }"`,
          { error: err, message, listener: { type, callback } }
        )
        return Promise.reject(err)
      }
    }

    return responsePayload
  }

  // portName: string
  #cleanupPort (portName) {
    for (const id in this.packetMap) {
      const packet = this.packetMap[ id ]
      if (packet.portName === portName) {
        packet.reject('Connection was closed')
      }
    }

    for (const id in this.chunkMap) {
      const packet = this.chunkMap[ id ]
      if (packet.portName === portName) {
        delete this.chunkMap[ id ]
      }
    }

    for (const id in this.messageMap) {
      const packet = this.messageMap[ id ]
      if (packet.portName === portName) {
        packet.reject('Connection was closed')
      }
    }

    delete this.portMap[ portName ]
  }

  #onPacket (packet) {
    /**
     * if it's not a packet sent by this bridge
     * then ignore it
     */
    if (
      Object(packet) !== packet
      || packet.id === void 0
      || packet.from === void 0
      || packet.to === void 0
      || packet.type === void 0
    ) {
      this.log(
        `Received a message that does not appear to be emitted by a Quasar bridge or is malformed`,
        packet
      )
      return
    }

    this.log(
      `Received message of type "${ packet.type }" from "${ packet.from }"`,
      packet
    )

    /**
     * if the packet is not addressed to this bridge
     * then forward it to the target
     */
    if (packet.to !== this.name) {
      this.#sendPacket(packet)
      return
    }

    if (packet.type === 'full') {
      this.#onMessage({
        id: packet.id,
        from: packet.from,
        to: packet.to,
        payload: packet.payload,
        type: packet.messageType,
        props: packet.messageProps
      })
      return
    }

    if (packet.type === 'chunk') {
      const chunk = this.chunkMap[ packet.id ]
      if (chunk === void 0) {
        if (packet.chunkIndex !== void 0) {
          this.warn(
            'Received an unregistered chunk',
            packet
          )
          return
        }

        this.chunkMap[ packet.id ] = {
          portName: packet.from,
          number: packet.chunksNumber,
          messageType: packet.messageType,
          messageProps: packet.messageProps,
          payload: []
        }
        return
      }

      // if we received an unexpected chunk
      if (packet.chunkIndex !== chunk.payload.length) {
        this.warn(
          'Received an out of order chunk',
          packet
        )

        // free up resources
        delete this.chunkMap[ packet.id ]
        return
      }

      chunk.payload.push(packet.payload)

      // if we received all chunks...
      if (packet.chunkIndex === chunk.number - 1) {
        delete this.chunkMap[ packet.id ]

        this.#onMessage({
          id: packet.id,
          from: packet.from,
          to: packet.to,
          payload: chunk.payload,
          type: chunk.messageType,
          props: chunk.messageProps
        })
      }

      return
    }

    if (packet.type === 'chunk-abort') {
      delete this.chunkMap[ packet.id ]
      return
    }

    this.warn(
      `Received an unknown message type: "${ packet.type }"`
    )
  }

  #sendPacket (packet) {
    this.log(
      packet.from === this.name
        ? `Sending message of type "${ packet.type }" to "${ packet.to }"`
        : `Forwarding message of type "${ packet.type }" from "${ packet.from }" to "${ packet.to }"`
      ,
      packet
    )

    const port = this.#type === 'background'
      ? this.portMap[ packet.to ]
      : this.portMap.background

    if (this.portList.includes(packet.to) === false) {
      return Promise.reject(
        `Tried to send message of type "${ packet.type }" to "${ packet.to }" but there is no such port registered`
      )
    }

    if (port === void 0) {
      return Promise.reject(
        this.#type === 'background'
          ? `Tried to send message of type "${ packet.type }" to "${ packet.to }" but the port is not available`
          : `Tried to send message of type "${ packet.type }" to "${ packet.to }" but the port to background is not available to forward through`
      )
    }

    try {
      port.postMessage(packet)
    }
    catch (err) {
      this.warn(
        `Failed to send message to "${ packet.to }"`,
        err
      )
      return Promise.reject(err)
    }

    return Promise.resolve()
  }

  // id?: number,
  // to: string,
  // payload: any,
  // messageType: "event-send" | "event-response",
  // messageProps: any
  #sendMessage ({
    id = getRandomId(1_000_000),
    to,
    payload,
    messageType,
    messageProps
  }) {
    if (Array.isArray(payload) === false) {
      return this.#sendPacket({
        id,
        from: this.name,
        to,
        type: 'full',
        payload,
        messageType,
        messageProps
      })
    }

    let promise = this.#sendPacket({
      id,
      from: this.name,
      to,
      type: 'chunk',
      chunksNumber: payload.length,
      messageType,
      messageProps
    })

    for (let i = 0; i < payload.length; i++) {
      promise = promise.then(() => this.#sendPacket({
        id,
        from: this.name,
        to,
        type: 'chunk',
        payload: payload[ i ],
        chunkIndex: i
      }))
    }

    return promise.catch(err => {
      this.#sendPacket({
        id,
        from: this.name,
        to,
        type: 'chunk-abort'
      }).catch(err => {
        this.warn(
          `Failed to send a chunk-abort message to "${ to }"`,
          err
        )
      })

      return Promise.reject(err)
    })
  }

  #onMessage (message) {
    if (message.type === 'event-response') {
      const messageMapId = message.props.messageMapId
      const target = this.messageMap[ messageMapId ]

      if (target === void 0) {
        this.warn(
          `Received a response for an unknown message id: "${ messageMapId }"`,
          message
        )
        return
      }

      if (message.props.error !== void 0) {
        target.reject(message.props.error)
      }
      else {
        target.resolve(message.payload)
      }

      return
    }

    if (message.type === 'event-send') {
      const { event } = message.props

      this.#triggerMessageEvent({
        from: message.from,
        to: message.to,
        event,
        payload: message.payload
      }).then(returnPayload => {
        this.#sendMessage({
          to: message.from,
          payload: returnPayload,
          messageType: 'event-response',
          messageProps: {
            messageMapId: message.id
          }
        })
      }).catch(err => {
        this.#sendMessage({
          to: message.from,
          messageType: 'event-response',
          messageProps: {
            messageMapId: message.id,
            error: err
          }
        })
      })

      return
    }

    this.warn(
      `Received a message with unknown type: "${ message.type }"`,
      message
    )
  }
}
