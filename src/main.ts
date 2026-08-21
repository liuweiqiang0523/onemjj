import { fallbackData, type Link, type SiteData, type Tool } from './data';
import './style.css';

type Mode = 'home' | 'weekly' | 'tool' | 'article' | 'privacy' | 'about' | 'contact' | 'disclaimer';

const articleSlug = 'saferelay-telegram-private-chat-bot';
const articlePath = `/blog/${articleSlug}/`;
const contactEmail = 'liuweiqiang0523@gmail.com';
const siteUpdated = '2026-08-21';

const app = document.querySelector<HTMLDivElement>('#app')!;
const categoryLabels: Record<string, string> = {
  VPS: 'VPS',
  Network: '网络',
  Selfhosted: '自托管',
  Media: '媒体',
  AI: 'AI',
  Scripts: '脚本',
  Wiki: '笔记',
  Status: '状态页',
};

let siteData: SiteData = fallbackData;
let active = '全部';
let query = '';
let mode: Mode = 'home';
let selected: Tool = siteData.tools[0];

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const safeExternalUrl = (value: string) => {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
};

const toolPath = (tool: Tool) => `/tools/${encodeURIComponent(tool.id)}/`;
const cats = () => ['全部', ...Array.from(new Set(siteData.tools.map(tool => tool.category)))];

function filteredTools() {
  const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN');
  return siteData.tools.filter((tool) => {
    if (active !== '全部' && tool.category !== active) return false;
    if (!normalizedQuery) return true;
    return [tool.name, tool.desc, tool.category, tool.body]
      .some(value => value.toLocaleLowerCase('zh-CN').includes(normalizedQuery));
  });
}

async function loadData() {
  try {
    const response = await fetch('/api/data', { cache: 'no-store' });
    if (response.ok) siteData = await response.json();
  } catch {
    // Keep the bundled data available when the edge configuration is unreachable.
  }
  selected = siteData.tools[0] ?? fallbackData.tools[0];
}

function readRoute() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/weekly') {
    mode = 'weekly';
    return;
  }
  if (path === '/privacy') {
    mode = 'privacy';
    return;
  }
  if (path === '/about') {
    mode = 'about';
    return;
  }
  if (path === '/contact') {
    mode = 'contact';
    return;
  }
  if (path === '/disclaimer') {
    mode = 'disclaimer';
    return;
  }
  if (path === `/blog/${articleSlug}`) {
    mode = 'article';
    return;
  }
  if (path.startsWith('/tools/')) {
    const id = decodeURIComponent(path.slice('/tools/'.length));
    const found = siteData.tools.find(tool => tool.id === id);
    if (found) {
      selected = found;
      mode = 'tool';
      return;
    }
  }
  mode = 'home';
}

const PAGE_META: Record<string, { title: string; description: string }> = {
  privacy: {
    title: '隐私政策｜OneMJJ',
    description: 'OneMJJ 隐私政策：说明本站收集哪些信息、Cookie 与第三方广告（Google AdSense）如何使用数据，以及你可以如何选择退出个性化广告。',
  },
  about: {
    title: '关于本站｜OneMJJ',
    description: '关于 OneMJJ：为什么做这个低维护自救中心、内容如何整理与更新、站点技术栈，以及站长是谁。',
  },
  contact: {
    title: '联系我们｜OneMJJ',
    description: '联系 OneMJJ：报告失效链接、内容纠错、合作与广告相关咨询的联系方式与响应时间。',
  },
  disclaimer: {
    title: '免责声明｜OneMJJ',
    description: 'OneMJJ 免责声明：外部链接、脚本命令、第三方服务与广告内容的责任边界说明。',
  },
};

function updateHead() {
  const staticMeta = PAGE_META[mode];
  const title = staticMeta
    ? staticMeta.title
    : mode === 'article'
    ? '用 SafeRelay 搭一个防骚扰 Telegram 私聊机器人｜OneMJJ'
    : mode === 'weekly'
    ? 'OneMJJ 小报｜工具、脚本与 MJJ 生存手册'
    : mode === 'tool'
      ? `${selected.name}｜OneMJJ`
      : 'OneMJJ｜一个 MJJ 的低维护自救中心';
  const description = staticMeta
    ? staticMeta.description
    : mode === 'article'
    ? 'SafeRelay 实战：用 Cloudflare Workers、KV 和 Turnstile 搭建 Telegram 私聊中转与话题工单机器人，并记录编辑同步与安全加固。'
    : mode === 'weekly'
    ? 'OneMJJ 小报：VPS、网络、自托管、脚本和低维护生存手册。'
    : mode === 'tool'
      ? `${selected.name}：${selected.desc}。${selected.body}`
      : 'OneMJJ，一个 MJJ 的低维护自救中心：VPS 检测、网络工具、自托管、媒体、AI API 与常用脚本。';
  const canonical = new URL(window.location.pathname, window.location.origin).href;

  document.title = title;
  document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', description);
  document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.setAttribute('content', title);
  document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.setAttribute('content', description);
  document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.setAttribute('content', canonical);
  document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')?.setAttribute('content', title);
  document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]')?.setAttribute('content', description);
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', canonical);
}

