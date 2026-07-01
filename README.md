# 报销工具箱

React + Vite + Tailwind CSS + shadcn/ui 版本。日常交付物仍然是一个可直接双击打开的离线 HTML 文件。

## 日常使用

直接打开：

```text
dist/index.html
```

这个文件由 `vite-plugin-singlefile` 生成，JS 和 CSS 已内联；Vite 配置里设置了 `base: './'`，并关闭了 `public` 目录复制，避免 `file://` 下出现资源路径问题。

## 修改源码

主要改这里：

```text
src/App.tsx
src/index.css
src/components/ui/
```

主题色、圆角、字体栈在 `src/index.css`；首页、上传、排版、导出逻辑在 `src/App.tsx`。

## 重新生成离线 HTML

```sh
pnpm install
pnpm build:single
```

生成后使用 `dist/index.html`。

## 验证

```sh
pnpm build:single
node scripts/verify-file-build.mjs
node scripts/verify-workflow.mjs
```

验证脚本需要先启动一个带远程调试端口的 Chrome，例如：

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new \
  --remote-debugging-port=9333 \
  --user-data-dir=/private/tmp/reimb-chrome-codex \
  "about:blank"
```

`verify-file-build.mjs` 检查 `file://` 首屏、非本地请求和控制台错误。`verify-workflow.mjs` 覆盖发票 PDF 拖拽上传、加印、导出、切换到付款截图工具、截图拖拽上传、导出、再切回发票工具确认状态保留。

## 可选部署

如果仍需要部署 Cloudflare Pages，可以把 `dist/index.html` 作为静态产物上传；当前项目的主要交付形态仍是离线单文件。
