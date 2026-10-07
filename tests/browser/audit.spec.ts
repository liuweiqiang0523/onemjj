import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const data=JSON.parse(readFileSync(new URL('../../src/default-data.json',import.meta.url),'utf8'));
const posts=JSON.parse(readFileSync(new URL('../../public/data/posts.json',import.meta.url),'utf8'));
test('all command and feedback copy buttons round-trip exactly',async({page,context,baseURL})=>{
 await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:baseURL});
 for(const path of ['/',...data.tools.map((t:any)=>'/tools/'+t.id+'/')]){
  await page.goto(path);await expect(page.locator('.site-footer')).toBeVisible();
  const buttons=page.locator('[data-copy]');
  for(let i=0;i<await buttons.count();i++){
   const button=buttons.nth(i);const value=await button.getAttribute('data-copy');
   await button.click();await expect(button).toHaveText('已复制');
   expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(value);
  }
 }
});
test('all article code blocks preserve every copied character on mobile',async({page})=>{
 await page.setViewportSize({width:320,height:900});
 for(const p of posts){
  await page.goto('/blog/'+p.slug+'/');await expect(page.locator('.post-body')).toBeVisible();
  const expected=Array.from(p.content.matchAll(/```[^\n]*\n([\s\S]*?)\n```/g),(m:any)=>m[1]);
  const blocks=page.locator('.post-body pre code');
  await expect(blocks).toHaveCount(expected.length);
  for(let i=0;i<expected.length;i++) expect(await blocks.nth(i).textContent()).toBe(expected[i]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
});
test('client rejects corrupt API data and migrates known old KV commands',async({page})=>{
 await page.route('**/api/data',route=>route.fulfill({json:{...data,weekly:{...data.weekly,date:42}}}));
 await page.goto('/weekly/');await expect(page.locator('.weekly header')).toContainText('ISSUE 003');
 const old=structuredClone(data);old.tools[4].commands[1]='docker compose logs --tail=80 <service>';old.tools[4].commands.push('echo custom');
 await page.unroute('**/api/data');await page.route('**/api/data',route=>route.fulfill({json:old}));
 await page.goto('/tools/media/');
 await expect(page.locator('[data-copy]').filter({hasText:'复制命令'}).nth(1)).toHaveAttribute('data-copy','SERVICE=emby\ndocker compose logs --tail=80 "$SERVICE"');
 expect(await page.locator('[data-copy]').evaluateAll(es=>es.map(e=>e.getAttribute('data-copy')))).toContain('echo custom');
});
