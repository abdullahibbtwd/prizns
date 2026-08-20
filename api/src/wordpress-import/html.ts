import type { StoredArticleBlock } from '../articles/article.types';
import type { WpInlineImage } from './types';

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  laquo: '«',
  raquo: '»',
  ldquo: '“',
  rdquo: '”',
  lsquo: '‘',
  rsquo: '’',
  sbquo: '‚',
};

export function decodeHtmlEntities(input: string): string {
  return input.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (full, token: string) => {
      const lower = token.toLowerCase();
      if (lower.startsWith('#x')) {
        const code = Number.parseInt(lower.slice(2), 16);
        return Number.isFinite(code) ? String.fromCodePoint(code) : full;
      }
      if (lower.startsWith('#')) {
        const code = Number.parseInt(lower.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : full;
      }
      return NAMED_ENTITIES[lower] ?? full;
    },
  );
}

export function stripHtml(input: string): string {
  return decodeHtmlEntities(
    input
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function toHttps(url: string): string {
  return url.replace(/^http:\/\//i, 'https://');
}

function attr(tag: string, name: string): string {
  const match = tag.match(
    new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'),
  );
  return decodeHtmlEntities(match?.[1] ?? match?.[2] ?? match?.[3] ?? '').trim();
}

function innerHtml(block: string, tag: string): string {
  const open = new RegExp(`^<${tag}\\b[^>]*>`, 'i');
  const close = new RegExp(`</${tag}\\s*>$`, 'i');
  return block.replace(open, '').replace(close, '').trim();
}

function isStrongOnly(html: string): boolean {
  const trimmed = html.trim();
  return /^<(strong|b)\b[^>]*>[\s\S]*<\/\1>$/i.test(trimmed);
}

function imageFromHtml(html: string): WpInlineImage | null {
  const img = html.match(/<img\b[^>]*>/i)?.[0];
  if (!img) return null;
  const src = toHttps(attr(img, 'src'));
  if (!src) return null;
  const caption =
    stripHtml(html.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1] ?? '') ||
    stripHtml(html.match(/<p class="wp-caption-text"[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? '');
  return { src, caption, alt: attr(img, 'alt') };
}

export type HtmlToBlocksResult = {
  blocks: StoredArticleBlock[];
  images: WpInlineImage[];
};

/**
 * Convert classic / block-editor WP HTML into journal body blocks.
 * Figures become inline image blocks so photos stay next to the related text.
 */
export function htmlToBlocks(
  html: string,
  opts?: { quoteCiteBg?: string },
): HtmlToBlocksResult {
  const blocks: StoredArticleBlock[] = [];
  const images: WpInlineImage[] = [];
  const seenSrc = new Set<string>();

  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();

  const blockRe =
    /<(p|h[1-6]|figure|blockquote|ul|ol)(\s[^>]*)?>[\s\S]*?<\/\1>/gi;

  const pushImage = (image: WpInlineImage | null) => {
    if (!image || seenSrc.has(image.src)) return;
    seenSrc.add(image.src);
    images.push(image);
  };

  const pushInlineImage = (image: WpInlineImage | null) => {
    pushImage(image);
    if (!image) return;
    blocks.push({
      type: 'image',
      url: image.src,
      captionBg: image.caption || '',
    });
  };

  const pushParagraph = (text: string) => {
    if (!text) return;
    blocks.push({ type: 'paragraph', textBg: text });
  };

  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(cleaned))) {
    const full = match[0];
    const tag = match[1]!.toLowerCase();

    if (tag === 'figure') {
      pushInlineImage(imageFromHtml(full));
      continue;
    }

    if (tag === 'blockquote') {
      const text = stripHtml(full);
      if (text) {
        blocks.push({
          type: 'pullquote',
          textBg: text,
          citeBg: opts?.quoteCiteBg ?? '',
        });
      }
      continue;
    }

    if (/^h[1-6]$/.test(tag)) {
      const label = stripHtml(innerHtml(full, tag));
      if (label) {
        blocks.push({ type: 'note', labelBg: label, textBg: '' });
      }
      continue;
    }

    if (tag === 'ul' || tag === 'ol') {
      const items = [...full.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(
        (item) => stripHtml(item[1] ?? ''),
      );
      const bullet = items
        .filter(Boolean)
        .map((item) => `• ${item}`)
        .join('\n');
      pushParagraph(bullet);
      continue;
    }

    const inner = innerHtml(full, 'p');
    const image = imageFromHtml(inner);
    const text = stripHtml(inner);
    if (image && !text) {
      pushInlineImage(image);
      continue;
    }
    pushImage(image);
    if (!text) continue;

    if (isStrongOnly(inner) && text.length >= 40) {
      blocks.push({
        type: 'pullquote',
        textBg: text,
        citeBg: opts?.quoteCiteBg ?? '',
      });
      continue;
    }

    pushParagraph(text);
  }

  if (blocks.length === 0) {
    const fallback = stripHtml(cleaned);
    if (fallback) pushParagraph(fallback);
  }

  return { blocks, images };
}
