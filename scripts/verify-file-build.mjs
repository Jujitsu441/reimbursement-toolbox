const endpoint = process.env.CHROME_DEBUG_ENDPOINT ?? "http://127.0.0.1:9333";
const fileUrl = new URL("../dist/index.html", import.meta.url).href;

const tabs = await fetch(`${endpoint}/json`).then((response) => response.json());
const tab = tabs.find((item) => item.type === "page") ?? tabs[0];
if (!tab?.webSocketDebuggerUrl) {
  throw new Error("Chrome 调试页面不可用");
}

const ws = new WebSocket(tab.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const requests = [];
const failures = [];
const logs = [];

ws.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  if (data.id && pending.has(data.id)) {
    pending.get(data.id)(data);
    pending.delete(data.id);
    return;
  }
  if (data.method === "Network.requestWillBeSent") {
    requests.push(data.params.request.url);
  }
  if (data.method === "Network.loadingFailed") {
    failures.push(data.params);
  }
  if (data.method === "Runtime.consoleAPICalled") {
    logs.push(data.params.args.map((arg) => arg.value ?? arg.description ?? "").join(" "));
  }
  if (data.method === "Log.entryAdded") {
    logs.push(`${data.params.entry.level}: ${data.params.entry.text}`);
  }
});

await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});

function send(method, params = {}) {
  return new Promise((resolve) => {
    const messageId = ++id;
    pending.set(messageId, resolve);
    ws.send(JSON.stringify({ id: messageId, method, params }));
  });
}

await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
await send("Log.enable");

const loadPromise = new Promise((resolve) => {
  const timeout = setTimeout(resolve, 5000);
  ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    if (data.method === "Page.loadEventFired") {
      clearTimeout(timeout);
      resolve();
    }
  });
});

await send("Page.navigate", { url: fileUrl });
await loadPromise;
await new Promise((resolve) => setTimeout(resolve, 1200));

const title = await send("Runtime.evaluate", {
  expression: "document.title",
  returnByValue: true,
});
const body = await send("Runtime.evaluate", {
  expression: "document.body.innerText",
  returnByValue: true,
});

const nonLocalRequests = [...new Set(requests)].filter(
  (url) => !url.startsWith("file:") && !url.startsWith("blob:") && !url.startsWith("data:")
);

const result = {
  title: title.result?.result?.value,
  hasHomeText: String(body.result?.result?.value ?? "").includes("报销工具箱"),
  requestCount: requests.length,
  nonLocalRequests,
  failures: failures.map((failure) => ({
    errorText: failure.errorText,
    blockedReason: failure.blockedReason,
    type: failure.type,
  })),
  logs,
};

ws.close();
console.log(JSON.stringify(result, null, 2));

if (!result.hasHomeText || nonLocalRequests.length || result.failures.length) {
  process.exitCode = 1;
}
