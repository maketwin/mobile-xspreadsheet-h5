const chromeBase = 'http://127.0.0.1:9223';
const appUrl = 'http://127.0.0.1:3460/';

async function getPageTarget() {
  let targets = await (await fetch(`${chromeBase}/json`)).json();
  let target = targets.find(it => it.type === 'page');
  if (!target) {
    target = await (await fetch(`${chromeBase}/json/new?${encodeURIComponent(appUrl)}`, {
      method: 'PUT',
    })).json();
  }
  return target;
}

function createCdpClient(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result);
  });

  return new Promise((resolve, reject) => {
    ws.addEventListener('open', () => {
      resolve({
        send(method, params = {}) {
          id += 1;
          ws.send(JSON.stringify({ id, method, params }));
          return new Promise((sendResolve, sendReject) => {
            pending.set(id, { resolve: sendResolve, reject: sendReject });
          });
        },
        close() {
          ws.close();
        },
      });
    });
    ws.addEventListener('error', reject);
  });
}

async function waitForRuntime(client) {
  for (let i = 0; i < 80; i += 1) {
    const result = await client.send('Runtime.evaluate', {
      expression: 'typeof window.runSpreadsheetPerf === "function"',
      returnByValue: true,
    });
    if (result.result?.value === true) return;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('window.runSpreadsheetPerf was not ready');
}

async function evaluateJson(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || 'Runtime.evaluate failed');
  }
  return JSON.parse(result.result.value);
}

const target = await getPageTarget();
const client = await createCdpClient(target.webSocketDebuggerUrl);
await client.send('Runtime.enable');
await client.send('Page.enable');
await client.send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true,
});
await client.send('Page.navigate', { url: appUrl });
await waitForRuntime(client);

const results = [];
for (const rows of [1000, 5000, 10000]) {
  const expression = `(async () => JSON.stringify(await window.runSpreadsheetPerf(${rows}, 50)))()`;
  results.push(await evaluateJson(client, expression));
}

client.close();
console.log(JSON.stringify({ results }, null, 2));
