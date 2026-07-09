function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
function validData(data: any) {
  if (!data || !Array.isArray(data.tools) || !Array.isArray(data.scripts) || !Array.isArray(data.notes)) return false;
  return data.tools.every((t: any) => t && t.id && t.name && t.category && Array.isArray(t.links));
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
function checkLogin(env: any, username: string, password: string) {
  const expectedUser = env.ADMIN_USER || 'admin';
  const expectedPass = env.ADMIN_PASSWORD || '';
  return Boolean(expectedPass && username && password && safeEqual(username, expectedUser) && safeEqual(password, expectedPass));
}
export async function onRequestPost({ request, env }: { request: Request; env: any }) {
  let body: any;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'BAD_JSON' }, 400); }
  if (!checkLogin(env, body.username || '', body.password || '')) return json({ ok: false, error: 'UNAUTHORIZED' }, 401);
  if (body.action === 'login') return json({ ok: true });
  if (body.action !== 'save') return json({ ok: false, error: 'BAD_ACTION' }, 400);
  if (!validData(body.data)) return json({ ok: false, error: 'BAD_DATA' }, 400);
  await env.ONEMJJ_CONFIG.put('siteData', JSON.stringify(body.data, null, 2));
  return json({ ok: true, savedAt: new Date().toISOString() });
}
