import defaults from './default-data.json';
import { validData } from './data-schema';
import { refreshPublicContent } from './content-refresh';
export function safePublicData(value: unknown) {
 return refreshPublicContent(validData(value) ? value as typeof defaults : structuredClone(defaults));
}
export async function loadPublicData(env: any, url: URL) {
 try {
  const stored = await env.ONEMJJ_CONFIG?.get('siteData');
  if (stored) { const value = JSON.parse(stored); if (validData(value)) return safePublicData(value); }
 } catch { /* Invalid or unavailable KV must not break public pages. */ }
 try {
  const response = await env.ASSETS.fetch(new URL('/data/default-data.json', url));
  if (response.ok) return safePublicData(await response.json());
 } catch { /* Compiled defaults remain available offline. */ }
 return safePublicData(defaults);
}
