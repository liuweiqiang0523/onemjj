import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests/browser', use: { baseURL: process.env.SITE_URL || 'http://127.0.0.1:4173', headless: true }, reporter: 'list' });
