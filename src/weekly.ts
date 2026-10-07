import legacy from './weekly-002.json';
import latest from './weekly-003.json';
import type { SiteData, Weekly } from './data';

/** Read-time promotion only: no KV writes, exact known editorial fields, admin 003 edits win. */
export function promoteWeekly<T extends Record<string, any>>(data: T): T {
 const w = data.weekly;
 if (w && !w.sections && !w.tools && !w.notes
  && Object.keys(w).every(key => key in legacy)
  && (!w.updated || w.updated === legacy.updated)
  && (!w.archiveNotice || w.archiveNotice === legacy.archiveNotice)
  && ['issue', 'date', 'headlineTag', 'headlineTitle', 'headlineBody'].every(key => w[key] === (legacy as Record<string, any>)[key])) {
  const archives = data.weeklyArchives ?? [];
  Object.assign(data, {
   weekly: structuredClone(latest),
   weeklyArchives: archives.some((a: Weekly) => a.issue === '002') ? archives : [...archives, { ...structuredClone(w), tools: structuredClone((data.tools ?? []).slice(0, 8)), notes: structuredClone(data.notes ?? []) }],
  });
 }
 return data;
}

export function weeklyForPath(data: SiteData, path: string): Weekly | undefined {
 const clean = path.replace(/\/+$/, '');
 const current = data.weekly;
 const currentPaper = current && !current.sections ? { ...current, tools: current.tools ?? data.tools.slice(0, 8), notes: current.notes ?? data.notes } : current;
 if (clean === '/weekly') return currentPaper;
 if (clean === '/weekly/002') return data.weeklyArchives?.find(w => w.issue === '002') ?? (current?.issue === '002' ? currentPaper : legacy);
 return undefined;
}
export const weeklyTitle = (w: Weekly) => `第${w.issue}期 · ${w.headlineTitle}｜OneMJJ 小报`;
const esc = (v: unknown) => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
export function renderWeeklyPaper(data: SiteData, path: string): string {
 const w = weeklyForPath(data, path);
 if (!w) return '<section class="empty glass"><h1>404 · 小报未找到</h1><a href="/weekly/" data-route>返回最新一期</a></section>';
 const archived = path.replace(/\/+$/, '') === '/weekly/002';
 return `<section class="weekly">
 <header><div><span class="issue-label">ONE MJJ WEEKLY</span><h1>OneMJJ 小报</h1><p>工具、选型与低维护生存手册。</p></div><code>ISSUE ${esc(w.issue)}<br/><time datetime="${esc(w.date)}">${esc(w.date.replaceAll('-', '.'))}</time></code></header>
 ${w.archiveNotice ? `<p class="archive-notice">${esc(w.archiveNotice)}${w.updated ? ` 本次仅修正文案；最后更新：${esc(w.updated)}，未重新实测历史优惠或服务状态。` : ''}</p>` : `<p>本期发布：${esc(w.date)} · 实用选型与验收，不提供实时优惠或行情。</p>`}
 <article class="headline"><span>${esc(w.headlineTag)}</span><h2>${esc(w.headlineTitle)}</h2><p>${esc(w.headlineBody)}</p></article>
 ${w.sections ? `<div class="notes">${w.sections.map(s => `<article class="note-card"><h2>${esc(s.title)}</h2>${s.body.split('\n').filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('')}</article>`).join('')}</div><p><a href="/solutions/" data-route>打开自托管方案向导 →</a></p>` : ''}
 ${w.tools ? `<div class="grid tools-grid paper">${w.tools.map(t => `<a class="tool-card" href="/tools/${encodeURIComponent(t.id)}/" data-route><span class="tool-icon">${esc(t.icon)}</span><span class="tool-name">${esc(t.name)}</span><small>${esc(t.desc)}</small>${t.badge ? `<em>${esc(t.badge)}</em>` : ''}</a>`).join('')}</div>` : ''}
 ${w.notes ? `<div class="notes">${w.notes.map(n => `<details class="note-card"><summary><span>${esc(n.tag)}</span><h3>${esc(n.title)}</h3></summary><div class="note-body">${n.body.split('\n').map(p => p.trim()).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('')}</div></details>`).join('')}</div>` : ''}
 <nav aria-label="小报归档">${archived ? '<a href="/weekly/" data-route>返回最新一期 →</a>' : '<a href="/weekly/002/" data-route>第002期归档 · 2026-08-06 →</a>'} · <a href="/" data-route>返回首页</a></nav>
 </section>`;
}
