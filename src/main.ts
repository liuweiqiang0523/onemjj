import { fallbackData, type Link, type SiteData, type Tool } from './data';
import './style.css';

type Mode = 'home' | 'weekly' | 'tool';

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
  const title = mode === 'weekly'
    ? 'OneMJJ 小报｜工具、脚本与 MJJ 生存手册'
    : mode === 'tool'
      ? `${selected.name}｜OneMJJ`
      : 'OneMJJ｜一个 MJJ 的低维护自救中心';
  const description = mode === 'weekly'
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
      <div class="actions"><a class="primary-link" href="#tools">开始使用</a><a class="ghost-link" href="/weekly/" data-route>看 MJJ 小报</a></div>
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
  <section id="scripts" class="scripts glass">
    <div><span class="eyebrow">Scripts</span><h2>脚本速查</h2><p>只负责复制，不会自动执行。运行前请先查看来源并读懂命令。</p></div>
    <div class="script-list">${renderScripts()}</div>
  </section>`;
}

function renderWeekly() {
  return `<section class="weekly">
    <header><div><span class="issue-label">ONE MJJ WEEKLY</span><h1>OneMJJ 小报</h1><p>一个 MJJ 的赛博杂物间：工具、脚本、行情和生存手册。</p></div><code>ISSUE 001<br/><time datetime="2026-07-11">2026.07.11</time></code></header>
    <article class="headline"><span>本期头条</span><h2>这不是导航站，是一份买鸡后的自救报纸。</h2><p>首页保留工具箱效率，小报负责沉淀 MJJ 笔记、促销观察、踩坑记录和低维护经验。每一期都有固定地址，可以收藏，也可以直接分享。</p></article>
    <div class="grid tools-grid paper">${siteData.tools.slice(0, 8).map(toolCard).join('')}</div>
    <div class="notes">${siteData.notes.map(note => `<article><span>${escapeHtml(note.tag)}</span><h3>${escapeHtml(note.title)}</h3><p>${escapeHtml(note.body)}</p></article>`).join('')}</div>
  </section>`;
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
  app.innerHTML = `<nav class="top" aria-label="主导航"><a class="brand" href="/" data-route>OneMJJ</a><div>${navLink('/', '首页', mode === 'home' || mode === 'tool')}<a class="nav-admin" href="/admin/" rel="nofollow">控制台</a>${navLink('/weekly/', '小报', mode === 'weekly')}</div></nav><main>${mode === 'home' ? renderHome() : mode === 'weekly' ? renderWeekly() : renderTool()}</main><footer>OneMJJ · 少踩坑，多留传家宝 · Public tools first.</footer>`;
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
