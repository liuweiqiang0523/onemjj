import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import {onRequestPost} from '../functions/api/admin.ts';
import {onRequestGet} from '../functions/api/data.ts';
import {onRequest} from '../functions/[[path]].ts';
import {safePublicData} from '../src/public-data.ts';
test('API SSR and client agree on corrupted KV fallback and exact legacy migration',async()=>{
 const original=JSON.parse(readFileSync(new URL('../src/command-migrations.json',import.meta.url),'utf8'));
 for(const stored of ['{broken',JSON.stringify({...data,weeklyArchives:[{...data.weekly,date:42}]}),JSON.stringify({...data,tools:data.tools.map((t:any)=>t.id==='media'?{...t,commands:['docker compose logs --tail=80 <service>','echo custom'],body:Object.keys(original.bodies).find(k=>k.startsWith('媒体自动化'))}:t)})]){
 const env={ONEMJJ_CONFIG:{get:async()=>stored},ASSETS:{fetch:async(url:URL)=>new Response(url.pathname==='/index.html'?'<div id="app"></div>':url.pathname==='/data/posts.json'?'[]':JSON.stringify(data))}};
 const api=await (await onRequestGet({env,request:new Request('https://onemjj.com/api/data')})).json();
 const client=safePublicData(JSON.parse(JSON.stringify(api)));
 assert.deepEqual(client,api);assert.equal(api.weeklyArchives[0].date,'2026-08-06');
 const html=await (await onRequest({env,request:new Request('https://onemjj.com/tools/media/'),next:async()=>new Response('static')})).text();
 assert.ok(html.includes('SERVICE=emby'));assert.ok(!html.includes('&lt;service&gt;'));
 }
});
import {refreshPublicContent} from '../src/content-refresh.ts';
import {spawnSync} from 'node:child_process';
test('all command cards parse safely and migrations preserve custom commands and dates',()=>{
 const old=structuredClone(data); old.tools[4].commands[1]='docker compose logs --tail=80 <service>';
 old.tools[6].commands[0]='docker compose pull && docker compose up -d';
 old.tools[4].commands.push('echo custom');
 old.weeklyArchives[0].tools[4].commands[1]='docker compose logs --tail=80 <service>';
 const migrated=refreshPublicContent(old);
 assert.equal(migrated.tools[4].commands[1],'SERVICE=emby\ndocker compose logs --tail=80 "$SERVICE"');
 assert.equal(migrated.tools[6].commands[0],'docker compose ps && docker compose images');
 assert.equal(migrated.tools[4].commands.at(-1),'echo custom');
 assert.equal(migrated.weeklyArchives[0].tools[4].commands[1],migrated.tools[4].commands[1]);
 assert.equal(migrated.weeklyArchives[0].date,old.weeklyArchives[0].date);
 for(const cmd of [...data.tools.flatMap((t:any)=>t.commands??[]),...data.scripts.map((s:any)=>s.cmd)]) assert.equal(spawnSync('/bin/bash',['-n'],{input:cmd}).status,0,cmd);
});
test('credential example rejects non-TTY and never follows redirects',()=>{
 const cmd=data.tools.find((t:any)=>t.id==='ai-api').commands[0];
 assert.ok(cmd.includes('isatty')); assert.ok(cmd.includes('HTTPRedirectHandler')); assert.ok(cmd.includes('GetPassWarning'));
 const r=spawnSync('/bin/bash',['-c',cmd],{input:'TEST-ONLY-KEY\n',encoding:'utf8'});
 assert.notEqual(r.status,0); assert.ok(!r.stdout.includes('TEST-ONLY-KEY')); assert.ok(!r.stderr.includes('TEST-ONLY-KEY'));
});
test('article safety corrections retain publication dates and label review boundaries',()=>{
 const posts=JSON.parse(readFileSync(new URL('../public/data/posts.json',import.meta.url),'utf8'));
 for(const p of posts) assert.ok(p.content.includes('2026-10-07'),p.slug);
 for(const slug of ['codex-app-provider-switching','hermes-multi-provider-routing']){
 const p=posts.find((p:any)=>p.slug===slug); assert.equal(p.date,'2026-07-24');
 assert.ok(!p.content.includes('Authorization: Bearer ***')); assert.ok(p.content.includes('Interactive TTY required'));
 }
 const c=posts.find((p:any)=>p.slug==='codex-app-provider-switching').content;
 assert.ok(!c.includes('network_access = "enabled"')); assert.ok(c.includes('network_access = false'));
 assert.ok(!c.includes('chmod 600 ~/.codex/profiles/*')); assert.ok(c.includes('不提供可执行切换器'));
});
const data=JSON.parse(readFileSync(new URL('../src/default-data.json',import.meta.url),'utf8'));
test('admin rejects malformed weekly structures without writing KV',async()=>{
 const payload=Buffer.from(JSON.stringify({username:'test',expires:Math.floor(Date.now()/1000)+60})).toString('base64url');
 const sig=createHmac('sha256','test-secret').update(payload).digest('base64url');
 for(const patch of [{tools:null},{notes:null},{date:42},{date:'2026-02-30'},{issue:'../../bad'},{sections:[{title:'ok',body:42}]},{sections:Array(41).fill({title:'ok',body:'ok'})},{headlineBody:'x'.repeat(10001)}]){
 let writes=0; const edited=structuredClone(data); Object.assign(edited.weekly,patch);
 const env={ADMIN_SESSION_SECRET:'test-secret',ADMIN_PASSWORD:'test-only',ONEMJJ_CONFIG:{put:async()=>{writes++}}};
 const r=await onRequestPost({env,request:new Request('https://onemjj.com/api/admin',{method:'POST',headers:{'x-onemjj-admin':'1',cookie:'__Host-onemjj_admin='+payload+'.'+sig},body:JSON.stringify({action:'save',data:edited})})});
 assert.equal(r.status,400,JSON.stringify(patch).slice(0,80)); assert.equal(writes,0);
 }
});
test('API rejects malformed KV JSON and schema, falls back to safe defaults',async()=>{
 for(const stored of ['{invalid',JSON.stringify({...data,weekly:{...data.weekly,date:42}})]){
 const r=await onRequestGet({request:new Request('https://onemjj.com/api/data'),env:{ONEMJJ_CONFIG:{get:async()=>stored},ASSETS:{fetch:async()=>new Response(JSON.stringify(data))}}});
 assert.equal(r.status,200); assert.deepEqual(await r.json(),data);
 }
});
