import {readFile,writeFile} from 'node:fs/promises';
const source=new URL('../src/default-data.json',import.meta.url);
const content=await readFile(source,'utf8');
JSON.parse(content);
await writeFile(new URL('../public/data/default-data.json',import.meta.url),content);
