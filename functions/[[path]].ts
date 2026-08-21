/**
 * Catch-all: real 404s instead of soft-404 SPA fallback.
 *
 * The client-side app only knows these routes:
 *   /                                  home
 *   /weekly(/ )                         weekly paper
 *   /blog(/ )                           post index
 *   /blog/<slug>(/ )                    articles (slugs from public/data/posts.json)
 *   /tools/<id>(/ )                     tool detail pages (ids come from KV data)
 *   /privacy /about /contact /disclaimer  policy pages
 *   /admin/*                            admin console (static app)
 * Everything else gets a proper 404, with a small matching page.
 *
 * SPA routes are served the app shell explicitly (env.ASSETS.fetch of
 * index.html) so behavior is deterministic and does not depend on the
 * project-level fallback; real static files pass through via next().
 */

import { renderMarkdown } from '../src/markdown';

const articleSlug = 'saferelay-telegram-private-chat-bot';

const SPA_ROUTES = new Set([
  '/',
  '/weekly',
  '/weekly/',
  '/blog',
  '/blog/',
  '/privacy',
  '/privacy/',
  '/about',
  '/about/',
  '/contact',
  '/contact/',
  '/disclaimer',
  '/disclaimer/',
  `/blog/${articleSlug}`,
  `/blog/${articleSlug}/`,
]);

const STATIC_FILES = new Set([
  '/favicon.svg',
  '/favicon.ico',
  '/site.webmanifest',
  '/robots.txt',
  '/sitemap.xml',
  '/ads.txt',
  '/og-cover.png',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/404.html',
  '/404.css',
]);

const STATIC_PREFIXES = ['/assets/', '/data/', '/admin'];

/**
 * Mirrors the /* rules in public/_headers so function-served pages keep the same
 * security posture. Google AdSense origins are allow-listed explicitly: ad script,
 * ad iframes, click-tracking pixels and the ad-traffic-quality beacons all live on
 * separate hosts, so a bare 'self' policy silently blocks every ad slot.
 */
// Cloudflare Pages auto-injects its Web Analytics beacon; without this it is
// CSP-blocked and shows up as a console error on every page load.
const CF_BEACON_HOST = 'https://static.cloudflareinsights.com';

const AD_SCRIPT_HOSTS = [
  CF_BEACON_HOST,
  'https://pagead2.googlesyndication.com',
  'https://googleads.g.doubleclick.net',
  'https://tpc.googlesyndication.com',
  'https://adservice.google.com',
  'https://www.googletagservices.com',
  'https://ep2.adtrafficquality.google',
].join(' ');

const AD_FRAME_HOSTS = [
  'https://googleads.g.doubleclick.net',
  'https://tpc.googlesyndication.com',
  'https://www.google.com',
  'https://ep2.adtrafficquality.google',
].join(' ');

const AD_IMG_HOSTS = [
  'https://pagead2.googlesyndication.com',
  'https://googleads.g.doubleclick.net',
  'https://tpc.googlesyndication.com',
  'https://www.google.com',
  'https://www.gstatic.com',
  'https://ep1.adtrafficquality.google',
].join(' ');

const AD_CONNECT_HOSTS = [
  CF_BEACON_HOST,
  'https://cloudflareinsights.com',
  'https://pagead2.googlesyndication.com',
  'https://googleads.g.doubleclick.net',
  'https://tpc.googlesyndication.com',
  'https://www.google.com',
  'https://adservice.google.com',
  'https://ep1.adtrafficquality.google',
  'https://ep2.adtrafficquality.google',
].join(' ');

const SECURITY_HEADERS: Record<string, string> = {
  'content-security-policy': [
    "default-src 'self'",
    "base-uri 'self'",
    `connect-src 'self' ${AD_CONNECT_HOSTS}`,
    "font-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    `frame-src ${AD_FRAME_HOSTS}`,
    `img-src 'self' data: ${AD_IMG_HOSTS}`,
    "object-src 'none'",
    `script-src 'self' 'unsafe-inline' ${AD_SCRIPT_HOSTS}`,
    "style-src 'self' 'unsafe-inline'",
  ].join('; '),
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
  'x-content-type-options': 'nosniff',
  // AdSense renders ads in iframes on this origin; DENY breaks ad delivery.
  'x-frame-options': 'SAMEORIGIN',
};

let cache = { at: 0, ids: new Set<string>() };
const CACHE_TTL_MS = 30_000;

