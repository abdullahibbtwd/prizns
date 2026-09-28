import { api } from "@/lib/api";
import type {
  ArticleFormValues,
  ArticleStatus,
  CmsArticle,
  CmsAuthorOption,
  MediaAsset,
} from "@/lib/cms-types";
import { assertCmsFileSize } from "@/lib/upload-limits";

export type CmsArticlesPage = {
  items: CmsArticle[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function listCmsArticles(params?: {
  section?: string;
  status?: ArticleStatus;
  authorId?: string;
  q?: string;
  sponsored?: boolean;
  categorySlug?: string;
  sort?: "published" | "updated" | "created" | "title";
  editedFrom?: string;
  editedTo?: string;
  page?: number;
  pageSize?: number;
}) {
  const search = new URLSearchParams();
  if (params?.sort) search.set("sort", params.sort);
  if (params?.editedFrom) search.set("editedFrom", params.editedFrom);
  if (params?.editedTo) search.set("editedTo", params.editedTo);
  if (params?.section) search.set("section", params.section);
  if (params?.status) search.set("status", params.status);
  if (params?.authorId) search.set("authorId", params.authorId);
  if (params?.q) search.set("q", params.q);
  if (params?.sponsored === true) search.set("sponsored", "true");
  if (params?.categorySlug) search.set("categorySlug", params.categorySlug);
  if (params?.page != null) search.set("page", String(params.page));
  if (params?.pageSize != null) search.set("pageSize", String(params.pageSize));
  const qs = search.toString();
  return api.get<CmsArticlesPage>(`/cms/articles${qs ? `?${qs}` : ""}`);
}

export function getCmsArticle(id: string) {
  return api.get<CmsArticle>(`/cms/articles/${id}`);
}

export function createCmsArticle(
  body: Omit<
    Partial<ArticleFormValues>,
    "seriesId" | "seriesMode" | "videoUrl" | "videoMediaId" | "audioMediaId" | "sponsorName" | "seoTitleBg" | "seoDescriptionBg"
  > & {
    /** Omit to keep the current audio; `null` removes it. */
    audioMediaId?: string | null;
    titleBg: string;
    categoryBg: string;
    section: string;
    seriesId?: string | null;
    heroMediaId?: string | null;
    videoUrl?: string | null;
    videoMediaId?: string | null;
    sponsorName?: string | null;
    seoTitleBg?: string | null;
    seoDescriptionBg?: string | null;
  },
) {
  return api.post<CmsArticle>("/cms/articles", body);
}

export function updateCmsArticle(
  id: string,
  body: Omit<
    Partial<ArticleFormValues>,
    "seriesId" | "seriesMode" | "videoUrl" | "videoMediaId" | "audioMediaId" | "sponsorName" | "seoTitleBg" | "seoDescriptionBg"
  > & {
    /** Omit to keep the current audio; `null` removes it. */
    audioMediaId?: string | null;
    seriesId?: string | null;
    heroMediaId?: string | null;
    videoUrl?: string | null;
    videoMediaId?: string | null;
    sponsorName?: string | null;
    seoTitleBg?: string | null;
    seoDescriptionBg?: string | null;
  },
) {
  return api.patch<CmsArticle>(`/cms/articles/${id}`, body);
}

export function deleteCmsArticle(id: string) {
  return api.delete<{ ok: boolean; id: string }>(`/cms/articles/${id}`);
}

export function requestArticleChanges(id: string, note: string) {
  return api.post<CmsArticle>(`/cms/articles/${id}/request-changes`, { note });
}

export function queueArticleTranslation(id: string) {
  return api.post<{ ok: boolean }>(`/cms/articles/${id}/translate`);
}

export function queueArticleNarration(id: string) {
  return api.post<{ ok: boolean; queued?: boolean }>(
    `/cms/articles/${id}/narrate`,
  );
}

export function clearArticleNarration(id: string) {
  return api.delete<{ ok: boolean }>(`/cms/articles/${id}/narration`);
}

export function listCmsAuthors() {
  return api.get<CmsAuthorOption[]>("/cms/authors");
}

export function createCmsAuthor(
  nameBg: string,
  opts?: { isGuest?: boolean },
) {
  return api.post<CmsAuthorOption>("/cms/authors", {
    nameBg,
    ...(opts?.isGuest ? { isGuest: true } : {}),
  });
}

export async function uploadCmsMedia(
  file: File,
  creditBgOrMeta?:
    | string
    | {
        creditBg?: string
        titleBg?: string
        locationBg?: string
        folder?: string
        /** Public /gallery visibility; the server hides uploads unless this is true. */
        showInGallery?: boolean
      },
) {
  assertCmsFileSize(file)
  const meta =
    typeof creditBgOrMeta === 'string'
      ? { creditBg: creditBgOrMeta }
      : creditBgOrMeta ?? {}
  const pending = await api.upload<MediaAsset>(
    '/cms/media/upload',
    file,
    undefined,
    {
      folder: meta.folder ?? 'cms',
      ...(meta.creditBg ? { creditBg: meta.creditBg } : {}),
      ...(meta.titleBg ? { titleBg: meta.titleBg } : {}),
      ...(meta.locationBg ? { locationBg: meta.locationBg } : {}),
      ...(meta.showInGallery ? { showInGallery: 'true' } : {}),
    },
  )
  return waitForCmsMedia(pending)
}

export function getCmsMedia(id: string) {
  return api.get<MediaAsset>(`/cms/media/${id}`)
}

export async function waitForCmsMedia(
  asset: MediaAsset,
  opts?: { pollMs?: number; timeoutMs?: number },
) {
  if (!asset.status || asset.status === 'DONE') return asset
  if (asset.status === 'FAILED') {
    throw new Error(asset.error || 'Upload failed')
  }

  const pollMs = opts?.pollMs ?? 400
  const timeoutMs = opts?.timeoutMs ?? 120_000
  const started = Date.now()

  while (Date.now() - started < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, pollMs))
    const next = await getCmsMedia(asset.id)
    if (next.status === 'DONE') return next
    if (next.status === 'FAILED') {
      throw new Error(next.error || 'Upload failed')
    }
  }

  throw new Error('Upload is taking too long')
}

