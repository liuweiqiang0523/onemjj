const COOKIE_NAME = '__Host-onemjj_admin';
const SESSION_SECONDS = 8 * 60 * 60;
const LOGIN_WINDOW_SECONDS = 15 * 60;
const MAX_LOGIN_FAILURES = 5;

const encoder = new TextEncoder();

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, max-age=0',
      'x-content-type-options': 'nosniff',
      ...extraHeaders,
    },
  });
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function fromBase64Url(value: string) {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return atob(padded);
}

async function signature(value: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}

async function createSession(username: string, secret: string) {
  const payload = toBase64Url(encoder.encode(JSON.stringify({ username, expires: Math.floor(Date.now() / 1000) + SESSION_SECONDS })));
  return `${payload}.${await signature(payload, secret)}`;
}

function readCookie(request: Request, name: string) {
  const cookie = request.headers.get('cookie') ?? '';
  for (const part of cookie.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return value.join('=');
  }
  return '';
}

async function verifySession(request: Request, secret: string) {
  const token = readCookie(request, COOKIE_NAME);
  const [payload, providedSignature] = token.split('.');
  if (!payload || !providedSignature) return false;
  if (!safeEqual(await signature(payload, secret), providedSignature)) return false;
  try {
    const decoded = JSON.parse(fromBase64Url(payload));
    return Boolean(decoded.username && Number(decoded.expires) > Math.floor(Date.now() / 1000));
  } catch {
    return false;
  }
}

function validString(value: unknown, maxLength: number) {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength;
}

function validUrl(value: unknown) {
  if (!validString(value, 2048)) return false;
  try {
    return ['https:', 'http:'].includes(new URL(value as string).protocol);
  } catch {
    return false;
  }
}

function validData(data: any) {
  if (!data || !Array.isArray(data.tools) || !Array.isArray(data.scripts) || !Array.isArray(data.notes)) return false;
  if (data.tools.length > 100 || data.scripts.length > 100 || data.notes.length > 100) return false;
  const toolsValid = data.tools.every((tool: any) => tool
    && validString(tool.id, 80)
    && validString(tool.name, 120)
    && validString(tool.category, 80)
    && validString(tool.desc, 300)
    && validString(tool.body, 3000)
    && Array.isArray(tool.links)
    && tool.links.length <= 40
    && tool.links.every((link: any) => validString(link?.label, 160) && validUrl(link?.url))
    && (!tool.commands || (Array.isArray(tool.commands) && tool.commands.length <= 30 && tool.commands.every((command: unknown) => validString(command, 2000)))));
  const scriptsValid = data.scripts.every((script: any) => script
    && validString(script.title, 160)
    && validString(script.cmd, 2000)
    && (!script.source || (validString(script.source.label, 160) && validUrl(script.source.url))));
  const notesValid = data.notes.every((note: any) => note
    && validString(note.tag, 80)
    && validString(note.title, 200)
    && validString(note.body, 5000));
  const probeValid = !data.probe || (validString(data.probe?.label, 160) && validUrl(data.probe?.url));
  const heroLinksValid = !data.heroLinks || (Array.isArray(data.heroLinks)
    && data.heroLinks.length <= 20
    && data.heroLinks.every((link: any) => validString(link?.label, 160) && validUrl(link?.url)));
  return toolsValid && scriptsValid && notesValid && probeValid && heroLinksValid;
}

function validOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

export async function onRequestPost({ request, env }: { request: Request; env: any }) {
  if (!validOrigin(request) || request.headers.get('x-onemjj-admin') !== '1') {
    return json({ ok: false, error: 'FORBIDDEN' }, 403);
  }
  if (!env.ADMIN_SESSION_SECRET || !env.ADMIN_PASSWORD) {
    return json({ ok: false, error: 'ADMIN_NOT_CONFIGURED' }, 503);
  }
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 256_000) return json({ ok: false, error: 'PAYLOAD_TOO_LARGE' }, 413);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'BAD_JSON' }, 400);
  }

  if (body.action === 'login') {
    const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
    const rateKey = `admin-login:${ip}`;
    const failures = Number(await env.ONEMJJ_CONFIG.get(rateKey) ?? 0);
    if (failures >= MAX_LOGIN_FAILURES) {
      return json({ ok: false, error: 'TOO_MANY_ATTEMPTS' }, 429, { 'retry-after': String(LOGIN_WINDOW_SECONDS) });
    }
    const expectedUser = env.ADMIN_USER || 'admin';
    const validLogin = safeEqual(String(body.username ?? ''), expectedUser)
      && safeEqual(String(body.password ?? ''), env.ADMIN_PASSWORD);
    if (!validLogin) {
      await env.ONEMJJ_CONFIG.put(rateKey, String(failures + 1), { expirationTtl: LOGIN_WINDOW_SECONDS });
      return json({ ok: false, error: 'UNAUTHORIZED' }, 401);
    }
    await env.ONEMJJ_CONFIG.delete(rateKey);
    const session = await createSession(expectedUser, env.ADMIN_SESSION_SECRET);
    return json({ ok: true }, 200, {
      'set-cookie': `${COOKIE_NAME}=${session}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict`,
    });
  }

  if (body.action === 'logout') {
    return json({ ok: true }, 200, {
      'set-cookie': `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`,
    });
  }

  if (!await verifySession(request, env.ADMIN_SESSION_SECRET)) {
    return json({ ok: false, error: 'UNAUTHORIZED' }, 401);
  }
  if (body.action === 'session') return json({ ok: true });
  if (body.action !== 'save') return json({ ok: false, error: 'BAD_ACTION' }, 400);
  if (!validData(body.data)) return json({ ok: false, error: 'BAD_DATA' }, 400);

  const serialized = JSON.stringify(body.data, null, 2);
  if (serialized.length > 250_000) return json({ ok: false, error: 'PAYLOAD_TOO_LARGE' }, 413);
  await env.ONEMJJ_CONFIG.put('siteData', serialized);
  return json({ ok: true, savedAt: new Date().toISOString() });
}
