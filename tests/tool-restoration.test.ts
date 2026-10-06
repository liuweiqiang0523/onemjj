import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import guides from '../src/tool-guides.json';
import { onRequest } from '../functions/[[path]].ts';
const read = (p: string) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const data = JSON.parse(read('src/default-data.json'));
const posts = JSON.parse(read('public/data/posts.json'));
async function page(path: string) {
 const env = { ONEMJJ_CONFIG: { get: async () => JSON.stringify(data) }, ASSETS: { fetch: async (url: URL) => new Response(url.pathname === '/index.html' ? read('index.html') : url.pathname === '/data/posts.json' ? JSON.stringify(posts) : JSON.stringify(data)) } };
 return (await onRequest({ request: new Request('https://onemjj.com' + path), env, next: async () => new Response('static') })).text();
}
const esc = (s: string) => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
test('every tool preserves all recovered original guidance in crawler HTML', async () => {
 assert.deepEqual(Object.keys(guides).sort(), data.tools.map((t: any) => t.id).sort());
 for (const [id, guide] of Object.entries(guides)) {
  const html = await page('/tools/' + id + '/');
  for (const label of ['我会怎么用','推荐顺序','结果怎么看','常见坑','安全提醒','维护者备注']) assert.ok(html.includes(label), id + ': ' + label);
  for (const text of [guide.audience, ...guide.workflow, ...guide.reading, ...guide.pitfalls, ...guide.safety, guide.maintainer]) assert.ok(html.includes(esc(text)), id + ': ' + text);
 }
});
test('SSR serves evidence, feedback, TOC and original date for all content', async () => {
 for (const tool of data.tools) {
  const html=await page('/tools/'+tool.id+'/');
  for(const text of ['核验信息','适用环境','费用','unknown','内容反馈','mailto:liuweiqiang0523@gmail.com']) assert.ok(html.includes(text),tool.id+': '+text);
 }
 for(const post of [...posts,{slug:'saferelay-telegram-private-chat-bot',date:'2026-07-26'}]) {
  const html=await page('/blog/'+post.slug+'/');
  assert.ok(html.includes('首次发布'));assert.ok(html.includes(post.date));assert.ok(html.includes('实质更新'));assert.ok(html.includes('适用版本'));assert.ok(html.includes('aria-label="本页目录"'));
 }
});
test('server HTML has route-specific title and canonical without running JavaScript', async () => {
 for (const [path,title] of [['/','OneMJJ｜一个 MJJ 的低维护自救中心'],['/weekly/','OneMJJ 小报｜工具、脚本与 MJJ 生存手册'],['/tools/ai-api/','AI & API｜OneMJJ'],['/blog/','文章归档｜OneMJJ'],['/about/','关于本站｜OneMJJ'], ...posts.map((p: any) => ['/blog/'+p.slug+'/',p.title+'｜OneMJJ'])]) {
  const html = await page(path);
  assert.ok(html.includes('<title>'+esc(title)+'</title>'),path);
  assert.ok(html.includes('<link rel="canonical" href="https://onemjj.com'+path+'"'),path);
  assert.ok(html.includes('property="og:title" content="'+esc(title)+'"'),path);
  assert.ok(html.includes('property="og:url" content="https://onemjj.com'+path+'"'),path);
 }
});
