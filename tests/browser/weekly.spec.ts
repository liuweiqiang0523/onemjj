import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const legacy = JSON.parse(readFileSync(new URL('../../src/weekly-002.json', import.meta.url), 'utf8'));
for (const width of [1440, 390, 320]) test(`weekly entry, archive, return and wizard at ${width}px`, async ({ page }) => {
 await page.setViewportSize({width,height:900});
 await page.goto('/');
 await page.getByRole('link',{name:'小报',exact:true}).click();
 await expect(page.locator('.weekly header')).toContainText('ISSUE 003');
 await expect(page.locator('time')).toHaveAttribute('datetime','2026-10-07');
 await expect(page.locator('.weekly')).toContainText('CGNAT');
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 await page.getByRole('link',{name:'第002期归档 · 2026-08-06 →'}).click();
 await expect(page).toHaveURL(/\/weekly\/002\/$/);
 await expect(page).toHaveTitle(/第002期/);
 await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://onemjj.com/weekly/002/');
 await expect(page.locator('time')).toHaveAttribute('datetime','2026-08-06');
 await expect(page.locator('.headline')).toContainText(legacy.headlineBody);
 for (const note of legacy.notes) {
  const card = page.locator('details').filter({hasText:note.title}); await card.locator('summary').click();
  await expect(card.locator('.note-body p')).toHaveText(note.body.split('\n').map((p: string) => p.trim()).filter(Boolean));
 }
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 await page.getByRole('link',{name:'返回最新一期 →'}).click();
 await expect(page.locator('.weekly header')).toContainText('ISSUE 003');
 await page.getByRole('link',{name:'打开自托管方案向导 →'}).click();
 await expect(page).toHaveURL(/\/solutions\/$/);
 await page.goBack(); await expect(page.locator('.weekly header')).toContainText('ISSUE 003');
 await page.goto('/weekly/999/'); await expect(page.locator('h1')).toContainText('404');
});
