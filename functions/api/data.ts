export async function onRequestGet({ env, request }: { env: any; request: Request }) {
  const stored = await env.ONEMJJ_CONFIG?.get('siteData');
  if (stored) {
    return new Response(stored, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
  }
  const fallbackUrl = new URL('/data/default-data.json', request.url);
  const fallback = await env.ASSETS.fetch(fallbackUrl);
  return new Response(await fallback.text(), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
