import { preferShareImageUrl } from '../common/share-image.util';

export type MissingPackageImage = {
  kind: 'hero' | 'gallery' | 'author' | 'body' | 'inline';
  slug: string;
  src: string;
};

/** True when the URL is already served from our object storage / media host. */
export function isHostedMediaUrl(
  url: string,
  hostedPrefixes: string[],
): boolean {
  if (!url || hostedPrefixes.length === 0) return false;
  return hostedPrefixes.some((prefix) => url.startsWith(prefix));
}

/**
 * Keep existing media when it is already on our server.
 * Hotlinked WordPress URLs (or rows with no hosted URL) are not reusable.
 */
export function isUsableMediaAsset(
  asset: { size: number | null; url: string },
  hostedPrefixes: string[] = [],
): boolean {
  if (isHostedMediaUrl(asset.url, hostedPrefixes)) return true;
  // No MinIO/public base configured: only treat non-WP URLs with a real size as done.
  if (hostedPrefixes.length === 0) {
    return (
      asset.size != null &&
      asset.size > 0 &&
      !/\/wp-content\//i.test(asset.url || '')
    );
  }
  return false;
}

/** WordPress sized derivative (`photo-150x150.jpg`) or our `-thumb` keys. */
export function isWordpressSizedDerivative(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  const preferred = preferShareImageUrl(trimmed);
  return Boolean(preferred && preferred !== trimmed);
}

export function wordpressFullSizeUrl(url: string): string {
  return preferShareImageUrl(url)?.trim() || url.trim();
}

function patchImageRecord(
  image: Record<string, unknown>,
): { upgraded: boolean; needsDownload: boolean; src: string } {
  const srcRaw = typeof image.src === 'string' ? image.src : '';
  const fileRaw = typeof image.file === 'string' ? image.file : '';
  const srcIsSized = isWordpressSizedDerivative(srcRaw);
  const fileIsSized = isWordpressSizedDerivative(fileRaw);
  if (!srcIsSized && !fileIsSized) {
    return {
      upgraded: false,
      needsDownload: Boolean(srcRaw && !fileRaw),
      src: srcRaw,
    };
  }

  const fullSrc = srcRaw
    ? wordpressFullSizeUrl(srcRaw)
    : fileRaw
      ? wordpressFullSizeUrl(
          // Local file names are not URLs; recover basename for reporting only.
          fileRaw.replace(/^images[/\\]/, ''),
        )
      : '';
  // Prefer rewriting remote src; fall back to leaving src when only file was sized.
  if (srcRaw && srcIsSized) {
    image.src = fullSrc;
  }
  if (fileIsSized || (srcIsSized && fileRaw)) {
    // Drop the small local file so repair re-downloads the full-size original.
    delete image.file;
  }
  const nextSrc = typeof image.src === 'string' ? image.src : fullSrc;
  return {
    upgraded: true,
    needsDownload: Boolean(nextSrc && !image.file),
    src: nextSrc,
  };
}

/**
 * Rewrite `-150x150` (and other WP size) src/file refs to the full original and
 * clear local `file` so repair downloads the large asset.
 * Successful thumb downloads are a different bug from missing files.
 */
export function upgradeWordpressThumbnails(
  articlesRaw: unknown[],
  authorsRaw: unknown[],
): { upgraded: number; pendingDownloads: MissingPackageImage[] } {
  let upgraded = 0;
  const pendingDownloads: MissingPackageImage[] = [];

  const noteDownload = (
    kind: MissingPackageImage['kind'],
    slug: string,
    result: { upgraded: boolean; needsDownload: boolean; src: string },
  ) => {
    if (result.upgraded) upgraded += 1;
    if (result.needsDownload && result.src.startsWith('http')) {
      pendingDownloads.push({ kind, slug, src: result.src });
    }
  };

  for (const item of articlesRaw) {
    if (!item || typeof item !== 'object') continue;
    const article = item as Record<string, unknown>;
    const slug = typeof article.slug === 'string' ? article.slug : '';

    if (article.heroImage && typeof article.heroImage === 'object') {
      noteDownload(
        'hero',
        slug,
        patchImageRecord(article.heroImage as Record<string, unknown>),
      );
    }

    if (Array.isArray(article.galleryImages)) {
      for (const gallery of article.galleryImages) {
        if (!gallery || typeof gallery !== 'object') continue;
        noteDownload(
          'gallery',
          slug,
          patchImageRecord(gallery as Record<string, unknown>),
        );
      }
    }

    if (Array.isArray(article.images)) {
      for (const image of article.images) {
        if (!image || typeof image !== 'object') continue;
        noteDownload(
          'inline',
          slug,
          patchImageRecord(image as Record<string, unknown>),
        );
      }
    }

    if (Array.isArray(article.body)) {
      for (const block of article.body) {
        if (!block || typeof block !== 'object') continue;
        const row = block as Record<string, unknown>;
        if (row.type !== 'image' || typeof row.url !== 'string') continue;
        if (!isWordpressSizedDerivative(row.url)) continue;
        row.url = wordpressFullSizeUrl(row.url);
        upgraded += 1;
      }
    }
  }

  for (const item of authorsRaw) {
    if (!item || typeof item !== 'object') continue;
    const author = item as Record<string, unknown>;
    const slug = typeof author.slug === 'string' ? author.slug : '';
    const imageUrl =
      typeof author.imageUrl === 'string' ? author.imageUrl : '';
    const imageFile =
      typeof author.imageFile === 'string' ? author.imageFile : '';
    if (
      !isWordpressSizedDerivative(imageUrl) &&
      !isWordpressSizedDerivative(imageFile)
    ) {
      continue;
    }
    if (imageUrl && isWordpressSizedDerivative(imageUrl)) {
      author.imageUrl = wordpressFullSizeUrl(imageUrl);
    }
    if (imageFile && isWordpressSizedDerivative(imageFile)) {
      delete author.imageFile;
    }
    upgraded += 1;
    const nextUrl =
      typeof author.imageUrl === 'string' ? author.imageUrl : '';
    if (nextUrl.startsWith('http') && !author.imageFile) {
      pendingDownloads.push({ kind: 'author', slug, src: nextUrl });
    }
  }

  return { upgraded, pendingDownloads };
}

