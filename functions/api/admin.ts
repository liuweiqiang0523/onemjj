function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
function validData(data: any) {
  if (!data || !Array.isArray(data.tools) || !Array.isArray(data.scripts) || !Array.isArray(data.notes)) return false;
  return data.tools.every((t: any) => t && t.id && t.name && t.category && Array.isArray(t.links));
}
function checkPassword(env: any, password: string) {
  return Boolean(env.ADMIN_PASSWORD && password && password === env.ADMIN_PASSWORD);
}
export async function onRequestPost({ request, env }: { request: Request; env: any }) {
  let body: any;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'BAD_JSON' }, 400); }
  if (!checkPassword(env, body.password)) return json({ ok: false, error: 'UNAUTHORIZED' }, 401);
  if (body.action === 'login') return json({ ok: true });
  if (body.action !== 'save') return json({ ok: false, error: 'BAD_ACTION' }, 400);
  if (!validData(body.data)) return json({ ok: false, error: 'BAD_DATA' }, 400);
  await env.ONEMJJ_CONFIG.put('siteData', JSON.stringify(body.data, null, 2));
  return json({ ok: true, savedAt: new Date().toISOString() });
}
