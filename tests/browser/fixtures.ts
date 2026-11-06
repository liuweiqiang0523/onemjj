import { test as base, expect } from '@playwright/test';
// Third-party advertising is outside the site regression scope. A slow ad
// endpoint must not hold page.load open or obscure first-party failures.
export const test = base.extend<{ blockAdvertising: void }>({
 blockAdvertising: [async ({ context }, use) => {
  await context.route(/^https:\/\/[^/]*(?:googlesyndication\.com|doubleclick\.net|googleadservices\.com)\//, route => route.abort());
  await use();
 }, { auto: true }],
});
export { expect };