function toolCard(tool: Tool) {
  return `<a class="tool-card" href="${toolPath(tool)}" data-route>
    <span class="tool-icon" aria-hidden="true">${escapeHtml(tool.icon)}</span>
    <span class="tool-name">${escapeHtml(tool.name)}</span>
    <small>${escapeHtml(tool.desc)}</small>
    ${tool.badge ? `<em>${escapeHtml(tool.badge)}</em>` : ''}
  </a>`;
}

function renderScripts() {
  return siteData.scripts.map(script => {
    const source = script.source ? safeExternalUrl(script.source.url) : '';
    return `<article class="script">
      <b>${escapeHtml(script.title)}</b>
      <code>${escapeHtml(script.cmd)}</code>
      <div>
        <button type="button" data-copy="${escapeHtml(script.cmd)}">复制命令</button>
        ${source ? `<a href="${escapeHtml(source)}" target="_blank" rel="noopener noreferrer">${escapeHtml(script.source?.label ?? '查看来源')} ↗</a>` : ''}
      </div>
    </article>`;
  }).join('');
}

function heroLinks(): Link[] {
  if (siteData.heroLinks?.length) return siteData.heroLinks;
  return [
    { label: '瞎记录のBlog', url: 'https://blog.onemjj.com' },
    siteData.probe ?? { label: '没🐔の探针', url: 'https://tz.onemjj.com' },
  ];
}

function renderHome() {
  const tools = filteredTools();
  return `<section class="hero glass">
    <div>
      <span class="eyebrow">OneMJJ / Low-maintenance survival center</span>
      <h1>一个 MJJ 的低维护自救中心</h1>
      <p>VPS 检测、网络排障、自托管、媒体、AI API、常用脚本和传家宝笔记，放进一个双端都舒服的工具台。</p>
      <div class="actions"><a class="primary-link" href="#tools">开始使用</a><a class="ghost-link" href="/weekly/" data-route>看 MJJ 小报</a>${heroLinks().map(link => `<a class="ghost-link" href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>`).join('')}</div>
    </div>
    <aside class="status-card" aria-label="站点信息">
      <b>站点进度</b>
      <div><span class="dot ok"></span>onemjj.com 正常在线</div>
      <div><span class="dot ok"></span>公开工具与小报可用</div>
      <div><span class="dot ok"></span>内容可在控制台维护</div>
      <code>Cloudflare Pages · Edge</code>
    </aside>
  </section>
  <section class="toolbar" id="tools">
    <label class="search"><span aria-hidden="true">⌕</span><input type="search" value="${escapeHtml(query)}" placeholder="搜索 YABS、回程、Emby、API…" aria-label="搜索工具" data-search /><kbd>⌘ K</kbd></label>
    <div class="chips" aria-label="工具分类">${cats().map(category => `<button type="button" class="chip ${category === active ? 'active' : ''}" data-cat="${escapeHtml(category)}">${escapeHtml(category === '全部' ? category : categoryLabels[category] ?? category)}</button>`).join('')}</div>
  </section>
  ${tools.length ? `<section class="grid tools-grid" aria-live="polite">${tools.map(toolCard).join('')}</section>` : '<section class="empty glass">没有找到匹配的工具，换个关键词试试。</section>'}
  <section class="latest-post glass" id="latest-post">
    <div><span class="eyebrow">Latest post</span><h2>用 SafeRelay 搭一个防骚扰 Telegram 私聊机器人</h2><p>访客只需要私聊 Bot，后台按用户自动分话题；再加上 Turnstile、编辑同步、内容保护和工单状态，做成一个轻量联系入口。</p></div>
    <a class="primary-link" href="${articlePath}" data-route>阅读实战记录 →</a>
  </section>
  <section id="scripts" class="scripts glass">
    <div><span class="eyebrow">Scripts</span><h2>脚本速查</h2><p>只负责复制，不会自动执行。运行前请先查看来源并读懂命令。</p></div>
    <div class="script-list">${renderScripts()}</div>
  </section>`;
}

