function unauthorized() {
  return new Response('OneMJJ admin requires authentication', {
    status: 401,
    headers: {
      'www-authenticate': 'Basic realm="OneMJJ Admin", charset="UTF-8"',
      'cache-control': 'no-store',
    },
  });
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function isAuthorized(request: Request, env: any) {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Basic ')) return false;
  let decoded = '';
  try { decoded = atob(header.slice(6)); } catch { return false; }
  const idx = decoded.indexOf(':');
  if (idx < 0) return false;
  const user = decoded.slice(0, idx);
  const pass = decoded.slice(idx + 1);
  const expectedUser = env.ADMIN_USER || 'admin';
  const expectedPass = env.ADMIN_PASSWORD || '';
  return timingSafeEqual(user, expectedUser) && timingSafeEqual(pass, expectedPass);
}

export async function onRequest({ request, env }: { request: Request; env: any }) {
  if (!isAuthorized(request, env)) return unauthorized();
  const url = new URL(request.url);
  const assetPath = url.pathname.endsWith('/') || url.pathname === '/admin'
    ? '/admin/index.html'
    : url.pathname;
  const assetUrl = new URL(assetPath, request.url);
  const res = await env.ASSETS.fetch(assetUrl);
  const headers = new Headers(res.headers);
  headers.set('cache-control', 'no-store');
  return new Response(res.body, { status: res.status, headers });
}
