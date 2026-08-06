import { fallbackData, type Link, type SiteData, type Tool } from './data';
import './style.css';

type Mode = 'home' | 'weekly' | 'tool' | 'article';

const articleSlug = 'saferelay-telegram-private-chat-bot';
const articlePath = `/blog/${articleSlug}/`;

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

function updateHead() {
  const title = mode === 'article'
    ? '用 SafeRelay 搭一个防骚扰 Telegram 私聊机器人｜OneMJJ'
    : mode === 'weekly'
    ? 'OneMJJ 小报｜工具、脚本与 MJJ 生存手册'
    : mode === 'tool'
      ? `${selected.name}｜OneMJJ`
      : 'OneMJJ｜一个 MJJ 的低维护自救中心';
  const description = mode === 'article'
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

function renderHome() {
  const tools = filteredTools();
  return `<section class="hero glass">
    <div>
      <span class="eyebrow">OneMJJ / Low-maintenance survival center</span>
      <h1>一个 MJJ 的低维护自救中心</h1>
      <p>VPS 检测、网络排障、自托管、媒体、AI API、常用脚本和传家宝笔记，放进一个双端都舒服的工具台。</p>
      <div class="actions"><a class="primary-link" href="#tools">开始使用</a><a class="ghost-link" href="/weekly/" data-route>看 MJJ 小报</a><a class="ghost-link" href="https://blog.onemjj.com" target="_blank" rel="noopener">博客</a><a class="ghost-link" href="https://kk.onemjj.com" target="_blank" rel="noopener">探针</a></div>
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
  <section class="latest-post glass">
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

function render() {
  updateHead();
  const content = mode === 'home' ? renderHome() : mode === 'weekly' ? renderWeekly() : mode === 'article' ? renderArticle() : renderTool();
  app.innerHTML = `<nav class="top" aria-label="主导航"><a class="brand" href="/" data-route>OneMJJ</a><div>${navLink('/', '首页', mode === 'home' || mode === 'tool')}<a href="${articlePath}" data-route ${mode === 'article' ? 'class="active" aria-current="page"' : ''}>文章</a><a class="nav-admin" href="/admin/" rel="nofollow">控制台</a>${navLink('/weekly/', '小报', mode === 'weekly')}</div></nav><main>${content}</main><footer>OneMJJ · 少踩坑，多留传家宝 · Public tools first.</footer>`;
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

window.addEventListener('popstate', () => { readRoute(); render(); window.scrollTo({ top: 0 }); });
window.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    if (mode !== 'home') navigate('/');
    window.setTimeout(() => document.querySelector<HTMLInputElement>('[data-search]')?.focus(), 0);
  }
});

loadData().then(() => { readRoute(); render(); });
