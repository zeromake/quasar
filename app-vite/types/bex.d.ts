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

export interface BexBridge {
  readonly portName: string;
  readonly listeners: Record<
    BexEventName,
    { type: "on" | "once"; callback: BexEventListener<BexEventName> }[]
  >;
  readonly portMap: Record<string, chrome.runtime.Port>;
  readonly portList: string[];
  readonly messageMap: Record<
    string,
    {
      portName: string;
      resolve: (payload: any) => void;
      reject: (error: any) => void;
    }
  >;
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

  constructor(options: {
    type: "background" | "content" | "app";
    name?: string; // TODO: make it available&required only for content scripts
    debug?: boolean;
  }): BexBridge;

  send<T extends BexEventName>(
    options: {
      event: T;
      to?: "background" | "app" | `content@${string}-${string}`;
    } & (BexEventData<T> extends never
      ? { payload?: undefined }
      : { payload: BexEventData<T> }),
  ): Promise<BexEventData<T>>;

  on<T extends BexEventName>(eventName: T, listener: BexEventListener<T>): this;
  once<T extends BexEventName>(
    eventName: T,
    listener: BexEventListener<T>,
  ): this;
  off<T extends BexEventName>(
    eventName: T,
    listener: BexEventListener<T>,
  ): this;
}

export type GlobalQuasarBex = BexBridge;

export type BexBackgroundCallback = (payload: {
  useBridge: (options?: { debug?: boolean }) => BexBridge;
}) => void;

export type BexContentCallback = (
  useBridge: (options: { name: string; debug?: boolean }) => BexBridge,
) => void;
