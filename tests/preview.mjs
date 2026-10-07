import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, extname } from 'node:path';
const types = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.vtt': 'text/vtt', '.srt': 'application/x-subrip' };
createServer((req,res) => {
 const path = new URL(req.url, 'http://localhost').pathname;
 const file = path === '/api/data' ? 'data/default-data.json' : path === '/admin/' ? 'admin/index.html' : ['/assets/', '/data/', '/admin/', '/media/'].some(prefix=>path.startsWith(prefix)) ? path.slice(1) : 'index.html';
 try {
  const body = readFileSync(join('dist',file));
  res.setHeader('Content-Type',types[extname(file)] || 'text/html');
  res.setHeader('Accept-Ranges','bytes');
  let payload=body;
  if(req.headers.range){
   const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
   const start=match?.[1] ? Number(match[1]) : Math.max(0,body.length-Number(match?.[2]));
   const end=match?.[1] && match[2] ? Math.min(Number(match[2]),body.length-1) : body.length-1;
   if(!match || (!match[1]&&!match[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start>=body.length || start>end){
    res.writeHead(416,{'Content-Range':`bytes */${body.length}`});res.end();return;
   }
   payload=body.subarray(start,end+1);
   res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${body.length}`,'Content-Length':payload.length});
  }else{res.setHeader('Content-Length',payload.length);}
  res.end(req.method==='HEAD'?undefined:payload);
 } catch {res.statusCode=404;res.end('Not found');}
}).listen(4173,'127.0.0.1');