export function deleteCmsMedia(id: string) {
  return api.delete<{ ok: boolean; id: string }>(`/cms/media/${id}`)
}

/** Hide/show in the public /gallery feed; articles keep using the photo. */
export function setCmsMediaGalleryVisibility(ids: string[], showInGallery: boolean) {
  return api.patch<{ updated: number; showInGallery: boolean }>(
    '/cms/media/gallery-visibility',
    { ids, showInGallery },
  )
}

export type CmsMediaPageResult = {
  items: MediaAsset[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function listCmsMedia(
  opts?: {
    kind?: 'IMAGE' | 'VIDEO' | 'AUDIO'
    q?: string
    gallery?: 'shown' | 'hidden'
    page?: number
    pageSize?: number
  },
) {
  const params = new URLSearchParams()
  if (opts?.kind) params.set('kind', opts.kind)
  if (opts?.gallery) params.set('gallery', opts.gallery)
  if (opts?.q?.trim()) params.set('q', opts.q.trim())
  if (opts?.page != null) params.set('page', String(opts.page))
  if (opts?.pageSize != null) params.set('pageSize', String(opts.pageSize))
  const qs = params.toString()
  return api.get<CmsMediaPageResult | MediaAsset[]>(
    `/cms/media${qs ? `?${qs}` : ''}`,
  ).then((data) => {
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page: 1,
        pageSize: data.length || opts?.pageSize || 24,
        totalPages: 1,
      } satisfies CmsMediaPageResult
    }
    return data
  })
}

export function listPublicMedia(
  kind: 'IMAGE' | 'VIDEO' | 'AUDIO' = 'IMAGE',
  opts?: { limit?: number },
) {
  const params = new URLSearchParams()
  params.set('kind', kind)
  if (opts?.limit != null) params.set('limit', String(opts.limit))
  return api.get<
    Array<{
      id: string
      url: string
      thumbnailUrl?: string | null
      kind: string
      originalName?: string | null
      titleBg?: string | null
      titleEn?: string | null
      locationBg?: string | null
      locationEn?: string | null
      creditBg?: string | null
      creditEn?: string | null
      createdAt: string
    }>
  >(`/media?${params.toString()}`)
}

export type PublicArticlesPage = CmsArticlesPage;

export type PublicArticleListFilters = {
  series?: string
  location?: string
  topic?: string
  category?: string
  categorySlug?: string
  hasAudio?: boolean
  q?: string
  limit?: number
  page?: number
  pageSize?: number
};

function publicArticleQuery(section?: string, opts?: PublicArticleListFilters) {
  const params = new URLSearchParams();
  if (section) params.set("section", section);
  if (opts?.series) params.set("series", opts.series);
  if (opts?.location) params.set("location", opts.location);
  if (opts?.topic) params.set("topic", opts.topic);
  if (opts?.category) params.set("category", opts.category);
  if (opts?.categorySlug) params.set("categorySlug", opts.categorySlug);
  if (opts?.hasAudio === true) params.set("hasAudio", "true");
  if (opts?.q?.trim()) params.set("q", opts.q.trim());
  if (opts?.limit != null) params.set("limit", String(opts.limit));
  if (opts?.page != null) params.set("page", String(opts.page));
  if (opts?.pageSize != null) params.set("pageSize", String(opts.pageSize));
  return params.toString();
}

export function listPublicArticles(
  section?: string,
  opts?: PublicArticleListFilters,
) {
  const qs = publicArticleQuery(section, opts);
  return api.get<CmsArticle[]>(`/articles${qs ? `?${qs}` : ""}`);
}

export function listPublicArticlesPage(
  section?: string,
  opts?: PublicArticleListFilters,
) {
  const page = opts?.page ?? 1
  const pageSize = opts?.pageSize ?? 30
  const qs = publicArticleQuery(section, {
    ...opts,
    page,
    pageSize,
  })
  return api
    .get<PublicArticlesPage | CmsArticle[]>(`/articles${qs ? `?${qs}` : ""}`)
    .then((data) => {
      if (Array.isArray(data)) {
        return {
          items: data,
          total: data.length,
          page,
          pageSize: data.length || pageSize,
          totalPages: 1,
        } satisfies PublicArticlesPage
      }
      return data
    })
}

export function getPublicArticle(
  section: string,
  slug: string,
  opts?: { visitorKey?: string },
) {
  const params = new URLSearchParams();
  if (opts?.visitorKey) params.set("visitorKey", opts.visitorKey);
  const qs = params.toString();
  return api.get<CmsArticle>(
    `/articles/${encodeURIComponent(section)}/${encodeURIComponent(slug)}${qs ? `?${qs}` : ""}`,
  );
}

export function listRelatedArticles(
  section: string,
  slug: string,
  limit = 3,
) {
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  return api.get<CmsArticle[]>(
    `/articles/${encodeURIComponent(section)}/${encodeURIComponent(slug)}/related${qs ? `?${qs}` : ""}`,
  );
}

export function relateToArticle(
  section: string,
  slug: string,
  visitorKey: string,
) {
  return api.post<{ relateCount: number; viewerHasRelated: boolean }>(
    `/articles/${encodeURIComponent(section)}/${encodeURIComponent(slug)}/reactions`,
    { kind: "RELATE", visitorKey },
  );
}