function renderWeekly() {
  const weekly = siteData.weekly ?? {
    issue: '001',
    date: '2026-07-11',
    headlineTag: '本期头条',
    headlineTitle: '这不是导航站，是一份买鸡后的自救报纸。',
    headlineBody: '首页保留工具箱效率，小报负责沉淀 MJJ 笔记、促销观察、踩坑记录和低维护经验。每一期都有固定地址，可以收藏，也可以直接分享。',
  };
  const displayDate = weekly.date.replaceAll('-', '.');
  return `<section class="weekly">
    <header><div><span class="issue-label">ONE MJJ WEEKLY</span><h1>OneMJJ 小报</h1><p>一个 MJJ 的赛博杂物间：工具、脚本、行情和生存手册。</p></div><code>ISSUE ${escapeHtml(weekly.issue)}<br/><time datetime="${escapeHtml(weekly.date)}">${escapeHtml(displayDate)}</time></code></header>
    <article class="headline"><span>${escapeHtml(weekly.headlineTag)}</span><h2>${escapeHtml(weekly.headlineTitle)}</h2><p>${escapeHtml(weekly.headlineBody)}</p></article>
    <div class="grid tools-grid paper">${siteData.tools.slice(0, 8).map(toolCard).join('')}</div>
    <div class="notes">${siteData.notes.map(note => {
      const paragraphs = note.body.split('\n').map(p => p.trim()).filter(Boolean).map(p => `<p>${escapeHtml(p)}</p>`).join('');
      return `<details class="note-card"><summary><span>${escapeHtml(note.tag)}</span><h3>${escapeHtml(note.title)}</h3></summary><div class="note-body">${paragraphs}</div></details>`;
    }).join('')}</div>
  </section>`;
}

function renderArticle() {
  return `<article class="blog-post glass">
    <a class="back" href="/" data-route>← 返回首页</a>
    <header class="post-header">
      <span class="eyebrow">Telegram · Cloudflare Workers · 实战</span>
      <h1>用 SafeRelay 搭一个防骚扰 Telegram 私聊机器人</h1>
      <p class="post-lead">访客只接触机器人，消息在后台进入独立话题；不用公开个人账号，也不用再养一台 VPS。</p>
      <div class="post-meta"><time datetime="2026-07-26">2026 年 7 月 26 日</time><span>约 8 分钟阅读</span></div>
    </header>

    <section><h2>我为什么要搭这套东西</h2><p>公开 Telegram 用户名很方便，但也等于把私聊入口直接暴露出去。广告、推广、陌生链接和没有上下文的“在吗”会一起挤进个人会话。SafeRelay 的定位很直接：在访客和管理员之间放一个 Bot，先验证、再过滤、最后中转。</p><p>用户端依然只是私聊机器人；管理员端可以选择个人私聊，也可以把每位访客分配到 Telegram 论坛群组中的独立话题。后者更像一个轻量工单箱，图片、文件、编辑记录和回复不会混在一起。</p></section>

    <aside class="post-callout"><b>项目与维护版本</b><a href="https://github.com/qianqi32/SafeRelay" target="_blank" rel="noopener noreferrer">上游：qianqi32/SafeRelay ↗</a><span>个人维护版：<code>liuweiqiang0523/SafeRelay</code>（当前为私有仓库）</span><p>实际部署基于我维护的 <b>SafeRelay Personal Edition</b>。代码、中文与英文 README、中英文部署指南、安全政策、贡献指南、来源说明和维护流程都已独立整理；上游归属与 GPL-3.0 许可仍完整保留。</p></aside>

    <section><h2>最终架构</h2><pre><code>访客
  ↓ 私聊
Telegram Bot
  ↓ Webhook
Cloudflare Worker + KV + Turnstile
  ↓
管理员论坛群组
  └─ 每位访客一个独立话题</code></pre><p>这套架构不需要常驻服务器。Worker 处理 Telegram Webhook 和验证页面，KV 保存验证状态、黑白名单、消息映射、话题映射及工单状态。</p></section>

    <section><h2>我实际启用的功能</h2><ul><li><b>Turnstile 人机验证：</b>新访客先验证，再进入对话。</li><li><b>话题工单模式：</b>每个用户自动创建独立话题。</li><li><b>内容保护：</b>中转消息可限制继续转发和保存。</li><li><b>编辑同步：</b>文字、图片说明、视频说明和文件说明都能处理。</li><li><b>媒体更新保留历史：</b>管理员替换附件时发送新版本，不无痕覆盖用户收到的旧附件。</li><li><b>工单状态：</b>管理员用表情回应更新处理中、等待用户和已完成状态。</li><li><b>广播、黑白名单和自动回复：</b>适合低流量个人联系入口。</li></ul></section>

    <section><h2>编辑同步是最值得修的细节</h2><p>普通文字可以直接调用 Telegram 的编辑接口，但图片、视频和文件不是一回事。原版已经支持文字和 caption 编辑，但用户修改媒体说明时有机会被识别成“无文本内容”；管理员更新媒体本体时，也不能简单把它当成文字覆盖。</p><p>我的处理规则是：</p><ol><li>访客编辑文字或媒体说明：管理员看到的原消息保持不变，Bot 回复一条带 <code>✏️</code> 的更新提示；继续编辑时更新这条提示。</li><li>管理员编辑纯文字：同步编辑用户侧的对应消息。</li><li>管理员替换图片、视频或文件：保留用户侧旧附件，复制发送更新后的新附件，并把后续映射切换到新版本。</li></ol><p>这样不会发生附件被无痕替换，也保留了完整上下文。</p></section>

    <section><h2>部署前做的安全加固</h2><p>能运行不等于适合直接公开。我在部署前补了几处：</p><ul><li><code>/registerWebhook</code> 和 <code>/unRegisterWebhook</code> 增加独立管理密钥，阻止陌生人远程注销 Webhook。</li><li>上游远程欺诈 UID 列表默认关闭，只有显式配置地址才启用。</li><li>联合封禁默认关闭，避免无意中把访客 UID 发送给第三方。</li><li>Turnstile 同时校验 hostname 和 action。</li><li>Bot Token、管理员 UID 和各类密钥全部使用 Cloudflare Secrets，不写进 Git。</li><li>加入 Node 回归测试、Wrangler dry-run 和 GitHub Actions。</li></ul><p>仓库中的 <code>wrangler.toml</code> 现在只是可复用模板，不包含真实 KV ID、群组 ID 或 Worker 生产名称；本机使用被 Git 忽略且权限为 <code>0600</code> 的 <code>wrangler.production.toml</code>，秘密则保存在 <code>.dev.vars</code> 和 Cloudflare Worker Secrets 中。</p></section>

    <section><h2>群组模式还是直接转发到个人私聊</h2><p>对用户来说没有区别，他们永远只是在私聊 Bot。区别只在管理员后台。</p><div class="post-table"><div><b>个人私聊模式</b><span>部署最简单，适合偶尔只有一两条消息，但所有访客内容会混在一个会话里。</span></div><div><b>论坛话题模式</b><span>每位访客一个话题，适合图片、文件、长期沟通和工单状态，也是我最终采用的方式。</span></div></div><p>论坛群组不需要公开，也不需要把访客拉进群。群里只保留管理员和 Bot，把它当作后台收件箱即可。</p></section>

    <section><h2>成本和维护</h2><p>低流量个人使用基本可以放在 Cloudflare 免费额度内。真正需要留意的是 KV 写入：消息映射、话题映射、编辑和表情同步都会产生写操作。它适合个人联系、反馈和轻量客服，不适合直接当作高并发商业工单平台。</p><p>当前部署采用固定审核版本，不自动追随上游 <code>main</code>。个人维护仓库已经按 TeleAutoName 同一套项目风格整理：CI 徽章、中英文 README、中英文部署指南、<code>SECURITY.md</code>、<code>CONTRIBUTING.md</code>、<code>MAINTAINING.md</code>、<code>NOTICE</code> 和 CODEOWNERS 都已补齐。上游更新时先看 diff、跑测试，再决定是否同步。</p></section>

    <section><h2>使用体验</h2><p>部署完成后，访客先看到一段稍微调皮的欢迎语，再完成 Turnstile。验证后的消息会进入对应话题，我可以直接在话题里回复。自动回复用于确认消息已收到，广播功能则可以向所有已验证用户发送维护公告。</p><p>第一天使用下来，核心链路已经稳定：Webhook 没有积压，话题权限正常，内容保护和 Turnstile 已开启。后续重点观察媒体组、连续编辑、KV 写入量以及工单状态在长期会话中的表现。</p></section>

    <section><h2>适合谁</h2><ul><li>需要公开联系入口，但不想暴露个人 Telegram 账号的人。</li><li>想接收反馈、投稿、合作联系或自托管服务故障报告的人。</li><li>希望每位访客独立归档，又不想部署完整客服平台的小团队。</li></ul><p>如果平时只有熟人联系，直接私聊更简单；如果要把 Telegram 放到公开网站上，SafeRelay 这种“先验证再中转”的模式就很实用。</p></section>

    <footer class="post-footer"><b>SafeRelay Personal Edition</b><span><a href="https://github.com/qianqi32/SafeRelay" target="_blank" rel="noopener noreferrer">上游项目 ↗</a> · 个人维护仓库当前为私有</span></footer>
  </article>`;
}

