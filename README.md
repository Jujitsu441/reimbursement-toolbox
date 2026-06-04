# 报销工具箱 Cloudflare Pages 部署

这是一个静态 HTML 工具，部署目录为 `public/`。

## 本地预览

```sh
npm run preview
```

## 部署到 Cloudflare Pages

```sh
npm run deploy
```

首次部署时 Wrangler 会要求登录 Cloudflare，并创建/使用名为 `reimbursement-toolbox` 的 Pages 项目。部署成功后访问：

```text
https://reimbursement-toolbox.pages.dev
```

如果在 Codex/非交互式终端中部署，需要先提供 Cloudflare API Token：

```sh
export CLOUDFLARE_API_TOKEN="你的 Cloudflare API Token"
npm run deploy
```

## GitHub 自动部署

仓库推送到 GitHub 后，`.github/workflows/deploy-cloudflare-pages.yml` 会在 `main` 分支更新时自动部署到 Cloudflare Pages 项目：

```text
reimbursement-toolbox
```

需要在 GitHub 仓库的 `Settings` → `Secrets and variables` → `Actions` 中添加两个 Repository secrets：

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

`CLOUDFLARE_API_TOKEN` 建议使用短权限令牌，至少包含：

```text
Cloudflare Pages:Edit
Account Settings:Read
```
