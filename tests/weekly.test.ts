import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { weeklyForPath } from '../src/weekly.ts';
import { refreshPublicContent } from '../src/content-refresh.ts';

import { onRequest } from '../functions/[[path]].ts';
import { onRequestPost } from '../functions/api/admin.ts';
import { createHmac } from 'node:crypto';
import { onRequestGet } from '../functions/api/data.ts';
test('latest and archived SSR, API and whitelist preserve issue-specific content', async () => {
 const env = { ONEMJJ_CONFIG: { get: async () => JSON.stringify(snapshot) }, ASSETS: { fetch: async (url: URL) => new Response(url.pathname === '/index.html' ? '<title>site</title><link rel="canonical" href="https://onemjj.com/"><div id="app"></div>' : '[]') } };
 const api = await (await onRequestGet({env, request: new Request('https://onemjj.com/api/data')})).json();
 assert.equal(api.weekly.issue, '003');
 for (const [path, issue] of [['/weekly/', '003'], ['/weekly/002/', '002'], ['/weekly/002', '002']]) {
  const r = await onRequest({env, request: new Request('https://onemjj.com'+path), next: async () => new Response('static')});
  assert.equal(r.status, 200);
  const html = await r.text(); assert.ok(html.includes('ISSUE '+issue));
  assert.ok(html.includes('https://onemjj.com'+path.replace(/\/+$/, '')+'/'));
  if (issue === '002') { assert.ok(html.includes(original.headlineBody)); for (const n of notes) assert.ok(html.includes(n.title)); assert.ok(html.includes('2026-08-06')); }
  else { assert.ok(html.includes('/solutions/')); assert.ok(html.includes('CGNAT')); assert.ok(!html.includes('2026-08-31')); }
 }
 for (const path of ['/weekly/999/', '/weekly/003/', '/weekly/002/extra/']) assert.equal((await onRequest({env, request:new Request('https://onemjj.com'+path), next:async()=>new Response('static')})).status,404);
});

test('authenticated admin JSON save retains editable latest sections and archived snapshot', async () => {
 const edited = refreshPublicContent(structuredClone(snapshot));
 edited.weekly.sections[0].body = '后台编辑保存的正文';
 edited.weeklyArchives[0].headlineTitle = '归档勘误';
 let stored = '';
 const payload = Buffer.from(JSON.stringify({username:'test',expires:Math.floor(Date.now()/1000)+60})).toString('base64url');
 const signature = createHmac('sha256','test-session-only').update(payload).digest('base64url');
 const env = {ADMIN_SESSION_SECRET:'test-session-only', ADMIN_PASSWORD:'configured-test-only', ONEMJJ_CONFIG:{put:async (key:string,value:string) => {assert.equal(key,'siteData'); stored=value;},get:async()=>stored}};
 const response = await onRequestPost({env,request:new Request('https://onemjj.com/api/admin',{method:'POST',headers:{'x-onemjj-admin':'1','content-type':'application/json',cookie:'__Host-onemjj_admin='+payload+'.'+signature},body:JSON.stringify({action:'save',data:edited})})});
 assert.equal(response.status,200); assert.deepEqual(JSON.parse(stored),edited);
 const readback = await onRequestGet({env,request:new Request('https://onemjj.com/api/data')});
 assert.deepEqual(await readback.json(),edited);
});
const data = JSON.parse(readFileSync(new URL('../src/default-data.json', import.meta.url), 'utf8'));
const archive = JSON.parse(readFileSync(new URL('../src/weekly-002.json', import.meta.url), 'utf8'));
const { tools, notes, ...original } = archive;
const snapshot = { ...structuredClone(data), weekly: original, tools: [...tools, ...data.tools.slice(8)], notes, weeklyArchives: [] };
test('known KV 002 promotes once, snapshots full original issue and leaves unrelated data alone', () => {
 const updated = refreshPublicContent(snapshot);
 assert.equal(updated.weekly.issue, '003');
 assert.equal(updated.weekly.date, '2026-10-07');
 assert.deepEqual(updated.weeklyArchives[0], { ...original, tools: snapshot.tools.slice(0, 8), notes: snapshot.notes });
 for (const key of ['tools', 'scripts', 'notes', 'heroLinks']) assert.deepEqual(updated[key], snapshot[key]);
 assert.deepEqual(refreshPublicContent(updated), updated);
 updated.weekly.headlineBody = '后台修改后的正文';
 assert.equal(refreshPublicContent(updated).weekly.headlineBody, '后台修改后的正文');
 assert.deepEqual(snapshot.weekly, original);
 const sectionEdit = structuredClone(snapshot); sectionEdit.weekly.sections = [{title:'自定义',body:'编辑正文'}];
 assert.deepEqual(refreshPublicContent(sectionEdit), sectionEdit);
 const custom = structuredClone(snapshot); custom.weekly.headlineTitle = '自定义旧刊';
 assert.deepEqual(refreshPublicContent(custom), custom);
 assert.equal(weeklyForPath(custom, '/weekly/002/')?.headlineTitle, '自定义旧刊');
 assert.deepEqual(weeklyForPath(custom, '/weekly/')?.notes, custom.notes);
 custom.weekly.updated = '2026-10-08';
 assert.deepEqual(refreshPublicContent(custom), custom);
});