function renderPrivacy() {
  return `<article class="legal-page glass">
    <a class="back" href="/" data-route>← 返回首页</a>
    <header class="legal-header">
      <span class="eyebrow">Privacy</span>
      <h1>隐私政策</h1>
      <p class="legal-lead">OneMJJ 是一个个人维护的工具导航站。这一页说明本站实际会接触到哪些数据、第三方广告如何使用 Cookie，以及你可以怎样关闭个性化广告。</p>
      <p class="legal-updated">最后更新：${escapeHtml(siteUpdated)}</p>
    </header>

    <section><h2>一、本站自己收集什么</h2>
      <p>OneMJJ 没有注册和登录功能，不要求你提供姓名、手机号或身份信息，也没有评论区。站点内容托管在 Cloudflare Pages 上，页面数据通过只读接口读取。</p>
      <p>本站自身<strong>不会</strong>建立访客档案，也不会把访问记录出售或交换给第三方。你在搜索框输入的关键词只用于在浏览器本地过滤工具卡片，不会发送到服务器。</p>
    </section>

    <section><h2>二、服务器与 CDN 日志</h2>
      <p>与所有网站一样，托管服务商 Cloudflare 会在提供服务的过程中处理必要的技术信息，包括 IP 地址、浏览器 User-Agent、请求时间和被请求的地址。这些数据用于流量分发、防御攻击和排查故障，由 Cloudflare 按其自身政策保留。</p>
      <p>相关说明见 <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">Cloudflare 隐私政策 ↗</a>。</p>
    </section>

    <section><h2>三、Cookie 与本地存储</h2>
      <p>本站功能本身只在必要时使用浏览器本地存储（例如记住深色/浅色偏好），这类数据保存在你自己的设备上，不会上传。</p>
      <p>但本站展示第三方广告，广告服务商<strong>会</strong>在你的浏览器中写入 Cookie 或读取标识符。详见下一节。</p>
    </section>

    <section><h2>四、第三方广告（Google AdSense）</h2>
      <p>本站使用 Google AdSense 展示广告，以覆盖域名和服务器成本。关于这项服务，你需要知道：</p>
      <ul>
        <li>Google 作为第三方广告服务商，会使用 Cookie 在本站投放广告。</li>
        <li>Google 使用广告 Cookie，使其及其合作伙伴能够基于你对本站及互联网上其他网站的访问来投放广告。</li>
        <li>Google 可能会使用 <b>DoubleClick DART Cookie</b> 或类似标识符来衡量广告效果并限制同一广告的重复展示。</li>
        <li>本站站长<strong>无法</strong>访问、读取或导出这些 Cookie 中的数据，也无法看到任何单个访客的身份信息。</li>
      </ul>
      <p>你可以随时关闭个性化广告：</p>
      <ul>
        <li>访问 <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">Google 广告设置 ↗</a> 停用个性化广告。</li>
        <li>访问 <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">aboutads.info ↗</a> 批量退出参与厂商的定向广告。</li>
        <li>在浏览器设置中阻止第三方 Cookie，或使用浏览器的隐私模式。</li>
      </ul>
      <p>Google 如何在其合作伙伴网站使用数据，见 <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">Google 广告与隐私说明 ↗</a>。</p>
    </section>

    <section><h2>五、外部链接</h2>
      <p>本站的核心功能是汇总指向第三方工具的链接（测速站、检测工具、开源项目、状态页等）。点击这些链接后，你就离开了 OneMJJ，对方网站如何处理你的数据由其自身隐私政策决定，本站无法控制也不承担责任。建议在使用敏感工具前先阅读对方的政策。</p>
    </section>

    <section><h2>六、儿童隐私</h2>
      <p>本站内容面向服务器运维、自托管和网络工具的使用者，不面向 13 岁以下的儿童，也不会有意收集儿童的个人信息。</p>
    </section>

    <section><h2>七、你的权利与联系方式</h2>
      <p>由于本站不建立用户账户、不保存可识别到个人的资料，通常没有可供导出或删除的个人数据。如果你对本站的数据处理有疑问，或希望反映与广告相关的问题，可以通过 <a href="/contact/" data-route>联系页面</a> 与我沟通。</p>
    </section>

    <section><h2>八、政策更新</h2>
      <p>本政策可能随站点功能或所用第三方服务的变化而更新。更新后会同步修改本页顶部的“最后更新”日期，重大变化会在首页说明。继续使用本站即表示你接受更新后的政策。</p>
    </section>
  </article>`;
}

