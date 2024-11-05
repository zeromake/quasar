import { BexBridge } from './bex-bridge.js'

const bridge = window.QBexBridge = new BexBridge({ type: 'app' })

export const bex = {
  bridge,
  promise: bridge.connectToBackground().catch(() => {})
}