let postsCache: { at: number; data: any } = { at: 0, data: null };
const POSTS_TTL_MS = 5 * 60_000;

/** Proxy the blog's latest article (server-side; avoids CORS and hides the origin). */
async function latestPost(): Promise<any | null> {
  const now = Date.now();
  if (postsCache.data && now - postsCache.at < POSTS_TTL_MS) return postsCache.data;
  try {
    const res = await fetch('https://blog.onemjj.com/api/posts', {
      headers: { 'User-Agent': 'onemjj-site/1.0', Accept: 'application/json' },
    });
    if (!res.ok) return postsCache.data ?? null;
    const posts: any[] = await res.json();
    if (!Array.isArray(posts) || !posts.length) return postsCache.data ?? null;
    const sorted = [...posts].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    const p = sorted.find((x: any) => x && x.slug && x.title) ?? sorted[0];
    if (!p) return null;
    postsCache = {
      at: now,
      data: {
        title: p.title,
        excerpt: p.excerpt || '',
        url: `https://blog.onemjj.com/posts/${p.slug}`,
        date: (p.createdAt || '').slice(0, 10),
      },
    };
    return postsCache.data;
  } catch {
    return postsCache.data ?? null;
  }
}

let dataCache: { at: number; data: any } = { at: 0, data: null };
const DATA_TTL_MS = 30_000;

/** Full site data (KV first, bundled defaults as fallback) for SEO rendering. */
async function siteData(env: any, url: URL): Promise<any> {
  const now = Date.now();
  if (dataCache.data && now - dataCache.at < DATA_TTL_MS) return dataCache.data;
  let data: any = null;
  try {
    const stored = await env.ONEMJJ_CONFIG?.get('siteData');
    if (stored) data = JSON.parse(stored);
  } catch {
    data = null;
  }
  if (!data || !Array.isArray(data.tools) || !data.tools.length) {
    try {
      const fallback = await env.ASSETS.fetch(new URL('/data/default-data.json', url));
      if (fallback.ok) data = await fallback.json();
    } catch {
      data = null;
    }
  }
  if (data) dataCache = { at: now, data };
  return data ?? { tools: [], scripts: [], notes: [] };
}

let postsCacheStore: { at: number; data: any[] } = { at: 0, data: [] };
const POSTS_CACHE_TTL_MS = 60_000;

/** Synced blog posts, served from the static bundle. */
async function loadPosts(env: any, url: URL): Promise<any[]> {
  const now = Date.now();
  if (postsCacheStore.data.length && now - postsCacheStore.at < POSTS_CACHE_TTL_MS) {
    return postsCacheStore.data;
  }
  try {
    const res = await env.ASSETS.fetch(new URL('/data/posts.json', url));
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        postsCacheStore = { at: now, data };
        return data;
      }
    }
  } catch {
    // Posts are additive; SEO for other routes still works.
  }
  return postsCacheStore.data;
}

async function toolIds(env: any): Promise<Set<string>> {
  const now = Date.now();
  if (cache.ids.size && now - cache.at < CACHE_TTL_MS) return cache.ids;
  const ids = new Set<string>();
  try {
    const stored = await env.ONEMJJ_CONFIG?.get('siteData');
    if (stored) {
      const data = JSON.parse(stored);
      if (Array.isArray(data.tools)) {
        for (const tool of data.tools) {
          if (tool && typeof tool.id === 'string' && tool.id) ids.add(tool.id);
        }
      }
    }
  } catch {
    // fall back to bundled defaults below
  }
  if (!ids.size) {
    try {
      const fallback = await env.ASSETS.fetch(new URL('/data/default-data.json', new URL('https://onemjj.com')));
      if (fallback.ok) {
        const data: any = await fallback.json();
        if (Array.isArray(data.tools)) {
          for (const tool of data.tools) {
            if (tool && typeof tool.id === 'string' && tool.id) ids.add(tool.id);
          }
        }
      }
    } catch {
      // empty set -> unknown /tools/* will 404; next cache fill retries
    }
  }
  cache = { at: now, ids };
  return ids;
}

function json404() {
  return new Response(JSON.stringify({ ok: false, error: 'NOT_FOUND' }), {
    status: 404,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, max-age=0',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex, nofollow, noarchive',
    },
  });
}

const CONTACT_EMAIL = 'liuweiqiang0523@gmail.com';

const CATEGORY_LABELS: Record<string, string> = {
  VPS: 'VPS',
  Network: '网络',
  Selfhosted: '自托管',
  Media: '媒体',
  AI: 'AI',
  Scripts: '脚本',
  Wiki: '笔记',
  Status: '状态页',
};