function renderAbout() {
  const toolCount = siteData.tools.length;
  const linkCount = siteData.tools.reduce((sum, tool) => sum + (tool.links?.length ?? 0), 0);
  const cmdCount = siteData.tools.reduce((sum, tool) => sum + (tool.commands?.length ?? 0), 0);
  return `<article class="legal-page glass">
    <a class="back" href="/" data-route>← 返回首页</a>
    <header class="legal-header">
      <span class="eyebrow">About</span>
      <h1>关于本站</h1>
      <p class="legal-lead">OneMJJ 是一个人维护的“低维护自救中心”：把买过的鸡、踩过的坑、验证过的工具和还能跑的脚本收进一个双端都好用的工具台。</p>
      <p class="legal-updated">最后更新：${escapeHtml(siteUpdated)}</p>
    </header>

    <section><h2>为什么做这个站</h2>
      <p>玩 VPS 和自托管的人多半有同一个问题：常用工具散落在浏览器书签、聊天记录、笔记软件和几十个收藏夹里。换设备就断档，链接挂了也不知道。</p>
      <p>OneMJJ 的目标不是做一个“大而全”的导航站，而是<strong>只收自己真正用过、并且还能打开的东西</strong>。每一条链接都是我自己排障时点过的；每一条命令都是我在自己机器上跑过的。用不上的、失效的、需要注册一堆账号才能看的，都不放进来。</p>
    </section>

    <section><h2>现在有什么</h2>
      <div class="about-stats">
        <div><b>${toolCount}</b><span>工具栏目</span></div>
        <div><b>${linkCount}</b><span>外部链接</span></div>
        <div><b>${cmdCount}</b><span>速查命令</span></div>
      </div>
      <p>栏目按实际排障顺序划分：<b>VPS 检测</b>（买鸡后先看性能和路由）、<b>三网延迟</b>与<b>网络工具</b>（判断是本地、运营商还是目标服务的问题）、<b>自托管与访问</b>、<b>PT 与媒体</b>、<b>AI 与 API</b>、<b>常用脚本</b>、<b>MJJ 笔记</b>和<b>状态页</b>。</p>
      <p>另外还有一份 <a href="/weekly/" data-route>OneMJJ 小报</a>，用来沉淀不适合塞进工具卡片的长内容：促销观察、踩坑记录和长期维护经验。</p>
    </section>

    <section><h2>内容怎么维护</h2>
      <p>站点数据存放在 Cloudflare KV 中，通过一个受保护的后台控制台维护，改完即时生效、无需重新部署。这样做的原因很直接：如果更新一条链接要走一次完整构建，我大概就不会更新了。</p>
      <p>失效链接依靠日常使用发现，也欢迎读者通过<a href="/contact/" data-route>联系页</a>告诉我。脚本类内容只提供复制按钮，<strong>永远不会自动执行</strong>。</p>
    </section>

    <section><h2>技术栈</h2>
      <p>纯静态前端 + 边缘函数，没有传统服务器，也没有数据库：</p>
      <ul>
        <li><b>Cloudflare Pages</b> — 静态资源托管与全球分发</li>
        <li><b>Pages Functions</b> — 路由处理、真实 404、后台接口</li>
        <li><b>Cloudflare KV</b> — 内容存储，后台改完即时生效</li>
        <li><b>Vite + TypeScript</b> — 构建与前端逻辑，无框架依赖</li>
        <li><b>GitHub Actions</b> — 推送到 main 自动部署</li>
      </ul>
      <p>选这套组合的唯一理由是“低维护”：不用打补丁、不用续费服务器、不用半夜起来重启。</p>
    </section>

    <section><h2>关于站长</h2>
      <p>一个折腾服务器、自托管服务和小工具的普通用户。除了这个站，还写<a href="https://blog.onemjj.com" target="_blank" rel="noopener">一个技术博客</a>记录具体的部署与排障过程，也在 GitHub 上维护几个个人分支项目。</p>
      <p>本站运营成本（域名、部分服务）由广告收入部分覆盖。广告不会影响工具的收录与排序——收什么、放在哪，只取决于我自己用不用得上。</p>
    </section>
  </article>`;
}

