export type ArticleStatus =
  | "DRAFT"
  | "REVIEW"
  | "SCHEDULED"
  | "PUBLISHED"
  | "ARCHIVED";

export type TranslationStatus = "PENDING" | "RUNNING" | "READY" | "FAILED";

export type ArticleSection =
  | "featured"
  | "human-stories"
  | "places"
  | "traditions"
  | "discover"
  | "voices"
  | "sports"
  | "events"
  | "news"
  | "video"
  | "campaigns"
  | "gallery";

export type TagKind = "LOCATION" | "TOPIC" | "CATEGORY";

export type CmsTag = {
  id: string;
  slug: string;
  kind: TagKind;
  nameBg: string;
  nameEn: string | null;
  name?: string;
};

export type BodyBlock =
  | { type: "paragraph"; textBg: string; textEn?: string | null }
  | {
      type: "pullquote";
      textBg: string;
      textEn?: string | null;
      citeBg: string;
      citeEn?: string | null;
    }
  | {
      type: "note";
      labelBg: string;
      labelEn?: string | null;
      textBg: string;
      textEn?: string | null;
    }
  | { type: "caption"; textBg: string; textEn?: string | null }
  | {
      type: "image";
      mediaId?: string;
      url?: string;
      captionBg: string;
      captionEn?: string | null;
    }
  | {
      type: "video";
      mediaId?: string;
      url?: string;
      captionBg: string;
      captionEn?: string | null;
    };

export type CmsArticle = {
  id: string;
  slug: string;
  section: string;
  path: string;
  status: ArticleStatus;
  title: string;
  titleBg: string;
  subtitle: string;
  subtitleBg: string;
  category: string;
  categoryBg: string;
  readTime: string;
  readTimeBg: string;
  location: string;
  locationBg: string;
  date: string;
  dateBg: string;
  author: string;
  authorBg: string;
  authorSlug?: string;
  authorId?: string | null;
  speaker?: string;
  speakerBg?: string;
  image: string;
  heroKind?: 'image' | 'video';
  photoCredit: string;
  photoCreditBg: string;
  audioUrl?: string;
  audioDuration?: string;
  videoUrl?: string;
  heroMediaId?: string | null;
  audioMediaId?: string | null;
  videoMediaId?: string | null;
  galleryMediaIds?: string[];
  gallery?: Array<{
    id: string;
    url: string;
    creditBg?: string | null;
    kind?: 'IMAGE' | 'VIDEO' | 'AUDIO' | string | null;
  }>;
  endLabel: string;
  endLabelBg: string;
  body: Array<{
    type: string;
    text?: string;
    textBg?: string;
    cite?: string;
    citeBg?: string;
    label?: string;
    labelBg?: string;
    url?: string;
  }>;
  bodyRaw?: BodyBlock[];
  featured: boolean;
  sponsored: boolean;
  sourced: boolean;
  sponsorName?: string | null;
  behindStory?: string;
  behindStoryBg?: string;
  seoTitle?: string | null;
  seoTitleBg?: string | null;
  seoDescription?: string | null;
  seoDescriptionBg?: string | null;
  tags?: CmsTag[];
  tagIds?: string[];
  categories?: Array<{
    id: string;
    slug: string;
    nameBg: string;
    nameEn: string | null;
    name: string;
    parentId: string | null;
  }>;
  categoryIds?: string[];
  translationStatus: TranslationStatus;
  translationError?: string | null;
  sourceLang?: string | null;
  narrationStatus?: 'IDLE' | 'PENDING' | 'RUNNING' | 'READY' | 'FAILED';
  narrationError?: string | null;
  publishedAt?: string | null;
  updatedAt?: string;
  series?: {
    id: string;
    slug?: string;
    titleBg: string;
    titleEn: string | null;
    title?: string;
    episodeNumber: number;
  } | null;
  relateCount?: number;
  viewerHasRelated?: boolean;
};

export type CmsAuthorOption = {
  id: string;
  slug: string;
  nameBg: string;
  nameEn: string | null;
  roleBg: string;
  roleEn: string | null;
  imageUrl: string | null;
};

