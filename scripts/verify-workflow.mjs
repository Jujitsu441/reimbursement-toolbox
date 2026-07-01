import { mkdir, readdir, rm, stat } from "node:fs/promises";

const endpoint = process.env.CHROME_DEBUG_ENDPOINT ?? "http://127.0.0.1:9333";
const fileUrl = new URL("../dist/index.html", import.meta.url).href;
const downloadPath = "/private/tmp/reimb-toolbox-downloads";

await rm(downloadPath, { recursive: true, force: true });
await mkdir(downloadPath, { recursive: true });

const tabs = await fetch(`${endpoint}/json`).then((response) => response.json());
const tab = tabs.find((item) => item.type === "page") ?? tabs[0];
if (!tab?.webSocketDebuggerUrl) {
  throw new Error("Chrome 调试页面不可用");
}

const ws = new WebSocket(tab.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const errors = [];

ws.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  if (data.id && pending.has(data.id)) {
    pending.get(data.id)(data);
    pending.delete(data.id);
    return;
  }
  if (data.method === "Runtime.exceptionThrown") {
    errors.push(data.params.exceptionDetails.text);
  }
  if (data.method === "Log.entryAdded" && data.params.entry.level === "error") {
    errors.push(data.params.entry.text);
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

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.result?.exceptionDetails) {
    throw new Error(JSON.stringify(result.result.exceptionDetails, null, 2));
  }
  return result.result?.result?.value;
}

async function waitFor(expression, label, timeout = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const bodyText = await evaluate("document.body?.innerText ?? ''");
  throw new Error(`等待超时：${label}\n${bodyText.slice(0, 1200)}\n日志：\n${errors.join("\n")}`);
}

async function clickText(text) {
  const point = await evaluate(`
    (() => {
      const button = [...document.querySelectorAll('button, [role="button"]')]
        .find((item) => item.innerText.includes(${JSON.stringify(text)}));
      if (!button) return null;
      button.scrollIntoView({ block: 'center', inline: 'center' });
      const rect = button.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()
  `);
  if (!point) {
    const clickableText = await evaluate(`
      [...document.querySelectorAll('button, [role="button"], a')]
        .map((item) => item.innerText || item.textContent || item.getAttribute('aria-label') || item.title || item.tagName)
        .join('\\n')
    `);
    const bodyText = await evaluate("document.body?.innerText ?? ''");
    throw new Error(`找不到按钮：${text}\n可点击元素：\n${clickableText}\n页面文字：\n${bodyText.slice(0, 1200)}`);
  }
  await evaluate(`
    [...document.querySelectorAll('button, [role="button"]')]
      .find((item) => item.innerText.includes(${JSON.stringify(text)}))
      ?.click()
  `);
  await new Promise((resolve) => setTimeout(resolve, 100));
}

await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");
await send("Page.setDownloadBehavior", { behavior: "allow", downloadPath });
await send("Page.navigate", { url: fileUrl });
await waitFor("document.body?.innerText.includes('报销工具箱')", "首页加载");

const printed = await send("Page.printToPDF", {
  printBackground: true,
  paperWidth: 8.27,
  paperHeight: 11.69,
});
const testPdfBase64 = printed.result?.data;
if (!testPdfBase64) throw new Error("测试 PDF 生成失败");

await clickText("发票排版");
await waitFor("document.body?.innerText.includes('选择或拖入发票文件')", "进入发票工具");
await new Promise((resolve) => setTimeout(resolve, 500));
await evaluate(`
  (() => {
    const bytes = Uint8Array.from(atob(${JSON.stringify(testPdfBase64)}), (char) => char.charCodeAt(0));
    const file = new File([bytes], '中文发票测试.pdf', { type: 'application/pdf' });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    const label = document.querySelector('label[for="invoice-upload"]');
    label.dispatchEvent(new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: transfer,
    }));
  })()
`);
await waitFor("document.body?.innerText.includes('中文发票测试.pdf') && document.body?.innerText.includes('加印一份')", "发票上传", 20000);
await clickText("加印一份");
await waitFor("document.body?.innerText.includes('已加印一份')", "加印状态");
await clickText("导出为 PDF");
await waitFor("document.body?.innerText.includes('导出完成') || !document.body?.innerText.includes('正在生成 PDF')", "发票导出", 12000);
await waitFor("!document.body?.innerText.includes('导出完成') && !document.body?.innerText.includes('正在')", "发票导出遮罩关闭", 5000);

await clickText("打开付款截图排版");
await waitFor("document.body?.innerText.includes('选择或拖入付款截图')", "进入截图工具");
await new Promise((resolve) => setTimeout(resolve, 500));
await evaluate(`
  new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1400;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1c1b18';
    ctx.font = '48px sans-serif';
    ctx.fillText('付款截图测试', 80, 140);
    ctx.font = '32px sans-serif';
    ctx.fillText('金额：128.00 元', 80, 220);
    canvas.toBlob((blob) => {
      const file = new File([blob], '付款截图测试.png', { type: 'image/png' });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      const label = document.querySelector('label[for="screenshot-upload"]');
      label.dispatchEvent(new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: transfer,
      }));
      resolve(true);
    }, 'image/png');
  })
`);
await waitFor("document.body?.innerText.includes('付款截图测试.png')", "截图上传");
await clickText("导出为 PDF");
await waitFor("document.body?.innerText.includes('导出完成') || !document.body?.innerText.includes('正在生成 PDF')", "截图导出", 12000);
await waitFor("!document.body?.innerText.includes('导出完成') && !document.body?.innerText.includes('正在')", "截图导出遮罩关闭", 5000);

await clickText("打开发票排版");
await waitFor("document.body?.innerText.includes('中文发票测试.pdf') && document.body?.innerText.includes('已加印一份')", "切回发票后状态保留");

await new Promise((resolve) => setTimeout(resolve, 1200));
const downloads = await readdir(downloadPath);
const pdfs = [];
for (const file of downloads) {
  const fileStat = await stat(`${downloadPath}/${file}`);
  if (file.endsWith(".pdf") && fileStat.size > 0) pdfs.push({ file, size: fileStat.size });
}

const result = {
  invoiceStateKept: true,
  downloads: pdfs,
  errors,
};

ws.close();
console.log(JSON.stringify(result, null, 2));

if (pdfs.length < 2 || errors.length) {
  process.exitCode = 1;
}
