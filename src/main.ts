import { fallbackData, type SiteData, type Tool } from './data';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;
let siteData: SiteData = fallbackData;
let active = '全部';
let mode: 'home' | 'command' | 'weekly' | 'tool' = 'home';
let selected: Tool = siteData.tools[0];

async function loadData() {
  try {
    const res = await fetch('/api/data', { cache: 'no-store' });
    if (res.ok) siteData = await res.json();
  } catch {}
  selected = siteData.tools[0] ?? fallbackData.tools[0];
}
const cats = () => ['全部', ...Array.from(new Set(siteData.tools.map(t => t.category)))];
const filteredTools = () => active === '全部' ? siteData.tools : siteData.tools.filter(t => t.category === active);
const escapeAttr = (value: string) => value.replace(/"/g, '&quot;');

function toolCard(t: Tool) {
  return `<button class="tool-card ${t.private ? 'is-private' : ''}" data-tool="${t.id}" data-category="${t.category}"><span class="tool-icon">${t.icon}</span><span class="tool-name">${t.name}</span><small>${t.desc}</small>${t.badge ? `<em>${t.badge}</em>` : ''}</button>`;
}

function renderHome() {
  return `<section class="hero glass"><div><span class="eyebrow">OneMJJ / Low-maintenance survival center</span><h1>一个 MJJ 的低维护自救中心</h1><p>VPS 检测、三网延迟、自托管入口、PT 媒体、AI API、常用脚本和传家宝笔记，放到一个双端都舒服的工具台。</p><div class="actions"><button data-mode="command">进入控制台</button><button class="ghost" data-mode="weekly">看 MJJ 小报</button></div></div><aside class="status-card"><b>今日状态</b><div><span class="dot ok"></span>onemjj.com 已上线</div><div><span class="dot ok"></span>工具数据可在线维护</div><div><span class="dot warn"></span>真实监控待接入</div><code>https://onemjj.com</code></aside></section><section class="toolbar"><button class="search" data-focus-search>⌘K 搜索：YABS、回程、Emby、Sub2API...</button><div class="chips">${cats().map(c=>`<button class="chip ${c===active?'active':''}" data-cat="${c}">${c}</button>`).join('')}</div></section><section class="grid tools-grid">${filteredTools().map(toolCard).join('')}</section><section id="scripts" class="scripts glass"><div><span class="eyebrow">Scripts</span><h2>脚本速查</h2><p>点击脚本卡片会复制命令；危险命令不上自动执行，只做速查。</p></div><div class="script-list">${siteData.scripts.map(s=>`<button class="script" data-copy="${escapeAttr(s.cmd)}"><b>${s.title}</b><code>${s.cmd}</code><span>点击复制</span></button>`).join('')}</div></section>`;
}
function renderCommand() {
  return `<section class="command-layout"><aside class="nav-panel glass"><b>OneMJJ</b>${['Command','VPS','Network','Selfhosted','Scripts','Notes'].map((n,i)=>`<a class="${i===0?'active':''}" data-cat="${n === 'Command' ? '全部' : n}">${n}</a>`).join('')}</aside><main class="console glass"><span class="badge">MJJ Command Center</span><h1>买鸡、测鸡、吃灰、复活。</h1><p>工具卡片都能点开详情；真实三网监控、私有入口后续再接入。</p><div class="grid mini">${filteredTools().slice(0,8).map(toolCard).join('')}</div><pre>$ onemjj check gd-cm\n广东移动 TCP 443: 待接入\n$ onemjj yabs oracle\n点击「VPS 检测」查看脚本</pre></main><aside class="metrics glass"><h3>实时面板</h3>${['onemjj.com Online','Pages OK','后台管理 Enabled','真实监控 Planned','最近冲动消费 0 台'].map(x=>`<div><span>${x.replace(/ [^ ]+$/,'')}</span><b>${x.split(' ').at(-1)}</b></div>`).join('')}</aside></section>`;
}
function renderWeekly() {
  return `<section class="weekly"><header><div><h1>OneMJJ Weekly</h1><p>一个 MJJ 的赛博杂物间：工具、脚本、行情和生存手册。</p></div><code>ISSUE 001<br/>onemjj.com</code></header><article class="headline"><span>今日头条</span><h2>这不是导航站，是一份买鸡后的自救报纸。</h2><p>首页保留工具箱效率，同时加入 MJJ 笔记、促销观察、坑点记录和脚本速查。公开看有内容，自己用也方便。</p></article><div class="grid tools-grid paper">${siteData.tools.slice(0,8).map(toolCard).join('')}</div><div class="notes">${siteData.notes.map(n=>`<article><span>${n.tag}</span><h3>${n.title}</h3><p>${n.body}</p></article>`).join('')}</div></section>`;
}
function renderTool() {
  return `<section class="tool-detail glass"><button class="back" data-mode="home">← 返回首页</button><div class="detail-hero"><div><span class="big-icon">${selected.icon}</span><h1>${selected.name}</h1><p>${selected.body}</p></div><aside><span class="eyebrow">${selected.category}</span><b>${selected.private ? '私人入口占位' : '公共工具'}</b><small>${selected.desc}</small></aside></div><div class="detail-grid"><section><h2>可打开的链接</h2><div class="link-list">${selected.links.map(l=>`<a href="${l.url}" target="_blank" rel="noopener noreferrer"><b>${l.label}</b><small>${l.note ?? l.url}</small><span>打开 ↗</span></a>`).join('')}</div></section><section><h2>命令速查</h2>${selected.commands?.length ? `<div class="script-list single">${selected.commands.map(cmd=>`<button class="script" data-copy="${escapeAttr(cmd)}"><b>复制命令</b><code>${cmd}</code><span>点击复制</span></button>`).join('')}</div>` : '<p class="muted">这个栏目暂时没有命令，后续再补。</p>'}</section></div></section>`;
}
function render() {
  app.innerHTML = `<nav class="top"><a class="brand" data-mode="home">OneMJJ</a><div><button data-mode="home" class="${mode==='home'?'active':''}">首页</button><button data-mode="command" class="${mode==='command'?'active':''}">控制台</button><button data-mode="weekly" class="${mode==='weekly'?'active':''}">小报</button></div></nav><main>${mode==='home'?renderHome():mode==='command'?renderCommand():mode==='weekly'?renderWeekly():renderTool()}</main><footer>OneMJJ · 少踩坑，多留传家宝 · Public tools first, private links later. <a href="/admin/" class="footer-admin">管理</a></footer>`;
  bind();
}
function bind(){
  document.querySelectorAll<HTMLElement>('[data-mode]').forEach(el=>el.onclick=()=>{mode=el.dataset.mode as any; active='全部'; render();});
  document.querySelectorAll<HTMLButtonElement>('[data-cat]').forEach(el=>el.onclick=()=>{active=el.dataset.cat!; if (mode !== 'home' && mode !== 'command') mode='home'; render();});
  document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach(el=>el.onclick=async()=>{await navigator.clipboard?.writeText(el.dataset.copy||''); el.classList.add('copied'); const span=el.querySelector('span'); const old=span?.textContent; if(span) span.textContent='已复制'; setTimeout(()=>{el.classList.remove('copied'); if(span && old) span.textContent=old;},1000);});
  document.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach(el=>el.onclick=()=>{const found=siteData.tools.find(t=>t.id===el.dataset.tool); if(found){selected=found; mode='tool'; render(); window.scrollTo({top:0,behavior:'smooth'});}});
  document.querySelector<HTMLElement>('[data-focus-search]')?.addEventListener('click',()=>{active='全部'; mode='home'; render();});
}
loadData().then(render);
