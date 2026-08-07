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
  q?: string;
  sponsored?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const search = new URLSearchParams();
  if (params?.section) search.set("section", params.section);
  if (params?.status) search.set("status", params.status);
  if (params?.q) search.set("q", params.q);
  if (params?.sponsored === true) search.set("sponsored", "true");
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
    "seriesId" | "seriesMode" | "videoUrl" | "videoMediaId" | "sponsorName"
  > & {
    titleBg: string;
    categoryBg: string;
    section: string;
    seriesId?: string | null;
    videoUrl?: string | null;
    videoMediaId?: string | null;
    sponsorName?: string | null;
  },
) {
  return api.post<CmsArticle>("/cms/articles", body);
}

export function updateCmsArticle(
  id: string,
  body: Omit<
    Partial<ArticleFormValues>,
    "seriesId" | "seriesMode" | "videoUrl" | "videoMediaId" | "sponsorName"
  > & {
    seriesId?: string | null;
    videoUrl?: string | null;
    videoMediaId?: string | null;
    sponsorName?: string | null;
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
  opts?: { series?: string },
) {
  const params = new URLSearchParams();
  if (section) params.set("section", section);
  if (opts?.series) params.set("series", opts.series);
  const qs = params.toString();
  return api.get<CmsArticle[]>(`/articles${qs ? `?${qs}` : ""}`);
}

export function getPublicArticle(section: string, slug: string) {
  return api.get<CmsArticle>(
    `/articles/${encodeURIComponent(section)}/${encodeURIComponent(slug)}`,
  );
}