const esc = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

/** Shared footer so crawler-visible markup mirrors the client-rendered nav. */
function noscriptFooter(): string {
  return `<nav aria-label="站点信息"><a href="/about/">关于本站</a> · <a href="/contact/">联系我们</a> · <a href="/privacy/">隐私政策</a> · <a href="/disclaimer/">免责声明</a></nav>
<p>OneMJJ · 少踩坑，多留传家宝 · Public tools first.</p>`;
}

/**
 * Server-rendered content for crawlers and no-JS visitors.
 *
 * The client app is a SPA whose shell contains no copy at all, so Googlebot,
 * AdSense review and any text-only client previously saw ~7 words. This injects
 * real, indexable content into the shell before it is served: headings, the tool
 * catalogue with descriptions and outbound links, and the legal pages in full.
 * The SPA replaces #app on boot, so this never double-renders for real users.
 */
function seoContent(path: string, data: any, allPosts: any[] = []): string {
  const tools: any[] = Array.isArray(data?.tools) ? data.tools : [];
  const scripts: any[] = Array.isArray(data?.scripts) ? data.scripts : [];
  const notes: any[] = Array.isArray(data?.notes) ? data.notes : [];
  const clean = path.replace(/\/+$/, '') || '/';

  // Full post body, server-rendered so the article text itself is indexable.
  if (clean.startsWith('/blog/')) {
    const slug = decodeURIComponent(clean.slice('/blog/'.length));
    const post = allPosts.find((p: any) => p?.slug === slug);
    if (post) {
      const { html } = renderMarkdown(String(post.content ?? ''));
      const idx = allPosts.findIndex((p: any) => p?.slug === slug);
      const prev = idx > 0 ? allPosts[idx - 1] : null;
      const next = idx >= 0 && idx < allPosts.length - 1 ? allPosts[idx + 1] : null;
      return `<article>
<h1>${esc(post.title)}</h1>
<p>${esc(post.excerpt ?? '')}</p>
<p>${esc(post.category ?? '')} · ${esc(post.date ?? '')} · 约 ${esc(post.readMinutes ?? '')} 分钟阅读${Array.isArray(post.tags) && post.tags.length ? ` · 标签：${post.tags.map((t: string) => esc(t)).join('、')}` : ''}</p>
${html}
<nav aria-label="上下篇">${prev ? `<a href="/blog/${esc(prev.slug)}/">上一篇：${esc(prev.title)}</a> ` : ''}${next ? `<a href="/blog/${esc(next.slug)}/">下一篇：${esc(next.title)}</a>` : ''}</nav>
<p><a href="/blog/">全部文章</a> · <a href="/">返回 OneMJJ 首页</a></p>
</article>
${noscriptFooter()}`;
    }
  }

  if (clean === '/blog') {
    return `<h1>OneMJJ 文章归档</h1>
<p>自托管、Telegram 机器人、Cloudflare 边缘部署和 AI 网关的实战记录。都是自己踩过的坑，不是教程搬运。共 ${allPosts.length} 篇。</p>
${allPosts.length ? `<ul>${allPosts.map((p: any) => `<li><a href="/blog/${esc(p.slug)}/">${esc(p.title)}</a> — ${esc(p.excerpt ?? '')}（${esc(p.date ?? '')}，约 ${esc(p.readMinutes ?? '')} 分钟）</li>`).join('')}</ul>` : ''}
<p><a href="/">返回 OneMJJ 首页</a></p>
${noscriptFooter()}`;
  }

  if (clean === '/privacy') {
    return `<h1>隐私政策</h1>
<p>OneMJJ 是一个个人维护的工具导航站。本页说明本站实际会接触到哪些数据、第三方广告如何使用 Cookie，以及如何关闭个性化广告。</p>
<h2>本站自己收集什么</h2>
<p>OneMJJ 没有注册和登录功能，不要求提供姓名、手机号或身份信息，也没有评论区。本站不会建立访客档案，也不会把访问记录出售或交换给第三方。搜索框输入的关键词只用于浏览器本地过滤，不会发送到服务器。</p>
<h2>服务器与 CDN 日志</h2>
<p>托管服务商 Cloudflare 会在提供服务过程中处理必要技术信息，包括 IP 地址、User-Agent、请求时间和被请求地址，用于流量分发、防御攻击和排查故障。</p>
<h2>Cookie 与本地存储</h2>
<p>本站功能只在必要时使用浏览器本地存储（例如记住深色或浅色偏好），数据保存在你的设备上。但本站展示第三方广告，广告服务商会在浏览器中写入 Cookie 或读取标识符。</p>
<h2>第三方广告（Google AdSense）</h2>
<p>本站使用 Google AdSense 展示广告以覆盖域名和服务器成本。Google 作为第三方广告服务商会使用 Cookie 在本站投放广告，并可能基于你对本站及互联网上其他网站的访问投放广告，也可能使用 DoubleClick DART Cookie 衡量效果与限制重复展示。本站站长无法访问、读取或导出这些 Cookie 中的数据。</p>
<p>你可以通过 <a href="https://www.google.com/settings/ads" rel="noopener noreferrer">Google 广告设置</a> 停用个性化广告，或通过 <a href="https://www.aboutads.info/choices/" rel="noopener noreferrer">aboutads.info</a> 批量退出定向广告，也可以在浏览器中阻止第三方 Cookie。</p>
<h2>外部链接</h2>
<p>本站汇总指向第三方工具的链接。点击后即离开本站，对方网站如何处理数据由其自身隐私政策决定。</p>
<h2>儿童隐私</h2>
<p>本站面向服务器运维与自托管工具的使用者，不面向 13 岁以下儿童，也不会有意收集儿童个人信息。</p>
<h2>你的权利与联系方式</h2>
<p>本站不建立用户账户、不保存可识别到个人的资料。如对数据处理有疑问，可发送邮件至 ${esc(CONTACT_EMAIL)}。</p>
${noscriptFooter()}`;
  }

  if (clean === '/about') {
    const linkCount = tools.reduce((sum, t) => sum + (Array.isArray(t?.links) ? t.links.length : 0), 0);
    return `<h1>关于本站</h1>
<p>OneMJJ 是一个人维护的低维护自救中心：把买过的鸡、踩过的坑、验证过的工具和还能跑的脚本收进一个双端都好用的工具台。</p>
<h2>为什么做这个站</h2>
<p>玩 VPS 和自托管的人多半有同一个问题：常用工具散落在浏览器书签、聊天记录和几十个收藏夹里，换设备就断档，链接挂了也不知道。OneMJJ 只收自己真正用过、并且还能打开的东西：每一条链接都是排障时点过的，每一条命令都是在自己机器上跑过的。</p>
<h2>现在有什么</h2>
<p>共 ${tools.length} 个工具栏目、${linkCount} 条外部链接。栏目按实际排障顺序划分：VPS 检测、三网延迟、网络工具、自托管与访问、PT 与媒体、AI 与 API、常用脚本、MJJ 笔记和状态页。另有 OneMJJ 小报沉淀促销观察、踩坑记录和长期维护经验。</p>
<h2>内容怎么维护</h2>
<p>站点数据存放在 Cloudflare KV，通过受保护的后台控制台维护，改完即时生效、无需重新部署。脚本类内容只提供复制按钮，永远不会自动执行。</p>
<h2>技术栈</h2>
<p>Cloudflare Pages 托管静态资源，Pages Functions 处理路由与真实 404，Cloudflare KV 存储内容，前端为 Vite 加 TypeScript 无框架实现，GitHub Actions 负责推送到 main 自动部署。</p>
<h2>关于站长</h2>
<p>一个折腾服务器、自托管服务和小工具的普通用户，另有一个技术博客记录具体的部署与排障过程。本站运营成本由广告收入部分覆盖，广告不影响工具的收录与排序。</p>
${noscriptFooter()}`;
  }

  if (clean === '/contact') {
    return `<h1>联系我们</h1>
<p>链接挂了、内容写错了、想提个工具，或者有广告与合作相关的事情，都可以直接发邮件。</p>
<h2>电子邮件</h2>
<p><a href="mailto:${esc(CONTACT_EMAIL)}">${esc(CONTACT_EMAIL)}</a></p>
<p>这是本站唯一的官方联系邮箱，由站长本人查看，通常在 1 至 3 个工作日内回复。</p>
<h2>写邮件前请看一眼</h2>
<p>报告失效链接请附上出问题的页面地址和链接名称，并说明大致的网络环境，因为有些工具站会屏蔽特定地区。内容纠错请指出具体是哪一条命令或描述以及正确写法。推荐工具请说明它解决什么问题、你自己用了多久。</p>
<p>本站通过 Google AdSense 展示广告，不接受付费收录、软文、外链买卖和刷量合作。</p>
<h2>关于回复</h2>
<p>这是个人站点，没有客服团队，不提供付费技术支持；但本站内容的问题我会认真处理。</p>
${noscriptFooter()}`;
  }

  if (clean === '/disclaimer') {
    return `<h1>免责声明</h1>
<p>本站汇总的是第三方工具与命令，使用它们的后果由使用者自行承担。</p>
<h2>内容性质</h2>
<p>本站内容仅供技术参考和学习交流，不构成任何专业建议。所有信息按现状提供，不对准确性、时效性或适用性作任何保证。</p>
<h2>外部链接</h2>
<p>本站收录的链接指向独立运营的第三方网站与项目。本站不拥有、不控制、不运营这些服务，链接的存在不代表本站对该服务的背书。</p>
<h2>命令与脚本</h2>
<p>本站脚本速查功能只提供复制按钮，不会自动执行任何命令。命令在你的机器上以你的权限运行，可能修改配置、安装软件、产生费用甚至造成数据丢失。运行前请先读懂并核对来源，重要数据请先备份。因执行本站列出的命令造成的任何损失，本站不承担责任。</p>
<h2>合规使用</h2>
<p>请在所在地法律法规和各服务商服务条款允许的范围内使用本站列出的工具。本站不鼓励也不支持任何违法用途。</p>
<h2>广告内容</h2>
<p>本站通过 Google AdSense 展示广告。广告内容由 Google 及其广告主提供，不经本站审核，也不代表本站立场。</p>
<h2>版权</h2>
<p>本站原创的文字与页面设计版权归站长所有。收录的第三方工具名称、商标与内容归其各自权利人所有。</p>
${noscriptFooter()}`;
  }

  const toolMatch = clean.startsWith('/tools/')
    ? tools.find((t: any) => t?.id === decodeURIComponent(clean.slice('/tools/'.length)))
    : null;

  if (toolMatch) {
    const links: any[] = Array.isArray(toolMatch.links) ? toolMatch.links : [];
    const cmds: string[] = Array.isArray(toolMatch.commands) ? toolMatch.commands : [];
    return `<h1>${esc(toolMatch.name)}</h1>
<p>${esc(toolMatch.desc)}</p>
<p>${esc(toolMatch.body)}</p>
<p>分类：${esc(CATEGORY_LABELS[toolMatch.category] ?? toolMatch.category)}</p>
${links.length ? `<h2>可打开的链接</h2><ul>${links.map((l: any) => `<li><a href="${esc(l.url)}" rel="noopener noreferrer">${esc(l.label)}</a>${l.note ? ` — ${esc(l.note)}` : ''}</li>`).join('')}</ul>` : ''}
${cmds.length ? `<h2>命令速查</h2><ul>${cmds.map((c: string) => `<li><code>${esc(c)}</code></li>`).join('')}</ul><p>命令仅供复制，运行前请核对来源并读懂内容。</p>` : ''}
<p><a href="/">返回 OneMJJ 首页</a></p>
${noscriptFooter()}`;
  }

  if (clean === '/weekly') {
    const w = data?.weekly ?? {};
    return `<h1>OneMJJ 小报</h1>
<p>一个 MJJ 的赛博杂物间：工具、脚本、行情和生存手册。</p>
${w.headlineTitle ? `<h2>${esc(w.headlineTitle)}</h2><p>${esc(w.headlineBody ?? '')}</p>` : ''}
${tools.length ? `<h2>本期工具</h2><ul>${tools.slice(0, 8).map((t: any) => `<li><a href="/tools/${esc(t.id)}/">${esc(t.name)}</a> — ${esc(t.desc)}</li>`).join('')}</ul>` : ''}
${notes.length ? `<h2>MJJ 笔记</h2>${notes.map((n: any) => `<h3>${esc(n.title)}</h3><p>${esc(String(n.body ?? '').split('\n').filter(Boolean).join(' '))}</p>`).join('')}` : ''}
<p><a href="/">返回 OneMJJ 首页</a></p>
${noscriptFooter()}`;
  }

  // Home (and any other shell-served route): full catalogue.
  const byCategory = new Map<string, any[]>();
  for (const tool of tools) {
    const key = String(tool?.category ?? '其他');
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(tool);
  }

  return `<h1>OneMJJ｜一个 MJJ 的低维护自救中心</h1>
<p>VPS 检测、网络排障、自托管、媒体、AI API、常用脚本和传家宝笔记，放进一个双端都舒服的工具台。本站只收录实际使用并验证过的工具，共 ${tools.length} 个栏目。</p>
<h2>工具栏目</h2>
${Array.from(byCategory.entries()).map(([category, items]) => `<h3>${esc(CATEGORY_LABELS[category] ?? category)}</h3><ul>${items.map((t: any) => {
    const links: any[] = Array.isArray(t?.links) ? t.links : [];
    return `<li><a href="/tools/${esc(t.id)}/">${esc(t.name)}</a> — ${esc(t.desc)}。${esc(t.body ?? '')}${links.length ? ` 收录链接：${links.map((l: any) => esc(l.label)).join('、')}。` : ''}</li>`;
  }).join('')}</ul>`).join('')}
${scripts.length ? `<h2>脚本速查</h2><ul>${scripts.map((s: any) => `<li>${esc(s.title)}：<code>${esc(s.cmd)}</code></li>`).join('')}</ul><p>脚本只负责复制，不会自动执行。运行前请先查看来源并读懂命令。</p>` : ''}
${allPosts.length ? `<h2>实战记录</h2><ul>${allPosts.slice(0, 6).map((p: any) => `<li><a href="/blog/${esc(p.slug)}/">${esc(p.title)}</a> — ${esc(p.excerpt ?? '')}</li>`).join('')}</ul><p><a href="/blog/">查看全部 ${allPosts.length} 篇文章</a></p>` : ''}
<h2>OneMJJ 小报</h2>
<p>除了工具台，本站还维护一份 <a href="/weekly/">OneMJJ 小报</a>，沉淀促销观察、踩坑记录和长期维护经验。</p>
${noscriptFooter()}`;
}

