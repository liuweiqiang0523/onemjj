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

test('solutions SSR has real content and metadata', async () => {
 const {onRequest}=await import('../functions/[[path]].ts');
 const data=readFileSync(new URL('../src/default-data.json',import.meta.url),'utf8');
 const res=await onRequest({request:new Request('https://onemjj.com/solutions/?goal=remote&device=linux&kind=nas&audience=family&client=no'),env:{ASSETS:{fetch:async(url:URL)=>new Response(url.pathname==='/index.html'?'<title>shell</title><link rel="canonical" href="https://onemjj.com/"><div id="app"></div>':url.pathname==='/data/posts.json'?'[]':data)}},next:async()=>new Response('static')});
 assert.equal(res.status,200);const html=await res.text();
 for(const text of ['自托管方案向导｜OneMJJ','https://onemjj.com/solutions/','NAS 转为后台管理','备份照片和文件','远程控制电脑','不会自动执行']) assert.ok(html.includes(text),text);
 assert.ok(res.headers.get('content-security-policy')?.includes('googlesyndication'));
 assert.ok(readFileSync(new URL('../public/sitemap.xml',import.meta.url),'utf8').includes('https://onemjj.com/solutions/'));
});

test('solution choices accept only complete validated enum URLs', async () => {
 assert.ok(existsSync(new URL('../src/solutions.ts', import.meta.url)), 'solution module is not implemented');
 const { parseChoices, solutionPath } = await import('../src/solutions.ts');
 const valid = { goal: 'movie', device: 'mac', audience: 'family', client: 'yes' } as const;
 assert.deepEqual(parseChoices(new URLSearchParams(solutionPath(valid).split('?')[1])), valid);
 for (const query of ['', 'goal=<script>', 'goal=movie&device=mac&audience=family&client=maybe', 'goal=movie&goal=backup&device=mac&audience=family&client=yes', 'goal=movie&device=mac&audience=family&client=yes&host=private', 'goal=remote&device=windows&audience=family&client=yes']) assert.equal(parseChoices(new URLSearchParams(query)), null, query);
});
