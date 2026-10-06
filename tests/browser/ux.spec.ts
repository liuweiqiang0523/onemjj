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
for (const width of [1440, 320]) test(`console uses primary link styling and opens the login page at ${width}px`, async ({ page }) => {
 await page.setViewportSize({ width, height: 900 });
 await page.goto('/');
 const links = page.locator('.top > div a');
 await expect(links).toHaveText(['首页', '站内文章', '小报', '控制台']);
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