/** Inject crawler-visible markup into the SPA shell's #app container. */
function injectSeo(html: string, path: string, data: any, allPosts: any[] = []): string {
  const content = seoContent(path, data, allPosts);
  return html.replace(
    '<div id="app"></div>',
    `<div id="app"><div id="seo-content">${content}</div></div>`,
  );
}

export async function onRequest({ request, env, next }: { request: Request; env: any; next: () => Promise<Response> }) {
  const url = new URL(request.url);
  const path = url.pathname;

  // API endpoints are handled by their own functions.
  if (path === '/api/data' || (path === '/api/admin' && request.method === 'POST')) {
    return next();
  }

  // Latest blog post, proxied server-side from the Monolith blog.
  if (path === '/api/latest-post') {
    const post = await latestPost();
    if (!post) return json404();
    return new Response(JSON.stringify(post), {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=300, s-maxage=300',
        'x-content-type-options': 'nosniff',
      },
    });
  }

  // Client-side routes: serve the app shell.
  let isTool = false;
  if (path.startsWith('/tools/')) {
    const id = decodeURIComponent(path.slice('/tools/'.length).replace(/\/+$/, ''));
    if (id) isTool = (await toolIds(env)).has(id);
  }

  // Synced posts are also SPA routes; unknown slugs must still 404.
  let isPost = false;
  let allPosts: any[] = [];
  if (path.startsWith('/blog/') || path === '/blog' || SPA_ROUTES.has(path) || isTool) {
    allPosts = await loadPosts(env, url);
  }
  if (path.startsWith('/blog/')) {
    const slug = decodeURIComponent(path.slice('/blog/'.length).replace(/\/+$/, ''));
    if (slug) isPost = allPosts.some((p: any) => p?.slug === slug);
  }

  if (SPA_ROUTES.has(path) || isTool || isPost) {
    const shell = await env.ASSETS.fetch(new URL('/index.html', url));
    const html = await shell.text();
    const data = await siteData(env, url);
    return new Response(injectSeo(html, path, data, allPosts), {
      status: shell.status,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=0, must-revalidate',
        ...SECURITY_HEADERS,
      },
    });
  }

  // Real static files.
  if (STATIC_FILES.has(path) || STATIC_PREFIXES.some(prefix => path.startsWith(prefix))) {
    return next();
  }

  // Everything else is a genuine miss.
  if (path.startsWith('/api/')) return json404();

  const page = await env.ASSETS.fetch(new URL('/404.html', url));
  const body = page.ok ? await page.text() : '<!doctype html><title>404 Not Found</title><p>404 Not Found</p>';
  return new Response(body, {
    status: 404,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store, max-age=0',
      ...SECURITY_HEADERS,
      'x-robots-tag': 'noindex, nofollow, noarchive',
    },
  });
}
