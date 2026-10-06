import https from 'node:https';
import dns from 'node:dns/promises';
import net from 'node:net';
import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
export function isPublicIP(ip) {
 if (net.isIP(ip) === 4) {
  const [a,b] = ip.split('.').map(Number);
  return !(a===0 || a===10 || a===127 || a>=224 || (a===100 && b>=64 && b<=127) || (a===169 && b===254) || (a===172 && b>=16 && b<=31) || (a===192 && [0,2,168].includes(b)) || (a===198 && [18,19,51].includes(b)) || (a===203 && b===0));
 }
 return net.isIP(ip)===6 && /^2[0-9a-f]{3}:/i.test(ip) && !/^2001:(?:db8|0|10|20):/i.test(ip) && !ip.includes('.');
}
export const classify = status => status>=200 && status<300 ? 'reachable' : [404,410].includes(status) ? 'suspected-unavailable' : 'manual-review';
export function collectLinks(value) {
 const found = new Set();
 const walk = v => { if (typeof v==='string') for (const m of v.matchAll(/https?:\/\/[^\s<>"'`\\)\]}]+/g)) found.add(m[0].replace(/[.,;，。；]+$/,'')); else if (v && typeof v==='object') Object.values(v).forEach(walk); };
 walk(value); return [...found].sort();
}
export async function requestPublic(raw, redirects=0) {
 const url = new URL(raw);
 if (url.protocol!=='https:' || url.username || url.password || (url.port && url.port!=='443')) throw new Error('Only public HTTPS on port 443 permitted');
 const hostname=url.hostname.replace(/^\[|\]$/g,'');
 const addresses=net.isIP(hostname) ? [{address:hostname,family:net.isIP(hostname)}] : await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('DNS timeout')),5000);
  dns.lookup(hostname,{all:true}).then(result=>{clearTimeout(timer);resolve(result);},error=>{clearTimeout(timer);reject(error);});
 });
 if (!addresses.length || addresses.some(a=>!isPublicIP(a.address))) throw new Error('SSRF guard: non-public address');
 const target=addresses[0];
 const response=await new Promise((resolve,reject)=>{
  const req=https.get(url,{headers:{'User-Agent':'OneMJJ-Public-Link-Check/1.0','Accept':'text/html,application/json;q=0.9,*/*;q=0.5'},lookup:(_host,opts,cb)=>opts.all?cb(null,[target]):cb(null,target.address,target.family)},res=>{
   const chunks=[];let bytes=0;
   res.on('data',b=>{bytes+=b.length; if(bytes<=512000) chunks.push(b); else {res.destroy(); resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString()});}});
   res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString()}));res.on('error',reject);
  }); const timer=setTimeout(()=>req.destroy(new Error('timeout')),12000); req.on('close',()=>clearTimeout(timer));req.on('error',reject);
 });
 if ([301,302,303,307,308].includes(response.status) && response.headers.location) {
  if(redirects>=4) throw new Error('redirect limit');
  return requestPublic(new URL(response.headers.location,url).href,redirects+1);
 }
 return {...response,finalURL:url.href};
}
async function main() {
 const sources=[]; const sourceErrors=[];
 for(const path of ['src/default-data.json','src/tool-guides.json','public/data/posts.json','public/data/default-data.json','src/legacy-article.ts','src/main.ts','functions/[[path]].ts']) {
  const text=await readFile(path,'utf8');
  const data=path.endsWith('.json')?JSON.parse(text):[...text.matchAll(/href="(https:\/\/[^"$]+)"/g)].map(m=>m[1]);
  sources.push({source:path,data});
 }
 try { const res=await requestPublic('https://onemjj.com/api/data'); if(res.status!==200) throw new Error('HTTP '+res.status); sources.push({source:'https://onemjj.com/api/data',data:JSON.parse(res.body)}); } catch(e) {sourceErrors.push({source:'https://onemjj.com/api/data',error:String(e)});}
 const links=new Map();for(const s of sources) for(const url of collectLinks(s.data)) {if(!links.has(url)) links.set(url,[]);links.get(url).push(s.source);}
 const pending=[...links.entries()];const results=[];
 await Promise.all(Array.from({length:4},async()=>{while(pending.length){const [url,from]=pending.shift(); const checkedAt=new Date().toISOString();try{const r=await requestPublic(url);const challenge=/captcha|verify you are human|just a moment/i.test(r.body);results.push({url,sources:from,checkedAt,status:r.status,finalURL:r.finalURL,result:challenge?'manual-review':classify(r.status),note:challenge?'Possible verification challenge; manual review required':'HTTP read only; not command execution or deployment verification'});}catch(e){results.push({url,sources:from,checkedAt,result:'manual-review',note:String(e)});}}}));
 results.sort((a,b)=>a.url.localeCompare(b.url));
 const report={checkedAt:new Date().toISOString(),scope:'Public HTTPS read only. No credentials, scripts executed, paid APIs or service mutation.',sourceErrors,results};
 await mkdir('reports',{recursive:true});await writeFile('reports/public-links.json',JSON.stringify(report,null,2)+'\n');
 const counts={};for(const r of results)counts[r.result]=(counts[r.result]||0)+1;
 const summary='# Public link check\n\n'+JSON.stringify(counts)+'\n\n'+(sourceErrors.length?'**Current public KV data could not be fetched: coverage incomplete.**\n\n':'Current public /api/data included.\n\n')+'403, challenges, timeouts and guard rejections require manual review. 404/410 are suspected unavailable, not deleted. HTTP success does not prove commands or deployments.\n\n| URL | HTTP | Result |\n|---|---|---|\n'+results.map(r=>`| ${r.url.replaceAll('|','%7C')} | ${r.status||'unknown'} | ${r.result} |`).join('\n');
 await writeFile('reports/public-links.md',summary);if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,summary);console.log(JSON.stringify({counts,total:results.length,sourceErrors}));
 if(sourceErrors.length)process.exitCode=1;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) await main();
