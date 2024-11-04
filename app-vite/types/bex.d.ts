import type { LiteralUnion } from "quasar";

/**
 * @example
 * declare module '@quasar/app-vite' {
 *   interface BexEventMap {
 *     'without-payload-and-response': never;
 *     'without-payload-with-response': [never, number];
 *     'with-payload-without-response': [{ test: number[] }, never];
 *     'with-payload-and-response': [{ foo: string[] }, number];
 *   }
 * }
 *
 * await bridge.send('without-payload-and-response');
 *
 * bridge.on('with-payload-without-response', ({ payload }) => {
 *   payload // type: { test: number[] }
 * });
 *
 * bridge.on('with-payload-and-response', async ({ payload }) => {
 *   const { foo } = payload; // { foo: ['a', 'b'] }
 *
 *   const result = foo[0].charCodeAt() + foo[1].charCodeAt(); // 97 + 98
 *   return result;
 * });
 * const response = await bridge.send('with-payload-and-response', { foo: ['a', 'b'] });
 * console.log(response); // 195
 */
export interface BexEventMap {}

type BexEventName = LiteralUnion<Exclude<keyof BexEventMap, number>>;
type BexEventEntry<
  K extends BexEventName,
  P = K extends keyof BexEventMap ? BexEventMap[K] : any[],
> = P extends never
  ? [never, never]
  : P extends [unknown, unknown]
    ? P
    : [any, any];
type BexEventData<T extends BexEventName> = BexEventEntry<T>[0];
type BexEventResponse<T extends BexEventName> = BexEventEntry<T>[1];

type BexMessage<TPayload> = {
  from: string;
  to: string;
  event: string;
} & (TPayload extends never ? { payload?: undefined } : { payload: TPayload });

type BexEventListener<T extends BexEventName> = (
  message: BexMessage<BexEventData<T>>,
) => BexEventResponse<T>;

type BexBridgeOptions = {
  debug?: boolean;
} & (
  | {
      type: "background";
    }
  | {
      type: "app";
    }
  | {
      type: "content";
      name: string;
    }
);

export interface BexBridge {
  /**
   * The name of the port where the bridge belongs to.
   */
  readonly portName: string;
  /**
   * Whether the bridge is connected to the background script.
   *
   * @see {@link BexBridge.connectToBackground} for connecting to the background script
   */
  readonly isConnected: boolean;
  /**
   * The map of listeners:
   * - key: event name
   * - value: array of listener definitions
   */
  readonly listeners: Record<
    BexEventName,
    { type: "on" | "once"; callback: BexEventListener<BexEventName> }[]
  >;
  /**
   * The map of connected ports:
   * - key: port name
   * - value: port instance
   */
  readonly portMap: Record<string, chrome.runtime.Port>;
  /**
   * The list of connected port names.
   */
  readonly portList: string[];
  /**
   * The key is the message ID, which is unique for each message.
   */
  readonly messageMap: Record<
    string,
    {
      portName: string;
      resolve: (payload: any) => void;
      reject: (error: any) => void;
    }
  >;
  /**
   * The key is the message ID, which is unique for each message.
   */
  readonly chunkMap: Record<
    string,
    {
      portName: string;
      number: number;
      payload: unknown[];
    } & {
      messageType: "event-send";
      messageProps: {
        event: BexEventName;
      };
    }
  > & {
    messageType: "event-response";
    messageProps: {
      messageMapId: string;
      error?: Error;
    };
  };

  constructor(options: BexBridgeOptions): BexBridge;

  /**
   * Connect to the background script.
   *
   * @see {@link BexBridge.isConnected} for checking the connection status
   *
   * @throws {string} if the bridge is already connected
   * @throws {string} if there is no bridge for the background script. If you didn't call `useBridge` in the background script, it will not be created.
   * @throws {string} if the bridge is for the background script, e.g. created with `type: 'background'`
   */
  connectToBackground(): Promise<void>;
  /**
   * Disconnect from the background script.
   *
   * @throws {string} if the bridge is not connected
   * @throws {string} if the bridge is for the background script, e.g. created with `type: 'background'`
   */
  disconnectFromBackground(): Promise<void>;

  /**
   * Send a message to the specified bridge.
   *
   * @example
   * const result = await bridge.send({
   *   event: 'sum', // example event which sums two numbers
   *   to: 'app',
   *   payload: { a: 1, b: 2 }
   * });
   * console.log(result); // 3
   */
  send<T extends BexEventName>(
    options: {
      event: T;
      to?: "background" | "app" | `content@${string}-${string}`;
    } & (BexEventData<T> extends never
      ? { payload?: undefined }
      : { payload: BexEventData<T> }),
  ): Promise<BexEventData<T>>;

  /**
   * Listen to the specified event.
   *
   * @see {@link BexBridge.off} for removing the listener
   * @see {@link BexBridge.once} for listening to the event only once
   * @see {@link BexEventMap} for strong typing your events
   */
  on<T extends BexEventName>(eventName: T, listener: BexEventListener<T>): this;
  /**
   * Listen to the specified event once.
   * The listener will be removed after the first call.
   *
   * @see {@link BexBridge.on} for listening to the event more than once
   * @see {@link BexEventMap} for strong typing your events
   */
  once<T extends BexEventName>(
    eventName: T,
    listener: BexEventListener<T>,
  ): this;
  /**
   * Remove the specified listener.
   */
  off<T extends BexEventName>(
    eventName: T,
    listener: BexEventListener<T>,
  ): this;

  /**
   * Update the debug mode.
   */
  setDebug(debug: boolean): void;
  /**
   * Log a message if the debug mode is enabled.
   *
   * If the last argument is an object, it will be logged using `console.dir`.
   *
   * @see {@link BexBridge.setDebug} for updating the debug mode
   */
  log(...args: any[]): void;
  /**
   * Log a warning message.
   * It will always be logged regardless of the debug mode.,
   *
   * If the last argument is an object, it will be logged using `console.dir`.
   */
  warn(...args: any[]): void;
}

export type GlobalQuasarBex = BexBridge;

type OptionsForType<T extends BexBridgeOptions['type']> = Omit<
  Extract<BexBridgeOptions, { type: T }>,
  "type"
>;

export type BexBackgroundCallback = (payload: {
  /**
   * Get the bridge for the background script.
   * It is a singleton, which will be created on the first call.
   * So, calling with a different option after the first call will not have any effect.
   *
   * @example
   * const bridge = useBridge();
   *
   * @example
   * const bridge = useBridge({ debug: true });
   */
  useBridge: (options?: OptionsForType<"background">) => BexBridge;
}) => void;

export type BexContentCallback = (
  /**
   * Get the bridge for the current content script.
   * It is a singleton, which will be created on the first call.
   * So, calling with a different option after the first call will not have any effect.
   *
   * @example
   * const bridge = useBridge({ name: 'content-script-1' });
   *
   * @example
   * const bridge = useBridge({ name: 'content-script-1', debug: true });
   */
  useBridge: (options: OptionsForType<"content">) => BexBridge,
) => void;
