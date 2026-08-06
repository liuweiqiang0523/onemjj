/**
 * Catch-all: real 404s instead of soft-404 SPA fallback.
 *
 * The client-side app only knows these routes:
 *   /                                  home
 *   /weekly(/ )                         weekly paper
 *   /blog/<slug>(/ )                    articles
 *   /tools/<id>(/ )                     tool detail pages (ids come from KV data)
 *   /admin/*                            admin console (static app)
 * Everything else gets a proper 404, with a small matching page.
 *
 * SPA routes are served the app shell explicitly (env.ASSETS.fetch of
 * index.html) so behavior is deterministic and does not depend on the
 * project-level fallback; real static files pass through via next().
 */

const articleSlug = 'saferelay-telegram-private-chat-bot';

const SPA_ROUTES = new Set([
  '/',
  '/weekly',
  '/weekly/',
  `/blog/${articleSlug}`,
  `/blog/${articleSlug}/`,
]);

const STATIC_FILES = new Set([
  '/favicon.svg',
  '/favicon.ico',
  '/site.webmanifest',
  '/robots.txt',
  '/sitemap.xml',
  '/og-cover.png',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/404.html',
  '/404.css',
]);

const STATIC_PREFIXES = ['/assets/', '/data/', '/admin'];

/** Mirrors the /* rules in public/_headers so function-served pages keep the same security posture. */
const SECURITY_HEADERS: Record<string, string> = {
  'content-security-policy': "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self'",
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
};

let cache = { at: 0, ids: new Set<string>() };
const CACHE_TTL_MS = 30_000;

async function toolIds(env: any): Promise<Set<string>> {
  const now = Date.now();
  if (cache.ids.size && now - cache.at < CACHE_TTL_MS) return cache.ids;
  const ids = new Set<string>();
  try {
    const stored = await env.ONEMJJ_CONFIG?.get('siteData');
    if (stored) {
      const data = JSON.parse(stored);
      if (Array.isArray(data.tools)) {
        for (const tool of data.tools) {
          if (tool && typeof tool.id === 'string' && tool.id) ids.add(tool.id);
        }
      }
    }
  } catch {
    // fall back to bundled defaults below
  }
  if (!ids.size) {
    try {
      const fallback = await env.ASSETS.fetch(new URL('/data/default-data.json', new URL('https://onemjj.com')));
      if (fallback.ok) {
        const data: any = await fallback.json();
        if (Array.isArray(data.tools)) {
          for (const tool of data.tools) {
            if (tool && typeof tool.id === 'string' && tool.id) ids.add(tool.id);
          }
        }
      }
    } catch {
      // empty set -> unknown /tools/* will 404; next cache fill retries
    }
  }
  cache = { at: now, ids };
  return ids;
}

function json404() {
  return new Response(JSON.stringify({ ok: false, error: 'NOT_FOUND' }), {
    status: 404,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, max-age=0',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex, nofollow, noarchive',
    },
  });
}

export async function onRequest({ request, env, next }: { request: Request; env: any; next: () => Promise<Response> }) {
  const url = new URL(request.url);
  const path = url.pathname;

  // API endpoints are handled by their own functions.
  if (path === '/api/data' || (path === '/api/admin' && request.method === 'POST')) {
    return next();
  }

  // Client-side routes: serve the app shell.
  let isTool = false;
  if (path.startsWith('/tools/')) {
    const id = decodeURIComponent(path.slice('/tools/'.length).replace(/\/+$/, ''));
    if (id) isTool = (await toolIds(env)).has(id);
  }
  if (SPA_ROUTES.has(path) || isTool) {
    const shell = await env.ASSETS.fetch(new URL('/index.html', url));
    return new Response(shell.body, {
      status: shell.status,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=0, must-revalidate',
        ...SECURITY_HEADERS,
      },
    });
  }

  // Real static files.
  if (STATIC_FILES.has(path) || STATIC_PREFIXES.some(prefix => path.startsWith(prefix))) {
    return next();
  }

  // Everything else is a genuine miss.
  if (path.startsWith('/api/')) return json404();

  const page = await env.ASSETS.fetch(new URL('/404.html', url));
  const body = page.ok ? await page.text() : '<!doctype html><title>404 Not Found</title><p>404 Not Found</p>';
  return new Response(body, {
    status: 404,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store, max-age=0',
      ...SECURITY_HEADERS,
      'x-robots-tag': 'noindex, nofollow, noarchive',
    },
  });
}
