import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const types = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
createServer((req,res) => {
 const path = new URL(req.url, 'http://localhost').pathname;
 const file = path === '/api/data' ? 'data/default-data.json' : path.startsWith('/assets/') || path.startsWith('/data/') ? path.slice(1) : 'index.html';
 try { const body = readFileSync(join('dist',file)); res.setHeader('Content-Type',types[Object.keys(types).find(ext=>file.endsWith(ext))] || 'text/html'); res.end(body); } catch {res.statusCode=404;res.end('Not found');}
}).listen(4173,'localhost');
