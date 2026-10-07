import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/[[path]].ts';

test('media requests reach static assets without losing Range or MIME', async () => {
 for (const [path,type] of [['lucky-route.mp4','video/mp4'],['lucky-route-poster.jpg','image/jpeg'],['lucky-route.zh-CN.vtt','text/vtt'],['lucky-route.zh-CN.srt','application/x-subrip']]) {
  const request=new Request(`https://onemjj.com/media/${path}`,{headers:{Range:'bytes=0-31'}});
  const asset=new Response('asset',{status:206,headers:{'Content-Type':type,'Content-Range':'bytes 0-31/100'}});
  let calls=0;
  const response=await onRequest({request,env:{ASSETS:{fetch:async()=>new Response('404')}},next:async()=>{calls++;assert.equal(request.headers.get('range'),'bytes=0-31');return asset;}});
  assert.equal(calls,1);assert.equal(response,asset);assert.equal(response.status,206);assert.equal(response.headers.get('content-type'),type);
 }
});
