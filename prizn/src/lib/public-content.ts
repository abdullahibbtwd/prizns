import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { listPublicArticles, listPublicMedia } from "@/lib/articles-api";
import { listPopularStories } from "@/lib/analytics-api";
import type { CmsArticle } from "@/lib/cms-types";
import { listPublicTags, type TagKind } from "@/lib/tags-api";
import { listPublicCategories } from "@/lib/categories-api";

export type PublicAuthor = {
  id: string;
  slug: string;
  path: string;
  name: string;
  nameBg: string;
  role: string;
  roleBg: string;
  location: string;
  locationBg: string;
  quote: string;
  quoteBg: string;
  bio: string;
  bioBg: string;
  image: string;
  aliases: string[];
  storyCount: number;
  badges?: Array<{
    id: string;
    slug: string;
    nameBg: string;
    nameEn: string | null;
    descriptionBg: string;
    descriptionEn: string | null;
    icon: string;
    awardedAt: string;
  }>;
};

export type PublicSeries = {
  id: string;
  slug: string;
  title: string;
  titleBg: string;
  description: string;
  descriptionBg: string;
  image: string;
  count: string;
  countBg: string;
  episodeCount: number;
  path: string;
  episodes: Array<{
    sortOrder: number;
    articleId: string;
    slug: string;
    path: string;
    title: string;
    titleBg: string;
  }>;
};

export function listPublicAuthors() {
  return api.get<PublicAuthor[]>("/authors");
}

export function getPublicAuthor(slug: string) {
  return api.get<PublicAuthor>(`/authors/${encodeURIComponent(slug)}`);
}

export function listPublicSeries() {
  return api.get<PublicSeries[]>("/series");
}

export function getPublicSeries(slug: string) {
  return api.get<PublicSeries>(`/series/${encodeURIComponent(slug)}`);
}

/** Use API rows only (including empty). No static fixtures. */
export function preferApi<T>(apiItems: T[] | undefined): T[] {
  return apiItems ?? [];
}

export function usePublicArticles(
  section?: string,
  opts?:
    | string
    | {
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
  const filters =
    typeof opts === "string" ? { series: opts || undefined } : opts
  return useQuery({
    queryKey: [
      "public-articles",
      section || "all",
      filters?.series || "",
      filters?.location || "",
      filters?.topic || "",
      filters?.category || "",
      filters?.categorySlug || "",
      filters?.hasAudio ? "audio" : "",
      filters?.q?.trim() || "",
      filters?.limit ?? "",
    ],
    queryFn: () =>
      listPublicArticles(section, {
        series: filters?.series,
        location: filters?.location,
        topic: filters?.topic,
        category: filters?.category,
        categorySlug: filters?.categorySlug,
        hasAudio: filters?.hasAudio,
        q: filters?.q,
        limit: filters?.limit,
      }),
    enabled: (filters?.q?.trim().length ?? 0) === 0 || (filters?.q?.trim().length ?? 0) >= 2,
    staleTime: 60_000,
    retry: false,
  });
}

export function usePublicArticleSearch(q: string) {
  const trimmed = q.trim()
  return useQuery({
    queryKey: ["public-article-search", trimmed],
    queryFn: () => listPublicArticles(undefined, { q: trimmed, limit: 12 }),
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
    retry: false,
  })
}

export function usePopularStories(limit = 5) {
  return useQuery({
    queryKey: ["popular-stories", limit],
    queryFn: () => listPopularStories(limit),
    staleTime: 5 * 60_000,
    retry: false,
  })
}

export function usePublicCategories() {
  return useQuery({
    queryKey: ["public-categories"],
    queryFn: listPublicCategories,
    staleTime: 60_000,
    retry: false,
  });
}

export function usePublicTags(kind?: TagKind) {
  return useQuery({
    queryKey: ["public-tags", kind || "all"],
    queryFn: () => listPublicTags(kind),
    staleTime: 60_000,
    retry: false,
  });
}

export function usePublicAuthors() {
  return useQuery({
    queryKey: ["public-authors"],
    queryFn: listPublicAuthors,
    staleTime: 60_000,
    retry: false,
  });
}

export function usePublicSeries() {
  return useQuery({
    queryKey: ["public-series"],
    queryFn: listPublicSeries,
    staleTime: 60_000,
    retry: false,
  });
}

export type PublicMediaItem = {
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
}

export function usePublicMedia(kind: "IMAGE" | "VIDEO" | "AUDIO" = "IMAGE") {
  return useQuery({
    queryKey: ["public-media", kind],
    queryFn: () => listPublicMedia(kind),
    staleTime: 60_000,
    retry: false,
  });
}

export function articlePath(
  article: Pick<CmsArticle, "path" | "slug" | "section">,
) {
  if (article.path) return article.path;
  const section =
    article.section === "human_stories" || article.section === "featured"
      ? "stories"
      : article.section === "human-stories"
        ? "stories"
        : article.section;
  return `/${section}/${article.slug}`;
}
