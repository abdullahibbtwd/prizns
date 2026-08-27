import { api } from "@/lib/api";
import type {
  ArticleFormValues,
  ArticleStatus,
  CmsArticle,
  CmsAuthorOption,
  MediaAsset,
} from "@/lib/cms-types";

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
  page?: number;
  pageSize?: number;
}) {
  const search = new URLSearchParams();
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
    "seriesId" | "seriesMode" | "videoUrl" | "videoMediaId" | "sponsorName" | "seoTitleBg" | "seoDescriptionBg"
  > & {
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
    "seriesId" | "seriesMode" | "videoUrl" | "videoMediaId" | "sponsorName" | "seoTitleBg" | "seoDescriptionBg"
  > & {
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

export function createCmsAuthor(nameBg: string) {
  return api.post<CmsAuthorOption>("/cms/authors", { nameBg });
}

export function uploadCmsMedia(
  file: File,
  creditBgOrMeta?:
    | string
    | {
        creditBg?: string
        titleBg?: string
        locationBg?: string
        folder?: string
      },
) {
  const meta =
    typeof creditBgOrMeta === 'string'
      ? { creditBg: creditBgOrMeta }
      : creditBgOrMeta ?? {}
  return api.upload<MediaAsset>(
    '/cms/media/upload',
    file,
    undefined,
    {
      folder: meta.folder ?? 'cms',
      ...(meta.creditBg ? { creditBg: meta.creditBg } : {}),
      ...(meta.titleBg ? { titleBg: meta.titleBg } : {}),
      ...(meta.locationBg ? { locationBg: meta.locationBg } : {}),
    },
  )
}

export function listCmsMedia(kind?: 'IMAGE' | 'VIDEO' | 'AUDIO') {
  const qs = kind ? `?kind=${encodeURIComponent(kind)}` : ''
  return api.get<MediaAsset[]>(`/cms/media${qs}`)
}

export function listPublicMedia(kind: 'IMAGE' | 'VIDEO' | 'AUDIO' = 'IMAGE') {
  return api.get<
    Array<{
      id: string
      url: string
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
  >(`/media?kind=${encodeURIComponent(kind)}`)
}

export function listPublicArticles(
  section?: string,
  opts?: {
    series?: string
    location?: string
    topic?: string
    category?: string
    categorySlug?: string
    hasAudio?: boolean
    q?: string
    limit?: number
  },
) {
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
  const qs = params.toString();
  return api.get<CmsArticle[]>(`/articles${qs ? `?${qs}` : ""}`);
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