function renderContact() {
  return `<article class="legal-page glass">
    <a class="back" href="/" data-route>← 返回首页</a>
    <header class="legal-header">
      <span class="eyebrow">Contact</span>
      <h1>联系我们</h1>
      <p class="legal-lead">链接挂了、内容写错了、想提个工具，或者有广告与合作相关的事情，都可以直接发邮件。</p>
      <p class="legal-updated">最后更新：${escapeHtml(siteUpdated)}</p>
    </header>

    <section class="contact-card">
      <h2>电子邮件</h2>
      <p class="contact-email"><a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a></p>
      <p>这是本站唯一的官方联系邮箱，由站长本人查看。通常在 <b>1–3 个工作日</b>内回复；遇到出差或忙碌时可能稍慢，但不会不回。</p>
    </section>

    <section><h2>写邮件前请看一眼</h2>
      <p>为了让我能真正帮上忙，麻烦在邮件里说明这几点：</p>
      <ul>
        <li><b>报告失效链接：</b>请附上出问题的页面地址和那条链接的名称。有些工具站会屏蔽特定地区或对爬虫返回 403，换个网络环境往往就能打开，所以也请说明你大致的网络环境。</li>
        <li><b>内容纠错：</b>请指出具体是哪一条命令或哪一句描述，以及正确的写法。命令类纠错我会在自己机器上复现后再改。</li>
        <li><b>推荐工具：</b>请说明它解决什么问题、你自己用了多久。本站只收实际验证过的工具，所以“看起来不错”的链接我一般不会直接加。</li>
        <li><b>广告与合作：</b>本站通过 Google AdSense 展示广告。<strong>不接受</strong>付费收录、软文、外链买卖和刷量合作——这类邮件恕不回复。</li>
      </ul>
    </section>

    <section><h2>其他去处</h2>
      <ul>
        <li><b>技术博客：</b><a href="https://blog.onemjj.com" target="_blank" rel="noopener">blog.onemjj.com ↗</a> — 具体的部署过程与排障记录</li>
        <li><b>站点状态：</b><a href="/tools/status/" data-route>状态页栏目</a> — 服务可用性自查入口</li>
        <li><b>隐私相关：</b>涉及数据与广告 Cookie 的问题，可先看<a href="/privacy/" data-route>隐私政策</a></li>
      </ul>
    </section>

    <section><h2>关于回复</h2>
      <p>这是个人站点，不是公司，没有客服团队。我不提供付费技术支持，也没法代你排查自己服务器上的具体故障——但如果是本站内容的问题，我会认真处理。</p>
    </section>
  </article>`;
}

