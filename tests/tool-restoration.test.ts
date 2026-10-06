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
test('server HTML has route-specific title and canonical without running JavaScript', async () => {
 for (const [path,title] of [['/','OneMJJ｜一个 MJJ 的低维护自救中心'],['/weekly/','OneMJJ 小报｜工具、脚本与 MJJ 生存手册'],['/tools/ai-api/','AI & API｜OneMJJ'],['/blog/','文章归档｜OneMJJ'],['/about/','关于本站｜OneMJJ'], ...posts.map((p: any) => ['/blog/'+p.slug+'/',p.title+'｜OneMJJ'])]) {
  const html = await page(path);
  assert.ok(html.includes('<title>'+esc(title)+'</title>'),path);
  assert.ok(html.includes('<link rel="canonical" href="https://onemjj.com'+path+'"'),path);
  assert.ok(html.includes('property="og:title" content="'+esc(title)+'"'),path);
  assert.ok(html.includes('property="og:url" content="https://onemjj.com'+path+'"'),path);
 }
});
