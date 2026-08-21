/**
 * Minimal markdown -> HTML renderer, shared by the client app and the edge
 * function so a post looks identical whether it was rendered in the browser or
 * injected server-side for crawlers.
 *
 * Deliberately not a full CommonMark implementation. It supports exactly what
 * the synced posts use, verified against their actual content: ATX headings,
 * fenced code blocks, unordered/ordered lists, blockquotes, paragraphs, plus
 * inline bold and inline code. Everything is HTML-escaped first, so untrusted
 * markdown cannot inject markup.
 */

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Inline pass. Input must already be HTML-escaped. */
function inline(text: string): string {
  // Inline code first: its contents must not be touched by the bold pass.
  const codes: string[] = [];
  let out = text.replace(/`([^`]+)`/g, (_m, code) => {
    codes.push(code);
    return `\u0000${codes.length - 1}\u0000`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return out.replace(/\u0000(\d+)\u0000/g, (_m, i) => `<code>${codes[Number(i)]}</code>`);
}

/** Slug for heading anchors, so a table of contents can link into the post. */
function headingId(text: string, used: Set<string>): string {
  const base = text
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';
  let id = base;
  let n = 2;
  while (used.has(id)) id = `${base}-${n++}`;
  used.add(id);
  return id;
}

export type Heading = { id: string; text: string; level: number };

export function renderMarkdown(md: string): { html: string; headings: Heading[] } {
  const lines = String(md ?? '').split('\n');
  const parts: string[] = [];
  const headings: Heading[] = [];
  const usedIds = new Set<string>();

  let para: string[] = [];
  let list: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let quote: string[] = [];

  const flushPara = () => {
    if (!para.length) return;
    parts.push(`<p>${inline(escapeHtml(para.join(' ')))}</p>`);
    para = [];
  };
  const flushList = () => {
    if (!list.length || !listType) return;
    parts.push(`<${listType}>${list.map(item => `<li>${inline(escapeHtml(item))}</li>`).join('')}</${listType}>`);
    list = [];
    listType = null;
  };
  const flushQuote = () => {
    if (!quote.length) return;
    parts.push(`<blockquote><p>${inline(escapeHtml(quote.join(' ')))}</p></blockquote>`);
    quote = [];
  };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();
    const trimmed = line.trim();

    // Fenced code block: consume verbatim until the closing fence.
    const fence = trimmed.match(/^```(\w*)/);
    if (fence) {
      flushAll();
      const lang = fence[1] || '';
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) buf.push(lines[i++]);
      const cls = lang ? ` class="language-${escapeHtml(lang)}"` : '';
      parts.push(`<pre><code${cls}>${escapeHtml(buf.join('\n'))}</code></pre>`);
      continue;
    }

    if (!trimmed) { flushAll(); continue; }

    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushAll();
      const level = heading[1].length;
      const text = heading[2].trim();
      const id = headingId(text, usedIds);
      headings.push({ id, text, level });
      parts.push(`<h${level} id="${escapeHtml(id)}">${inline(escapeHtml(text))}</h${level}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) { flushAll(); parts.push('<hr />'); continue; }

    const ul = trimmed.match(/^[-*+]\s+(.*)$/);
    if (ul) {
      flushPara(); flushQuote();
      if (listType && listType !== 'ul') flushList();
      listType = 'ul';
      list.push(ul[1]);
      continue;
    }

    const ol = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (ol) {
      flushPara(); flushQuote();
      if (listType && listType !== 'ol') flushList();
      listType = 'ol';
      list.push(ol[1]);
      continue;
    }

    const bq = trimmed.match(/^>\s?(.*)$/);
    if (bq) { flushPara(); flushList(); quote.push(bq[1]); continue; }

    flushList(); flushQuote();
    para.push(trimmed);
  }

  flushAll();
  return { html: parts.join('\n'), headings };
}

/** Plain text for meta descriptions and content-length checks. */
export function markdownToText(md: string): string {
  return String(md ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+[.)]\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}