export function collectMissingPackageImages(
  articlesRaw: unknown[],
  authorsRaw: unknown[],
): MissingPackageImage[] {
  const missing: MissingPackageImage[] = [];
  for (const item of articlesRaw) {
    if (!item || typeof item !== 'object') continue;
    const article = item as Record<string, unknown>;
    const slug = typeof article.slug === 'string' ? article.slug : '';
    const hero = article.heroImage;
    if (hero && typeof hero === 'object') {
      const image = hero as Record<string, unknown>;
      if (typeof image.src === 'string' && image.src && !image.file) {
        missing.push({ kind: 'hero', slug, src: image.src });
      }
    }
    if (Array.isArray(article.galleryImages)) {
      for (const gallery of article.galleryImages) {
        if (!gallery || typeof gallery !== 'object') continue;
        const image = gallery as Record<string, unknown>;
        if (typeof image.src === 'string' && image.src && !image.file) {
          missing.push({ kind: 'gallery', slug, src: image.src });
        }
      }
    }
    if (Array.isArray(article.images)) {
      for (const inline of article.images) {
        if (!inline || typeof inline !== 'object') continue;
        const image = inline as Record<string, unknown>;
        if (typeof image.src === 'string' && image.src && !image.file) {
          missing.push({ kind: 'inline', slug, src: image.src });
        }
      }
    }
  }
  for (const item of authorsRaw) {
    if (!item || typeof item !== 'object') continue;
    const author = item as Record<string, unknown>;
    const slug = typeof author.slug === 'string' ? author.slug : '';
    const imageUrl =
      typeof author.imageUrl === 'string' ? author.imageUrl : '';
    if (imageUrl && !author.imageFile) {
      missing.push({ kind: 'author', slug, src: imageUrl });
    }
  }
  return missing;
}

export function applyDownloadedFiles(
  articlesRaw: unknown[],
  authorsRaw: unknown[],
  fileBySrc: Map<string, string>,
): number {
  let patched = 0;
  const patchImage = (image: Record<string, unknown>) => {
    const src = typeof image.src === 'string' ? image.src : '';
    const file = src ? fileBySrc.get(src) : undefined;
    if (!file || image.file) return;
    image.file = file;
    patched += 1;
  };

  for (const item of articlesRaw) {
    if (!item || typeof item !== 'object') continue;
    const article = item as Record<string, unknown>;
    if (article.heroImage && typeof article.heroImage === 'object') {
      patchImage(article.heroImage as Record<string, unknown>);
    }
    if (Array.isArray(article.galleryImages)) {
      for (const gallery of article.galleryImages) {
        if (gallery && typeof gallery === 'object') {
          patchImage(gallery as Record<string, unknown>);
        }
      }
    }
    if (Array.isArray(article.images)) {
      for (const image of article.images) {
        if (image && typeof image === 'object') {
          patchImage(image as Record<string, unknown>);
        }
      }
    }
  }

  for (const item of authorsRaw) {
    if (!item || typeof item !== 'object') continue;
    const author = item as Record<string, unknown>;
    const imageUrl =
      typeof author.imageUrl === 'string' ? author.imageUrl : '';
    const file = imageUrl ? fileBySrc.get(imageUrl) : undefined;
    if (!file || author.imageFile) continue;
    author.imageFile = file;
    patched += 1;
  }

  return patched;
}
