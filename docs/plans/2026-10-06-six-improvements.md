# OneMJJ Six Improvements Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Ship six authorized improvements without changing production KV or historical guidance.

**Architecture:** Shared escaped evidence and TOC HTML is used by SPA and Pages Functions. Local search filters existing bundled/public data. A read-only HTTPS checker pins validated DNS addresses and produces reports only.

**Tech Stack:** TypeScript, Vite, Node HTTPS, Playwright, Cloudflare Pages, GitHub Actions.

1. Back up Git and public KV with 0700 directory/0600 files.
2. Add failing checker tests; implement DNS-pinned HTTPS reads and bounded redirects/concurrency/timeouts; run real checks.
3. Add failing evidence/search tests; implement shared rendering from actual HTTP observations and explicit unknowns.
4. Add mobile navigation browser assertion; change only mobile CSS and verify 320/390/768/1440.
5. Integrate local search, feedback clipboard, article evidence and SSR TOC. Preserve original date, content and guides.
6. Full unit/type/build/browser regression, commit main and deploy through existing Actions.
7. Manually dispatch link workflow and verify actual artifact and summary. Verify deployed raw HTML, browser, API, robots/ads, CSP and admin auth; compare public KV backup.
