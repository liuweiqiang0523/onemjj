# OneMJJ

一个 MJJ 的低维护自救中心：VPS 检测、网络工具、自托管、媒体、AI API、常用脚本和 MJJ 生存手册。

## 页面结构

- `/`：公开工具箱与脚本速查
- `/weekly/`：可刷新、可分享的小报
- `/tools/:id/`：工具详情页
- `/admin/`：内容管理后台，不参与搜索引擎索引

## 本地开发

```bash
pnpm install
pnpm run dev
```

## 构建

```bash
pnpm run build
```

输出目录为 `dist/`。构建产物包含安全响应头、路由重写、robots、sitemap、favicon 和 Web App Manifest。

## 内容维护

默认内容保存在 `src/default-data.json`，构建时同步发布到 `public/data/default-data.json`。线上后台保存的数据位于 Cloudflare KV 的 `siteData` 键，并优先于默认内容。

- `tools`：首页工具卡片
- `scripts`：脚本速查，可附来源链接
- `notes`：小报内容卡片

后台认证使用短期签名会话 Cookie。生产环境必须配置：

```bash
npx wrangler pages secret put ADMIN_USER --project-name onemjj
npx wrangler pages secret put ADMIN_PASSWORD --project-name onemjj
npx wrangler pages secret put ADMIN_SESSION_SECRET --project-name onemjj
```

建议额外使用 Cloudflare Access 保护 `/admin/*` 和 `/api/admin`。

## 部署

项目通过 Wrangler 直接部署到 Cloudflare Pages 项目 `onemjj`：

```bash
pnpm run build
npx wrangler pages deploy dist --project-name onemjj --branch main
```

生产域名为 `https://onemjj.com`，Pages 默认域名为 `https://onemjj.pages.dev`。
