import guides from './tool-guides.json';

const escapeHtml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const list = (items: string[], tag = 'ul') => `<${tag}>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</${tag}>`;

/** Recovered verbatim from the production bundle archived on 2026-10-05. */
export function renderToolGuide(id: string): string {
 const guide = guides[id as keyof typeof guides];
 if (!guide) return '';
 return `<section class="tool-guide" aria-label="使用指南">
 <div class="tool-guide-intro"><span class="eyebrow">Original notes</span><h2>我会怎么用</h2><p>${escapeHtml(guide.audience)}</p></div>
 <div class="guide-section"><h3>推荐顺序</h3>${list(guide.workflow, 'ol')}</div>
 <div class="guide-split"><section><h3>结果怎么看</h3>${list(guide.reading)}</section><section><h3>常见坑</h3>${list(guide.pitfalls)}</section></div>
 <div class="guide-section safety"><h3>安全提醒</h3>${list(guide.safety)}</div>
 <p class="maintainer-note"><b>维护者备注：</b>${escapeHtml(guide.maintainer)}</p>
 </section>`;
}
