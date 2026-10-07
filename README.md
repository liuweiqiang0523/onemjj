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

默认内容保存在 `src/default-data.json`，构建时同步发布到 `public/data/default-data.json`。线上后台保存的数据位于 Cloudflare KV 的 `siteData` 键，并优先于默认内容。`pnpm run build` 实际先运行 `scripts/sync-default-data.mjs`，只维护 src 单源，public 是生成镜像；API、SSR 与客户端使用共享 schema/fallback 与精确旧文案迁移，不写回 KV，未知自定义内容和旧刊日期保留。

审校验证：`pnpm test`、`pnpm run typecheck`、`pnpm run test:browser`（需本地预览），以及 Python 3.11+ 的 `python3 scripts/verify-snippets.py`。后者只解析 shell/Python/TOML/JSON/YAML（YAML 使用 Ruby 标准库），凭据程序只离线测拒绝无 TTY 与 redirect，不运行 Docker/安装/模型请求。

构建依赖通过 pnpm overrides 限定安全补丁 PostCSS 8.5.23、nanoid 3.3.18、source-map-js 1.2.2；升级需真实 install、audit 与全套回归，不使用盲目 audit fix。

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

## Lucky 路线视频

`/solutions/` 的家庭观影 Lucky 卡片使用共享 SSR / SPA 渲染，原文字教程与 Emby / Plex / Tailscale 选择逻辑不变。入口为默认折叠的“看视频理解路线”，原生播放器提供 controls、playsinline、preload=none，无自动播放、第三方播放器或新增追踪。公共访客的已选路线不展示家庭 Lucky 卡片或视频。

素材来自站主已确认的 OneMJJ Lucky 白板解说短片 `onemjj-lucky-narrated.mp4`，公开副本为 `public/media/lucky-route.mp4`（30 秒，1080×600，H.264 + AAC，2,147,556 字节，低于 Cloudflare Pages 单文件 25 MiB 限额），未重编码或替换源文件。`lucky-route-poster.jpg` 从其第 29 秒完整路线画面提取；同名中文 SRT 保留确认的字幕，WebVTT 仅转换时间格式供浏览器可选字幕使用。素材只有泛化路径，不含真实 IP、域名、端口或账户。

视频仅解释“家里内网直连 / 外网 HTTPS → Lucky → Emby”的双路径，不是 CGNAT 穿透，也不证明访客入口可达；实际公网、证书、防火墙与账户验收仍以下方教程为准。媒体全部由本站静态提供，现有 CSP `default-src 'self'` 已允许同源媒体，无需放宽策略；不更改 schema 或写入 KV。

## 部署

项目通过 Wrangler 直接部署到 Cloudflare Pages 项目 `onemjj`：

```bash
pnpm run build
npx wrangler pages deploy dist --project-name onemjj --branch main
```

生产域名为 `https://onemjj.com`，Pages 默认域名为 `https://onemjj.pages.dev`。
