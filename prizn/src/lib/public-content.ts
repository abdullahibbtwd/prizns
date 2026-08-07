import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { listPublicArticles, listPublicMedia } from "@/lib/articles-api";
import type { CmsArticle } from "@/lib/cms-types";

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

export function usePublicArticles(section: string, series?: string) {
  return useQuery({
    queryKey: ["public-articles", section, series || ""],
    queryFn: () => listPublicArticles(section, series ? { series } : undefined),
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