export type CmsAuthor = CmsAuthorOption & {
  locationBg: string | null;
  locationEn: string | null;
  quoteBg: string | null;
  quoteEn: string | null;
  bioBg: string | null;
  bioEn: string | null;
  aliases: string[];
  isActive: boolean;
  showOnAuthors: boolean;
  translationStatus?: TranslationStatus;
  translationError?: string | null;
  createdAt?: string;
  updatedAt?: string;
  _count?: { articles: number };
};

export type SeriesStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type CmsSeriesEpisode = {
  id: string;
  seriesId: string;
  articleId: string;
  sortOrder: number;
  article: {
    id: string;
    slug: string;
    section: string;
    path: string;
    status: ArticleStatus;
    titleBg: string;
    titleEn: string | null;
    categoryBg: string;
    heroMedia: { id: string; url: string } | null;
  };
};

export type CmsSeries = {
  id: string;
  slug: string;
  titleBg: string;
  titleEn: string | null;
  descriptionBg: string;
  descriptionEn: string | null;
  status: SeriesStatus;
  coverMediaId: string | null;
  coverMedia: { id: string; url: string } | null;
  episodes: CmsSeriesEpisode[];
  translationStatus?: TranslationStatus;
  translationError?: string | null;
  episodeStats?: {
    total: number;
    published: number;
    draft: number;
    scheduled: number;
    review: number;
    archived: number;
  };
  _count?: { episodes: number };
  createdAt?: string;
  updatedAt?: string;
};

export type AuthorFormValues = {
  nameBg: string;
  roleBg: string;
  locationBg: string;
  quoteBg: string;
  bioBg: string;
  imageUrl: string;
  aliases: string;
  isActive: boolean;
  showOnAuthors: boolean;
};

export type SeriesFormValues = {
  titleBg: string;
  descriptionBg: string;
  status: SeriesStatus;
  coverMediaId: string;
};

export type MediaAsset = {
  id: string
  key: string
  url: string
  mimeType: string
  kind: 'IMAGE' | 'AUDIO' | 'VIDEO'
  originalName?: string | null
  titleBg?: string | null
  titleEn?: string | null
  locationBg?: string | null
  locationEn?: string | null
  creditBg?: string | null
}

export type ArticleFormValues = {
  section: ArticleSection;
  status: ArticleStatus;
  categoryBg: string;
  categoryIds: string[];
  titleBg: string;
  subtitleBg: string;
  readTimeMinutes: number;
  readTimeUnit: "minutes" | "hours";
  locationBg: string;
  dateIso: string;
  scheduledAt: string;
  photoCreditBg: string;
  endLabelBg: string;
  speakerBg: string;
  audioDuration: string;
  authorId: string;
  galleryMediaIds: string[];
  audioMediaId: string;
  videoUrl: string;
  videoMediaId: string;
  featured: boolean;
  sponsored: boolean;
  sourced: boolean;
  sponsorName: string;
  behindStoryBg: string;
  seoTitleBg: string;
  seoDescriptionBg: string;
  tagIds: string[];
  body: BodyBlock[];
  seriesMode: "standalone" | "series";
  seriesId: string;
};

export const ARTICLE_SECTIONS: ArticleSection[] = [
  "human-stories",
  "featured",
  "places",
  "traditions",
  "discover",
  "voices",
  "sports",
  "events",
  "news",
  "video",
  "campaigns",
  "gallery",
];

/** Sports and News live as topic tags, not editorial sections. */
export const TOPIC_TAG_SECTIONS: ArticleSection[] = ["sports", "news"];

export const EDITOR_SECTIONS: ArticleSection[] = ARTICLE_SECTIONS.filter(
  (section) => !TOPIC_TAG_SECTIONS.includes(section),
);

export function editorSectionChoices(
  current?: ArticleSection | null,
): ArticleSection[] {
  if (current && !EDITOR_SECTIONS.includes(current)) {
    return [...EDITOR_SECTIONS, current];
  }
  return EDITOR_SECTIONS;
}
