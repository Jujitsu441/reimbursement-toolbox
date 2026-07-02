# 报销工具箱

React + Vite + Tailwind CSS + shadcn/ui 版本。日常交付物仍然是一个可直接双击打开的离线 HTML 文件。

## 日常使用

直接打开：

```text
dist/index.html
```

这个文件由 `vite-plugin-singlefile` 生成，JS 和 CSS 已内联；Vite 配置里设置了 `base: './'`，并关闭了 `public` 目录复制，避免 `file://` 下出现资源路径问题。

## 开发入口

开发时运行：

```sh
pnpm install
pnpm dev
```

Vite 的开发入口是根目录 `index.html`。这个文件服务于开发服务器，不能直接双击当成最终工具使用。

## 修改源码

主要改这里：

```text
src/app/App.tsx
src/features/
src/components/layout/
src/components/shared/
src/lib/
src/index.css
src/components/ui/
```

当前结构：

```text
src/app/               应用状态和顶层路由
src/features/home/     首页
src/features/invoice/  发票排版
src/features/screenshot/ 付款截图排版
src/features/money/    人民币大写
src/features/holiday/  放假安排
src/features/ip/       IP 查询
src/components/layout/ 工具页壳和预览布局
src/components/shared/ 上传区、设置项、文件列表、进度遮罩等通用组件
src/components/ui/     shadcn/ui 组件
src/lib/               PDF、文件、主题、访问量、金额、日期、IP 等纯逻辑
```

主题色、圆角、字体栈在 `src/index.css`；shadcn 组件在 `src/components/ui/`，除非组件本身有类型问题，否则不要直接改。

## 重新生成离线 HTML

```sh
pnpm install
pnpm build:single
```

生成后使用 `dist/index.html`。

## 验证

```sh
pnpm test
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

常规提交前可以运行：

```sh
pnpm check
```

需要完整业务流验证时运行：

```sh
pnpm check:workflow
```

## 可选部署

如果仍需要部署 Cloudflare Pages，建议连接 GitHub 仓库并使用下面的构建配置：

```text
Build command: pnpm build:single
Build output directory: dist
Root directory: /
Production branch: main
Node version: 22
```

线上访问量依赖 Cloudflare Pages Functions 和 KV。后台需要创建一个 KV 命名空间，并在 Pages 项目里绑定变量名：

```text
VISIT_COUNTER
```

绑定后，线上首页会显示累计访问次数；离线打开 `dist/index.html` 时不会请求接口，也不会显示访问量。

仓库里的 `wrangler.toml` 只固化 Pages 项目名、产物目录和兼容日期，不包含任何密钥。手动部署时可以运行：

```sh
pnpm deploy
```
