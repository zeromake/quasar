import { bexBackground } from 'quasar/wrappers';

function openExtension () {
  chrome.tabs.create(
    {
      url: chrome.runtime.getURL('www/index.html')
    },
    (/* newTab */) => {
      // Tab opened.
    }
  );
}

chrome.runtime.onInstalled.addListener(openExtension);
chrome.action.onClicked.addListener(openExtension);

declare module '@quasar/app-vite' {
  interface BexEventMap {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    log: [{ message: string; data?: any[] }, never];
    getTime: [never, number];

    'storage.get': [{ key: string | null }, any];
    'storage.set': [{ key: string; value: any }, any];
    'storage.remove': [{ key: string }, any];
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }
}

export default bexBackground(({ useBridge }) => {
  const bridge = useBridge({ debug: false });

  bridge.on('log', ({ from, payload }) => {
    console.log(`[BEX] @log from "${ from }"`, payload);
  });

  bridge.on('getTime', () => {
    return Date.now();
  });

  bridge.on('storage.get', ({ payload }) => {
    return new Promise(resolve => {
      if (payload === void 0) {
        chrome.storage.local.get(null, items => {
          // Group the values up into an array to take advantage of the bridge's chunk splitting.
          resolve(Object.values(items))
        })
      } else {
        chrome.storage.local.get([payload], items => {
          resolve(items[payload])
        })
      }
    })
  })
  // Usage:
  // const { payload } = await bridge.send({
  //   event: 'storage.get',
  //   to: 'background',
  //   reply: true,
  //   payload: key
  // })

  bridge.on('storage.set', ({ payload }) => {
    chrome.storage.local.set({ [payload.key]: payload.value });
  });
  // Usage:
  // await bridge.send({
  //   event: 'storage.set',
  //   to: 'background',
  //   payload: { key: 'someKey', value: 'someValue' }
  // })

  bridge.on('storage.remove', ({ payload }) => {
    chrome.storage.local.remove(payload);
  });
  // Usage:
  // await bridge.send({
  //   event: 'storage.remove',
  //   to: 'background',
  //   payload: 'someKey'
  // });

  /*
  // EXAMPLES
  // Listen to a message from the client
  bridge.on('test', message => {
    console.log(message);
  })

  // Send a message to the client based on something happening.
  chrome.tabs.onCreated.addListener(tab => {
    bridge.send(...);
  });

  // Send a message to the client based on something happening.
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
      bridge.send(...);
    }
  });

  // send a message and wait for a response
  const { payload } = await bridge.send({
    event: 'test',
    to: 'app',
    reply: true, // required to get a response
    payload: 'Hello from content-script'
  });

  // broadcast a message to app & content scripts
  bridge.send({ event: 'test', payload: 'Hello from background!' });

  // broadcast a message to all content scripts
  bridge.send({ event: 'test', to: 'content-script', payload: 'Hello from background!' });
  */
});
