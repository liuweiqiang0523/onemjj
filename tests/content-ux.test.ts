import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { refreshPublicContent } from '../src/content-refresh.ts';
import { onRequestPost } from '../functions/api/admin.ts';
import { onRequestGet } from '../functions/api/data.ts';
test('unknown routes remain real 404 and admin session remains protected', async () => {
 for (const path of ['/unknown-content-check/', '/tools/not-real/', '/blog/not-real/', '/api/not-real']) assert.equal((await page(path)).status, 404);
 const r = await onRequestPost({ request: new Request('https://onemjj.com/api/admin', { method: 'POST', headers: {'x-onemjj-admin':'1', 'content-type':'application/json'}, body: JSON.stringify({action:'session'}) }), env: {ADMIN_SESSION_SECRET:'test-only',ADMIN_PASSWORD:'test-only'} });
 assert.equal(r.status,401);
});
import { onRequest } from '../functions/[[path]].ts';
test('KV copy migration is shared by API and crawler and preserves unrelated content', async () => {
 const old = structuredClone(data);
 old.tools.find((t: any) => t.id === 'ai-api').commands[0] = 'curl -s https://api.openai.com/v1/models';
 const expected = refreshPublicContent(old);
 assert.deepEqual(refreshPublicContent(expected), expected);
 assert.deepEqual(expected.tools.find((t: any) => t.id === 'media'), old.tools.find((t: any) => t.id === 'media'));
 const env = { ONEMJJ_CONFIG: { get: async () => JSON.stringify(old) }, ASSETS: { fetch: async (url: URL) => new Response(url.pathname === '/index.html' ? '<div id="app"></div>' : '[]') } };
 const response = await onRequestGet({ env, request: new Request('https://onemjj.com/api/data') });
 assert.deepEqual(await response.json(), expected);
 const html = await (await onRequest({ env, request: new Request('https://onemjj.com/tools/ai-api/'), next: async () => new Response('static') })).text();
 assert.ok(html.includes('getpass'));
 assert.ok(!html.includes('curl -s https://api.openai.com/v1/models'));
});
const read = (p: string) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const data = JSON.parse(read('src/default-data.json'));
test('AI model example authenticates without a literal key or key-bearing argv', () => {
 const ai = data.tools.find((t: any) => t.id === 'ai-api');
 assert.ok(!ai.desc.includes('Sub2API'));
 const cmd = ai.commands[0];
 assert.ok(cmd.includes('getpass'));
 assert.ok(cmd.includes('Authorization'));
 assert.ok(cmd.includes('Bearer '));
 assert.ok(!cmd.includes('sk-'));
 assert.deepEqual(data, JSON.parse(read('public/data/default-data.json')));
});
test('historical weekly dates and risks are explicit in client and crawler', async () => {
 const html = await (await page('/weekly/')).text();
 assert.ok(html.includes('原发布日期记录为 2026-08-06'));
 assert.ok(html.includes('2026-10-06'));
 assert.ok(html.includes('2026-08-31'));
 assert.ok(!html.includes('活不过一个扫描周期'));
 assert.ok(!html.includes('没有异地备份的数据等于没有数据'));
 assert.ok(read('src/main.ts').includes('本次仅修正文案'));
});
test('desktop catalogue is three columns and homepage does not imply real-time health', () => {
 assert.ok(read('src/style.css').includes('.tools-grid{grid-template-columns:repeat(3,minmax(0,1fr))}'));
 const client = read('src/main.ts');
 assert.ok(client.includes('本站提供什么'));
 assert.ok(!client.includes('onemjj.com 正常在线'));
 assert.ok(client.includes('精选实战'));
});
test('TeleDeck preserves historical figures and separates verified maintenance note', async () => {
 const p = posts.find((p: any) => p.slug === 'teledeck-one-session-one-runtime');
 assert.ok(p.content.includes('历史记录：2026 年 7 月'));
 assert.ok(p.content.includes('160 项测试'));
 assert.ok(p.content.includes('十个'));
 assert.ok(p.content.includes('2026-10-05'));
 assert.ok(p.content.includes('0.7.15'));
 assert.ok(p.content.includes('312'));
 const html = await (await page('/blog/' + p.slug + '/')).text();
 assert.ok(html.includes('0.7.15'));
});
const posts = JSON.parse(read('public/data/posts.json'));
async function page(path = '/') {
 const env = { ONEMJJ_CONFIG: { get: async () => JSON.stringify(data) }, ASSETS: { fetch: async (url: URL) => new Response(url.pathname === '/index.html' ? '<div id="app"></div>' : url.pathname === '/data/posts.json' ? JSON.stringify(posts) : JSON.stringify(data)) } };
 return onRequest({ request: new Request('https://onemjj.com' + path), env, next: async () => new Response('static') });
}
test('client and crawler footer explain ownership, commands, privacy and admin', async () => {
 const client = read('src/main.ts'); const html = await (await page()).text();
 for (const text of [client, html]) {
  assert.ok(text.includes('OneMJJ · VPS、自托管与 AI 工具的实测笔记。少踩坑，多留传家宝。'));
  assert.ok(text.includes('部分工具由第三方运营'));
  assert.ok(text.includes('不会自动执行'));
  assert.ok(text.includes('站长后台'));
  assert.ok(!text.includes('Public tools first.'));
 }
 assert.ok(!client.includes('>控制台</a>'));
});
