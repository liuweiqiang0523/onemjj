import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('decision routes respect audience, client, OS limits and offer actionable guidance', async () => {
 const mod = await import('../src/solutions.ts');
 assert.equal(typeof mod.recommend, 'function', 'decision engine missing');
 const base = { goal: 'remote', device: 'windows', audience: 'family', client: 'yes', edition: 'home' } as const;
 assert.match(mod.recommend(base).title, /RustDesk/);
 assert.match(mod.recommend({...base, edition:'pro'}).title, /RDP/);
 assert.match(mod.recommend({...base, device:'mac', edition:undefined}).title, /屏幕共享/);
 assert.match(mod.recommend({...base, device:'linux', edition:undefined, kind:'linux'}).alternative, /VNC/);
 assert.match(mod.recommend(base).alternative, /升级/);
 assert.match(mod.recommend(base).steps.join(' '), /网络入口/);
 assert.match(mod.recommend({...base, client:'no'}).steps.join(' '), /多因素/);
 assert.match(mod.recommend({...base, device:'mac', edition:undefined}).steps.join(' '), /兼容/);
 assert.match(mod.recommend({...base, device:'linux', edition:undefined, kind:'nas'}).title, /后台管理/);
 assert.match(mod.recommend({...base, client:'no'}).title, /Guacamole/);
 assert.match(mod.recommend({...base, audience:'public'}).title, /不开放/);
 const movie=mod.recommend({goal:'movie',device:'mac',audience:'family',client:'yes'});
 assert.match(movie.title, /Emby.*Tailscale/);
 assert.match(movie.alternative, /Plex/);
 assert.ok(movie.docs.some(d=>d.url.startsWith('https://emby.media/')));
 assert.ok(movie.docs.some(d=>d.url.startsWith('https://support.plex.tv/')));
 assert.doesNotMatch(movie.steps.join(' '), /Jellyfin/);
 assert.match(mod.recommend({goal:'movie',device:'mac',audience:'family',client:'no'}).title, /HTTPS/);
 assert.match(mod.recommend({goal:'backup',device:'mac',audience:'family',client:'yes'}).title, /restic/);
 assert.match(mod.recommend({goal:'backup',device:'linux',audience:'public',client:'yes'}).title, /Nextcloud/);
 for (const goal of ['movie','backup','remote'] as const) for(const device of ['mac','windows','linux'] as const) for(const audience of ['family','public'] as const) for(const client of ['yes','no'] as const) {
  const r=mod.recommend({goal,device,audience,client, ...(goal==='remote'&&device==='windows'?{edition:'home' as const}:{}),...(goal==='remote'&&device==='linux'?{kind:'nas' as const}:{})});
  for(const k of ['reason','alternative','steps','checks','risks','docs'] as const) assert.ok(r[k].length);
  assert.ok(r.docs.every(d=>d.url.startsWith('https://')));
 }
});

test('family movie results include a separate Lucky dual-path route without replacing Emby or Tailscale', async () => {
 const {renderResult,recommend}=await import('../src/solutions.ts');
 for(const device of ['mac','windows','linux'] as const) for(const client of ['yes','no'] as const) {
  const s={goal:'movie',device,audience:'family',client} as const;
  const html=renderResult(s);
  assert.match(html, /class="solution-network"/);
  for(const text of ['家里内网直连 + 外网 Lucky HTTPS 反代','家里：','外面：','CGNAT','DDNS','IPv6-only','16601','BasicAuth','续期','自定义服务器 URL','未替你实测','https://lucky666.cn/docs/modules/web/','https://lucky666.cn/docs/install/']) assert.ok(html.includes(text),text);
  assert.equal((html.match(/class="solution-network"/g)||[]).length,1);
  assert.match(recommend(s).title,client==='yes'?/Emby.*Tailscale/:/Emby.*Lucky.*HTTPS/);
 }
 for(const audience of ['public'] as const) for(const client of ['yes','no'] as const) assert.doesNotMatch(renderResult({goal:'movie',device:'mac',audience,client}), /Lucky|solution-network/);
 for(const goal of ['backup','remote'] as const) assert.doesNotMatch(renderResult({goal,device:'mac',audience:'family',client:'yes'}), /Lucky|solution-network/);
});

test('solutions SSR has real content and metadata', async () => {
 const {onRequest}=await import('../functions/[[path]].ts');
 const data=readFileSync(new URL('../src/default-data.json',import.meta.url),'utf8');
 const res=await onRequest({request:new Request('https://onemjj.com/solutions/?goal=remote&device=linux&kind=nas&audience=family&client=no'),env:{ASSETS:{fetch:async(url:URL)=>new Response(url.pathname==='/index.html'?'<title>shell</title><link rel="canonical" href="https://onemjj.com/"><div id="app"></div>':url.pathname==='/data/posts.json'?'[]':data)}},next:async()=>new Response('static')});
 assert.equal(res.status,200);const html=await res.text();
 for(const text of ['自托管方案向导｜OneMJJ','https://onemjj.com/solutions/','NAS 转为后台管理','不会自动执行']) assert.ok(html.includes(text),text);
 assert.ok(res.headers.get('content-security-policy')?.includes('googlesyndication'));
 assert.ok(readFileSync(new URL('../public/sitemap.xml',import.meta.url),'utf8').includes('https://onemjj.com/solutions/'));
});

test('selected movie SSR matches family and public network boundaries without unrelated examples', async () => {
 const {onRequest}=await import('../functions/[[path]].ts');
 const data=readFileSync(new URL('../src/default-data.json',import.meta.url),'utf8');
 for(const audience of ['family','public']) {
  const res=await onRequest({request:new Request(`https://onemjj.com/solutions/?goal=movie&device=mac&audience=${audience}&client=no`),env:{ASSETS:{fetch:async(url:URL)=>new Response(url.pathname==='/index.html'?'<title>shell</title><div id="app"></div>':url.pathname==='/data/posts.json'?'[]':data)}},next:async()=>new Response('static')});
  const html=await res.text();
  assert.equal((html.match(/class="solution-network"/g)||[]).length,audience==='family'?1:0);
  if(audience==='public') assert.doesNotMatch(html,/Lucky/);
 }
});

test('solution choices accept only complete validated enum URLs', async () => {
 assert.ok(existsSync(new URL('../src/solutions.ts', import.meta.url)), 'solution module is not implemented');
 const { parseChoices, solutionPath, renderSolutions } = await import('../src/solutions.ts');
 for(const text of ['三个目标的起点','备份照片和文件','远程控制电脑']) assert.ok(renderSolutions().includes(text),text);
 const valid = { goal: 'movie', device: 'mac', audience: 'family', client: 'yes' } as const;
 assert.deepEqual(parseChoices(new URLSearchParams(solutionPath(valid).split('?')[1])), valid);
 for (const query of ['', 'goal=<script>', 'goal=movie&device=mac&audience=family&client=maybe', 'goal=movie&goal=backup&device=mac&audience=family&client=yes', 'goal=movie&device=mac&audience=family&client=yes&host=private', 'goal=remote&device=windows&audience=family&client=yes']) assert.equal(parseChoices(new URLSearchParams(query)), null, query);
});