function renderDisclaimer() {
  return `<article class="legal-page glass">
    <a class="back" href="/" data-route>← 返回首页</a>
    <header class="legal-header">
      <span class="eyebrow">Disclaimer</span>
      <h1>免责声明</h1>
      <p class="legal-lead">本站汇总的是第三方工具与命令，使用它们的后果由使用者自行承担。这一页把责任边界写清楚。</p>
      <p class="legal-updated">最后更新：${escapeHtml(siteUpdated)}</p>
    </header>

    <section><h2>一、内容性质</h2>
      <p>本站内容仅供技术参考和学习交流，<strong>不构成任何专业建议</strong>。所有信息按“现状”提供，不对其准确性、时效性或适用性作任何明示或默示的保证。工具会更新，服务商会改政策，命令会过时——请在使用前自行验证。</p>
    </section>

    <section><h2>二、外部链接</h2>
      <p>本站收录的链接指向独立运营的第三方网站与项目。本站不拥有、不控制、不运营这些服务，对其内容、可用性、安全性与隐私做法不承担责任。链接的存在<strong>不代表</strong>本站对该服务的背书。</p>
      <p>第三方服务可能随时下线、变更收费方式或调整可用地区。发现失效欢迎<a href="/contact/" data-route>告知</a>。</p>
    </section>

    <section><h2>三、命令与脚本（重要）</h2>
      <p>本站的脚本速查功能<strong>只提供复制按钮，不会自动执行任何命令</strong>。但你需要明白：</p>
      <ul>
        <li>命令在你的机器上以你的权限运行，可能修改配置、安装软件、产生流量费用，甚至造成数据丢失。</li>
        <li><strong>运行前请先读懂它，并核对来源。</strong>尤其是任何形式的 <code>curl ... | sh</code>，务必先把脚本下载下来看一遍再执行。</li>
        <li>请优先在测试环境验证，重要数据请先备份。</li>
        <li>因执行本站列出的命令而造成的任何直接或间接损失，本站不承担责任。</li>
      </ul>
    </section>

    <section><h2>四、合规使用</h2>
      <p>请在所在地法律法规和各服务商的服务条款允许的范围内使用本站列出的工具。涉及网络检测、媒体资源和自托管服务时，使用者应自行确认其行为的合法性。本站不鼓励也不支持任何违法用途。</p>
    </section>

    <section><h2>五、广告内容</h2>
      <p>本站通过 Google AdSense 展示广告。广告内容由 Google 及其广告主提供，<strong>不经本站审核，也不代表本站立场</strong>。本站不对广告中宣传的产品或服务的质量、真实性负责。如果你看到明显违规的广告，欢迎<a href="/contact/" data-route>告知</a>，我会向 Google 反馈。</p>
      <p>广告收入用于覆盖域名与服务成本，不影响工具的收录与排序。</p>
    </section>

    <section><h2>六、可用性</h2>
      <p>本站为个人项目，不承诺持续可用，也不提供服务等级保证。站点可能因维护、服务商故障或其他原因中断。</p>
    </section>

    <section><h2>七、版权</h2>
      <p>本站原创的文字与页面设计版权归站长所有。收录的第三方工具名称、商标与内容归其各自权利人所有，本站仅作索引与说明之用。如认为本站内容侵犯了你的权益，请通过<a href="/contact/" data-route>联系页</a>说明，我会在核实后及时处理。</p>
    </section>
  </article>`;
}

function renderLinks(links: Link[]) {
  const validLinks = links
    .map(link => ({ ...link, safeUrl: safeExternalUrl(link.url) }))
    .filter(link => link.safeUrl);
  if (!validLinks.length) return '<p class="muted">这个栏目暂时没有公开链接。</p>';
  return `<div class="link-list">${validLinks.map(link => `<a href="${escapeHtml(link.safeUrl)}" target="_blank" rel="noopener noreferrer"><b>${escapeHtml(link.label)}</b><small>${escapeHtml(link.note ?? link.safeUrl)}</small><span>打开 ↗</span></a>`).join('')}</div>`;
}

function renderTool() {
  return `<section class="tool-detail glass">
    <a class="back" href="/" data-route>← 返回首页</a>
    <div class="detail-hero"><div><span class="big-icon" aria-hidden="true">${escapeHtml(selected.icon)}</span><h1>${escapeHtml(selected.name)}</h1><p>${escapeHtml(selected.body)}</p></div><aside><span class="eyebrow">${escapeHtml(categoryLabels[selected.category] ?? selected.category)}</span><b>公共工具</b><small>${escapeHtml(selected.desc)}</small></aside></div>
    <div class="detail-grid"><section><h2>可打开的链接</h2>${renderLinks(selected.links)}</section><section><h2>命令速查</h2>${selected.commands?.length ? `<div class="script-list single">${selected.commands.map(command => `<article class="script"><b>运行前请核对</b><code>${escapeHtml(command)}</code><div><button type="button" data-copy="${escapeHtml(command)}">复制命令</button></div></article>`).join('')}</div>` : '<p class="muted">这个栏目暂时没有命令。</p>'}</section></div>
  </section>`;
}

