import { readFile, writeFile } from 'node:fs/promises';

const BLOG_ORIGIN = 'https://blog.onemjj.com';
const SITE_ORIGIN = 'https://onemjj.com';
const ALLOWED_CATEGORIES = new Set(['技术', '工程笔记']);
const LEGACY_BLOG_PATHS = new Set(['/blog/saferelay-telegram-private-chat-bot/']);
const POSTS_PATH = new URL('../public/data/posts.json', import.meta.url);
const SITEMAP_PATH = new URL('../public/sitemap.xml', import.meta.url);
const REQUEST_TIMEOUT_MS = 15_000;

const log = (message) => console.log(`[sync-blog] ${message}`);

function validDate(value) {
  const text = String(value ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : '';
}

function estimateReadMinutes(post) {
  const plain = String(post.content ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[#>*_|~\-\[\]()]/g, ' ');
  return Math.max(1, Math.ceil(plain.length / 450));
}

function normalizeRemotePost(input) {
  const slug = String(input?.slug ?? '').trim();
  const title = String(input?.title ?? '').trim();
  const content = String(input?.content ?? '').trim();
  const category = String(input?.category ?? '').trim();
  const date = validDate(input?.createdAt);
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(slug) || !title || !content || !date || !ALLOWED_CATEGORIES.has(category)) return null;
  return {
    slug,
    title,
    excerpt: String(input?.excerpt ?? '').trim(),
    date,
    category,
    tags: [...new Set((Array.isArray(input?.tags) ? input.tags : [])
      .filter((tag) => typeof tag === 'string' && tag.trim())
      .map((tag) => tag.trim()))],
    readMinutes: estimateReadMinutes(input),
    content,
    origin: `${BLOG_ORIGIN}/posts/${encodeURIComponent(slug)}`,
    sourceUpdatedAt: String(input?.updatedAt ?? input?.createdAt ?? '').trim(),
    syncManaged: true,
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'onemjj-site-sync/1.0' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}

function sorted(posts) {
  return [...posts].sort((a, b) => {
    const byDate = String(b?.date ?? '').localeCompare(String(a?.date ?? ''));
    return byDate || String(a?.slug ?? '').localeCompare(String(b?.slug ?? ''));
  });
}

function xmlEscape(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function isManagedBlogUrl(line) {
  const match = line.match(/<loc>([^<]+)<\/loc>/);
  if (!match) return false;
  try {
    const path = new URL(match[1]).pathname;
    return path.startsWith('/blog/') && path !== '/blog/' && !LEGACY_BLOG_PATHS.has(path);
  } catch {
    return false;
  }
}

function updateSitemap(source, posts) {
  let cleaned = source.replace(/  <!-- blog-posts:start -->[\s\S]*?  <!-- blog-posts:end -->\n?/g, '');
  const lines = cleaned.split('\n').filter((line) => !isManagedBlogUrl(line));
  const blogIndex = lines.findIndex((line) => line.includes(`<loc>${SITE_ORIGIN}/blog/</loc>`));
  if (blogIndex < 0) throw new Error('sitemap is missing the /blog/ index entry');
  const entries = sorted(posts)
    .filter((post) => /^[a-z0-9][a-z0-9-]*$/i.test(String(post?.slug ?? '')))
    .map((post) => {
      const lastmod = validDate(post.sourceUpdatedAt) || validDate(post.date);
      return `  <url><loc>${SITE_ORIGIN}/blog/${xmlEscape(post.slug)}/</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<changefreq>monthly</changefreq><priority>0.8</priority></url>`;
    });
  lines.splice(blogIndex + 1, 0, '  <!-- blog-posts:start -->', ...entries, '  <!-- blog-posts:end -->');
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s*$/, '\n');
}

async function main() {
  let existing = [];
  try {
    const parsed = JSON.parse(await readFile(POSTS_PATH, 'utf8'));
    if (Array.isArray(parsed)) existing = parsed;
  } catch (error) {
    log(`kept existing data unreadable fallback: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  let candidates = [];
  try {
    const listed = await fetchJson(`${BLOG_ORIGIN}/api/posts`);
    if (!Array.isArray(listed)) throw new Error('post list is not an array');
    candidates = listed.filter((post) => post && ALLOWED_CATEGORIES.has(String(post.category ?? '').trim()));
  } catch (error) {
    log(`remote list unavailable; using checked-in posts: ${error instanceof Error ? error.message : String(error)}`);
  }

  const details = [];
  for (const candidate of candidates) {
    const slug = String(candidate?.slug ?? '').trim();
    if (!/^[a-z0-9][a-z0-9-]*$/i.test(slug)) continue;
    try {
      const remote = await fetchJson(`${BLOG_ORIGIN}/api/posts/${encodeURIComponent(slug)}`);
      const normalized = normalizeRemotePost(remote);
      if (normalized) details.push(normalized);
    } catch (error) {
      log(`skipped ${slug}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const bySlug = new Map(existing.filter((post) => post && typeof post.slug === 'string').map((post) => [post.slug, post]));
  let added = 0;
  let updated = 0;
  for (const remote of details) {
    const local = bySlug.get(remote.slug);
    if (!local) {
      bySlug.set(remote.slug, remote);
      added += 1;
    } else if (local.syncManaged === true && local.sourceUpdatedAt !== remote.sourceUpdatedAt) {
      bySlug.set(remote.slug, remote);
      updated += 1;
    }
  }

  const merged = sorted([...bySlug.values()]);
  const postsJson = `${JSON.stringify(merged, null, 2)}\n`;
  const currentPostsJson = `${JSON.stringify(existing, null, 2)}\n`;
  if (postsJson !== currentPostsJson) await writeFile(POSTS_PATH, postsJson);

  const sitemap = await readFile(SITEMAP_PATH, 'utf8');
  const nextSitemap = updateSitemap(sitemap, merged);
  if (nextSitemap !== sitemap) await writeFile(SITEMAP_PATH, nextSitemap);
  log(`checked ${details.length} technical posts; added ${added}, updated ${updated}, total ${merged.length}`);
}

main().catch((error) => {
  log(`non-fatal sync failure; build continues with checked-in posts: ${error instanceof Error ? error.message : String(error)}`);
});
