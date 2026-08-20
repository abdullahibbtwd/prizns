import type { PublicArticleDto, StoredArticleBlock } from './article.types';

export type GalleryMedia = {
  id: string;
  url: string;
  creditBg: string | null;
  kind?: 'IMAGE' | 'VIDEO' | 'AUDIO' | string | null;
};

export type PublicArticleBlock = PublicArticleDto['body'][number];

function mediaUrlFromStored(
  block: Extract<StoredArticleBlock, { type: 'image' | 'video' }>,
  gallery: GalleryMedia[],
): string {
  if (block.mediaId) {
    const match = gallery.find((item) => item.id === block.mediaId);
    if (match?.url) return match.url;
  }
  return block.url?.trim() || '';
}

export function storedBlockToPublic(
  block: StoredArticleBlock,
  gallery: GalleryMedia[],
): PublicArticleBlock | null {
  if (block.type === 'image' || block.type === 'video') {
    const url = mediaUrlFromStored(block, gallery);
    if (!url) return null;
    const caption = block.captionEn ?? block.captionBg ?? '';
    return {
      type: block.type,
      url,
      text: caption,
      textBg: block.captionBg ?? '',
    };
  }
  if (block.type === 'pullquote') {
    return {
      type: 'pullquote',
      text: block.textEn ?? block.textBg,
      textBg: block.textBg,
      cite: block.citeEn ?? block.citeBg,
      citeBg: block.citeBg,
    };
  }
  if (block.type === 'note') {
    return {
      type: 'note',
      label: block.labelEn ?? block.labelBg,
      labelBg: block.labelBg,
      text: block.textEn ?? block.textBg,
      textBg: block.textBg,
    };
  }
  if (block.type === 'caption') {
    return {
      type: 'caption',
      text: block.textEn ?? block.textBg,
      textBg: block.textBg,
    };
  }
  return {
    type: 'paragraph',
    text: block.textEn ?? block.textBg,
    textBg: block.textBg,
  };
}

function leftoverGallery(
  gallery: GalleryMedia[],
  heroUrl: string,
  usedUrls: Set<string>,
): GalleryMedia[] {
  const hero = heroUrl.trim();
  const seen = new Set<string>(usedUrls);
  const extras: GalleryMedia[] = [];
  for (const item of gallery) {
    if (item.kind === 'VIDEO' || item.kind === 'AUDIO' || item.kind === 'video') continue;
    const url = item.url.trim();
    if (!url || url === hero || seen.has(url)) continue;
    seen.add(url);
    extras.push(item);
  }
  return extras;
}

function asImageBlock(
  item: GalleryMedia,
  caption?: { text: string; textBg: string },
): Extract<PublicArticleBlock, { type: 'image' }> {
  const text = caption?.text || item.creditBg || '';
  const textBg = caption?.textBg || item.creditBg || '';
  return { type: 'image', url: item.url, text, textBg };
}

/** Place leftover images after evenly spaced paragraphs. */
export function insertImagesAmongParagraphs(
  body: PublicArticleBlock[],
  images: Array<Extract<PublicArticleBlock, { type: 'image' }>>,
): PublicArticleBlock[] {
  if (images.length === 0) return body;
  const paraIdx = body
    .map((block, index) => (block.type === 'paragraph' ? index : -1))
    .filter((index) => index >= 0);
  if (paraIdx.length === 0) return [...body, ...images];

  const result = [...body];
  const n = images.length;
  const gaps = paraIdx.length;
  for (let k = n - 1; k >= 0; k -= 1) {
    const slot = Math.max(
      0,
      Math.min(
        gaps - 1,
        Math.round(((k + 1) * gaps) / (n + 1)) - 1,
      ),
    );
    const insertAt = paraIdx[slot]! + 1;
    result.splice(insertAt, 0, images[k]!);
  }
  return result;
}

/**
 * Public reading body: keep explicit image blocks, otherwise restore
 * in-article photos at old caption positions (WordPress import) and
 * spread any remaining gallery extras through the text.
 */
export function publicBodyWithInlineImages(
  stored: StoredArticleBlock[],
  gallery: GalleryMedia[],
  heroUrl: string,
): PublicArticleBlock[] {
  const mapped = stored
    .map((block) => storedBlockToPublic(block, gallery))
    .filter((block): block is PublicArticleBlock => Boolean(block));

  const usedUrls = new Set(
    mapped
      .filter(
        (block): block is Extract<PublicArticleBlock, { type: 'image' }> =>
          block.type === 'image',
      )
      .map((block) => block.url),
  );

  if (usedUrls.size > 0) {
    return mapped;
  }

  const unused = leftoverGallery(gallery, heroUrl, usedUrls);
  let convertedCaption = false;
  const withCaptions = mapped.map((block) => {
    if (block.type !== 'caption' || unused.length === 0) return block;
    convertedCaption = true;
    const item = unused.shift()!;
    usedUrls.add(item.url);
    return asImageBlock(item, { text: block.text, textBg: block.textBg });
  });

  if (unused.length === 0) return withCaptions;
  const leftoverImages = unused.map((item) => asImageBlock(item));
  if (convertedCaption) return [...withCaptions, ...leftoverImages];
  return insertImagesAmongParagraphs(withCaptions, leftoverImages);
}