function navLink(path: string, label: string, isActive: boolean) {
  return `<a href="${path}" data-route ${isActive ? 'class="active" aria-current="page"' : ''}>${label}</a>`;
}

const PAGE_RENDERERS: Record<string, () => string> = {
  privacy: renderPrivacy,
  about: renderAbout,
  contact: renderContact,
  disclaimer: renderDisclaimer,
};

function siteFooter() {
  return `<footer class="site-footer">
    <nav class="footer-links" aria-label="站点信息">
      <a href="/about/" data-route>关于本站</a>
      <a href="/contact/" data-route>联系我们</a>
      <a href="/privacy/" data-route>隐私政策</a>
      <a href="/disclaimer/" data-route>免责声明</a>
    </nav>
    <p class="footer-tagline">OneMJJ · 少踩坑，多留传家宝 · Public tools first.</p>
    <p class="footer-note">本站收录的工具由第三方运营，命令请在理解后自行执行。站内展示 Google AdSense 广告。</p>
  </footer>`;
}

function render() {
  updateHead();
  const pageRenderer = PAGE_RENDERERS[mode];
  const content = pageRenderer
    ? pageRenderer()
    : mode === 'home' ? renderHome() : mode === 'weekly' ? renderWeekly() : mode === 'article' ? renderArticle() : renderTool();
  app.innerHTML = `<nav class="top" aria-label="主导航"><a class="brand" href="/" data-route>OneMJJ</a><div>${navLink('/', '首页', mode === 'home' || mode === 'tool')}<a href="${articlePath}" data-route ${mode === 'article' ? 'class="active" aria-current="page"' : ''}>文章</a><a class="nav-admin" href="/admin/" rel="nofollow">控制台</a>${navLink('/weekly/', '小报', mode === 'weekly')}</div></nav><main>${content}</main>${siteFooter()}`;
  bind();
}

function navigate(path: string) {
  if (window.location.pathname !== path) window.history.pushState({}, '', path);
  active = '全部';
  query = '';
  readRoute();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function bind() {
  bindRouteLinks();
  fetchLatestPost();
  document.querySelectorAll<HTMLButtonElement>('[data-cat]').forEach(button => {
    button.addEventListener('click', () => {
      active = button.dataset.cat ?? '全部';
      render();
      document.querySelector('#tools')?.scrollIntoView({ block: 'start' });
    });
  });
  document.querySelector<HTMLInputElement>('[data-search]')?.addEventListener('input', event => {
    query = (event.currentTarget as HTMLInputElement).value;
    const tools = filteredTools();
    const grid = document.querySelector<HTMLElement>('.tools-grid');
    const empty = document.querySelector<HTMLElement>('.empty');
    if (grid) grid.innerHTML = tools.map(toolCard).join('');
    if (!tools.length && !empty) grid?.insertAdjacentHTML('afterend', '<section class="empty glass">没有找到匹配的工具，换个关键词试试。</section>');
    if (tools.length) empty?.remove();
    bindRouteLinks();
  });
  document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach(button => {
    button.addEventListener('click', async () => {
      await navigator.clipboard?.writeText(button.dataset.copy ?? '');
      const old = button.textContent;
      button.textContent = '已复制';
      button.classList.add('copied');
      window.setTimeout(() => { button.textContent = old; button.classList.remove('copied'); }, 1200);
    });
  });
}

function bindRouteLinks() {
  document.querySelectorAll<HTMLAnchorElement>('[data-route]').forEach(link => {
    if (link.dataset.bound) return;
    link.dataset.bound = 'true';
    link.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigate(link.pathname);
    });
  });
}

/** Replace the fallback "Latest post" card with the blog's newest article, if reachable. */
async function fetchLatestPost() {
  const el = document.getElementById('latest-post');
  if (!el || el.dataset.loaded) return;
  try {
    const res = await fetch('/api/latest-post');
    if (!res.ok) return;
    const post = await res.json();
    if (!post?.title) return;
    el.dataset.loaded = 'true';
    const div = el.querySelector('div');
    const a = el.querySelector('a');
    if (div) div.innerHTML = `<span class="eyebrow">Latest post</span><h2>${escapeHtml(post.title)}</h2><p>${escapeHtml(post.excerpt || '')}</p>`;
    if (a) {
      a.href = post.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.removeAttribute('data-route');
      a.textContent = '去博客阅读 →';
    }
  } catch {
    // keep the bundled fallback
  }
}

window.addEventListener('popstate', () => { readRoute(); render(); window.scrollTo({ top: 0 }); });
window.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    if (mode !== 'home') navigate('/');
    window.setTimeout(() => document.querySelector<HTMLInputElement>('[data-search]')?.focus(), 0);
  }
});

loadData().then(() => { readRoute(); render(); });
