import { test, expect } from '@playwright/test';
test('search, category filter, clipboard and primary navigation work', async ({ page, context, baseURL }) => {
 await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseURL });
 await page.goto('/');
 await expect(page.locator('.tools-grid .tool-card')).toHaveCount(9);
 await expect(page.locator('.top')).not.toContainText('控制台');
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
