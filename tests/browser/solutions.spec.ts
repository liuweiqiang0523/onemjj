import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
const shots=process.env.SOLUTIONS_SCREENSHOT_DIR || 'test-results/solutions-screenshots';
for(const width of [1440,390,320]) test(`solution cards, history and real share clipboard at ${width}`,async({page,context,baseURL})=>{
 await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:baseURL});
 await page.setViewportSize({width,height:900});
 await page.goto('/'); await page.getByRole('link',{name:'自托管方案向导',exact:true}).click();
 await expect(page.locator('h1')).toHaveText('你想做什么？');
 for(const value of ['remote','windows','home','family','yes']) await page.locator(`[data-choice="${value}"]`).click();
 await expect(page.locator('.solution-result h2').first()).toHaveText('RustDesk 自建中继与客户端');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'复制方案链接'}).click();
 await expect(page.getByRole('status')).toHaveText('已复制方案链接');
 const link=await page.evaluate(()=>navigator.clipboard.readText());expect(link).toBe(page.url());
 await page.reload();await expect(page.locator('.solution-result')).toContainText('Windows 家庭版');
 await page.getByRole('button',{name:'修改选择'}).click();await page.getByRole('button',{name:'返回上一步'}).click();
 await page.locator('[data-choice="public"]').click();await page.locator('[data-choice="no"]').click();
 await expect(page.locator('.solution-result h2').first()).toHaveText('不开放公共远程控制');
 await page.goBack();await expect(page.locator('[data-choice="yes"]')).toBeVisible();
 await page.getByRole('button',{name:'重新开始'}).click();await expect(page.locator('[data-choice="movie"]')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 if(width!==320){mkdirSync(shots,{recursive:true});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${shots}/cards-${width}.png`,fullPage:true});}
 await page.goto(link);await page.getByRole('button',{name:'复制方案链接'}).click();await expect(page.getByRole('status')).toHaveText('已复制方案链接');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 if(width!==320){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${shots}/result-${width}.png`,fullPage:true});}
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw new Error('denied');}},configurable:true}));
 await page.getByRole('button',{name:'复制方案链接'}).click();await expect(page.getByRole('status')).toContainText('复制失败');await expect(page.getByLabel('方案链接')).toHaveValue(link);
 if(width!==320){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${shots}/copy-failure-${width}.png`,fullPage:true});}
});
for(const width of [1440,390,320]) test(`Lucky family dual-path and public boundaries at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 for(const client of ['yes','no']) {
  await page.goto('/solutions/');
  for(const value of ['movie','mac','family',client]) await page.locator(`[data-choice="${value}"]`).click();
  const route=page.locator('.solution-network');
  await expect(route).toHaveCount(1);
  await expect(route.getByRole('heading',{name:'家里内网直连 + 外网 Lucky HTTPS 反代',exact:true})).toBeVisible();
  await expect(route.locator('.solution-paths p')).toHaveCount(2);
  await expect(page.locator('.solution-result h2')).toContainText(client==='yes'?'Tailscale':'Lucky HTTPS');
  await expect(route).toContainText('CGNAT');
  await expect(route.getByRole('link',{name:'Lucky 官方 Web 服务：反代、TLS 与日志 ↗'})).toHaveAttribute('href','https://lucky666.cn/docs/modules/web/');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.reload();await expect(route).toHaveCount(1);
  if(client==='no'){mkdirSync(shots,{recursive:true});await route.scrollIntoViewIfNeeded();await page.screenshot({path:`${shots}/lucky-${width}.png`,fullPage:true});}
  await page.goto(`/solutions/?goal=movie&device=mac&audience=public&client=${client}`);
  await expect(page.locator('.solution-network')).toHaveCount(0);
  await expect(page.locator('.solution-result')).not.toContainText('Lucky');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 expect(errors).toEqual([]);
});
test('NAS, browser backup and invalid URL branches',async({page})=>{
 for(const [query,title] of [['goal=remote&device=linux&kind=nas&audience=family&client=no','NAS 转为后台管理'],['goal=backup&device=mac&audience=family&client=no','Nextcloud 浏览器收集'],['goal=movie&device=linux&audience=family&client=yes','Emby + Tailscale']]){
  await page.goto('/solutions/?'+query);await expect(page.locator('.solution-result h2').first()).toContainText(title);
 }
 await page.goto('/solutions/?goal=%3Cscript%3E');await expect(page.getByRole('status')).toContainText('无效');await expect(page.locator('h1')).toHaveText('你想做什么？');
});
