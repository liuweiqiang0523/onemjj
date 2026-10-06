import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const guides: Record<string, { audience: string; workflow: string[]; reading: string[]; pitfalls: string[]; safety: string[]; maintainer: string }> = JSON.parse(readFileSync(new URL('../../src/tool-guides.json', import.meta.url), 'utf8'));
for (const [id, guide] of Object.entries(guides)) test(`original guide survives SPA hydration: ${id}`, async ({ page }) => {
 await page.goto('/tools/' + id + '/');
 const section = page.getByRole('region', { name: '使用指南' });
 await expect(section).toBeVisible();
 for (const text of [guide.audience, ...guide.workflow, ...guide.reading, ...guide.pitfalls, ...guide.safety, guide.maintainer]) await expect(section).toContainText(text);
 await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/tools\/[^/]+\/$/);
});
test('search, category filter, clipboard and primary navigation work', async ({ page, context, baseURL }) => {
 await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseURL });
 await page.goto('/');
 await expect(page.locator('.tools-grid .tool-card')).toHaveCount(9);
 await expect(page.locator('.top')).toContainText('控制台');
 await expect(page.locator('.site-footer')).toContainText('站长后台');
 await page.getByRole('searchbox').fill('YABS');
 await expect(page.locator('.tools-grid .tool-card')).toHaveCount(1);
 await page.getByRole('searchbox').fill('no-such-tool');
 await expect(page.locator('.empty')).toBeVisible();
 await page.getByRole('searchbox').fill('');
 await page.locator('[data-cat="AI"]').click();
 await expect(page.locator('.tools-grid .tool-card')).toHaveCount(1);
 await page.locator('[data-cat="全部"]').click();
 await expect(page.locator('.tools-grid .tool-card')).toHaveCount(9);
 const copy = page.locator('[data-copy]').first(); const expected = await copy.getAttribute('data-copy');
 await copy.click(); await expect(copy).toHaveText('已复制');
 expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
 await page.getByRole('link', { name: '站内文章', exact: true }).click();
 await expect(page.locator('h1')).toHaveText('文章归档');
});
for (const width of [1440, 768, 390, 320]) test(`console uses primary link styling and opens the login page at ${width}px`, async ({ page }) => {
 await page.setViewportSize({ width, height: 900 });
 await page.goto('/');
 const links = page.locator('.top > div a');
 await expect(links).toHaveText(['首页', '站内文章', '小报', '控制台']);
 if (width <= 600) {
  const brand = await page.locator('.brand').boundingBox();
  const nav = await links.first().boundingBox();
  expect(nav!.y).toBeGreaterThanOrEqual(brand!.y + brand!.height);
  const widths = await links.evaluateAll(es => es.map(e => e.getBoundingClientRect().width));
  expect(Math.max(...widths)-Math.min(...widths)).toBeLessThan(1);
 }
 const consoleLink = links.last();
 await expect(consoleLink).toHaveAttribute('href', '/admin/');
 await expect(consoleLink).not.toHaveAttribute('data-route');
 await expect(consoleLink).not.toHaveAttribute('class');
 await expect(links.first()).toHaveAttribute('aria-current', 'page');
 const styles = await links.evaluateAll(elements => elements.slice(1).map(element => {
  const css = getComputedStyle(element);
  return [css.padding, css.color, css.border, css.borderRadius, css.backgroundColor, css.font, css.textDecoration];
 }));
 expect(styles[2]).toEqual(styles[0]);
 expect(styles[2]).toEqual(styles[1]);
 await page.getByRole('link', { name: '小报', exact: true }).click();
 await expect(page.locator('.top a[aria-current="page"]')).toHaveText('小报');
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 await consoleLink.scrollIntoViewIfNeeded();
 const bounds = await consoleLink.boundingBox();
 expect(bounds).not.toBeNull();
 expect(bounds!.x).toBeGreaterThanOrEqual(0);
 expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
 await Promise.all([page.waitForURL('**/admin/'), consoleLink.click()]);
 await expect(page.locator('#loginForm')).toBeVisible();
 await expect(page.getByRole('button', { name: '登录后台', exact: true })).toBeVisible();
 await expect(page.locator('.top')).toHaveCount(0);
});
test('unified local search aliases, article results, feedback and TOC work', async ({page,context,baseURL}) => {
 await context.grantPermissions(['clipboard-read','clipboard-write'], {origin:baseURL});
 await page.goto('/');
 for (const [query,id] of [['回程','network'],['115','media'],['模型中转','ai-api']]) {
  await page.getByRole('searchbox').fill(query);
  await expect(page.locator(`.tools-grid a[href="/tools/${id}/"]`)).toBeVisible();
 }
 await page.getByRole('searchbox').fill('SumPlus');
 await expect(page.locator('.home-posts .post-card[href="/blog/sumplus-standalone/"]')).toBeVisible();
 await page.getByRole('searchbox').fill('');
 await page.locator('[data-cat="Media"]').click();
 await expect(page.locator('.tools-grid .tool-card')).toHaveCount(1);
 await page.goto('/tools/ai-api/');
 await expect(page.getByRole('region',{name:'核验信息'})).toContainText('未执行');
 const feedback=page.getByRole('region',{name:'内容反馈'});
 const mail=await feedback.getByRole('link',{name:'邮件反馈（预填页面）'}).getAttribute('href');
 expect(decodeURIComponent(mail!)).toContain('https://onemjj.com/tools/ai-api/');
 const button=feedback.locator('button[data-copy]');await button.click();await expect(button).toHaveText('已复制');
 expect(await page.evaluate(()=>navigator.clipboard.readText())).toContain('https://onemjj.com/tools/ai-api/');
 for (const slug of ['teledeck-one-session-one-runtime','saferelay-telegram-private-chat-bot']) {
  await page.goto('/blog/'+slug+'/');
  await expect(page.getByRole('complementary',{name:'文章时效信息'})).toContainText('首次发布');
  const anchor=page.locator('.post-toc a').first();const hash=await anchor.getAttribute('href'); await anchor.click();
  await expect(page.locator(`[id="${hash!.slice(1)}"]`)).toBeVisible();
 }
});
for (const width of [1440, 768, 390, 320]) test(`responsive catalogue and pages have no overflow at ${width}px`, async ({ page }) => {
 await page.setViewportSize({ width, height: 900 });
 for (const path of ['/', '/tools/ai-api/', '/weekly/', '/blog/teledeck-one-session-one-runtime/']) {
  await page.goto(path); await expect(page.locator('.site-footer')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (path === '/') {
   const cols = await page.locator('.tools-grid').evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length);
   expect(cols).toBe(width > 1100 ? 3 : width > 560 ? 2 : 1);
  }
 }
});
