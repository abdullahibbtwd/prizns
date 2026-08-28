export type StoredArticleBlock =
  | {
      type: 'paragraph';
      textBg: string;
      textEn?: string | null;
    }
  | {
      type: 'pullquote';
      textBg: string;
      textEn?: string | null;
      citeBg: string;
      citeEn?: string | null;
    }
  | {
      type: 'note';
      labelBg: string;
      labelEn?: string | null;
      textBg: string;
      textEn?: string | null;
    }
    | {
      type: 'caption';
      textBg: string;
      textEn?: string | null;
    }
  | {
      type: 'image';
      mediaId?: string;
      url?: string;
      captionBg: string;
      captionEn?: string | null;
    }
  | {
      type: 'video';
      mediaId?: string;
      url?: string;
      captionBg: string;
      captionEn?: string | null;
    };

/** Public JournalArticle-shaped response for the reader. */
export type PublicArticleDto = {
  id: string;
  slug: string;
  sourceId?: string;
  section: string;
  path: string;
  category: string;
  categoryBg: string;
  title: string;
  titleBg: string;
  subtitle: string;
  subtitleBg: string;
  readTime: string;
  readTimeBg: string;
  location: string;
  locationBg: string;
  author: string;
  authorBg: string;
  authorSlug?: string;
  authorImage?: string;
  speaker?: string;
  speakerBg?: string;
  date: string;
  dateBg: string;
  image: string;
  /** First slot in the CMS media strip — photo or video. */
  heroKind?: 'image' | 'video';
  photoCredit: string;
  photoCreditBg: string;
  audioUrl?: string;
  audioDuration?: string;
  /** Resolved playback URL (external videoUrl or uploaded video media). */
  videoUrl?: string;
  videoMediaId?: string | null;
  body: Array<
    | { type: 'paragraph'; text: string; textBg: string }
    | {
        type: 'pullquote';
        text: string;
        textBg: string;
        cite: string;
        citeBg: string;
      }
    | {
        type: 'note';
        label: string;
        labelBg: string;
        text: string;
        textBg: string;
      }
    | { type: 'caption'; text: string; textBg: string }
    | { type: 'image'; url: string; text: string; textBg: string }
    | { type: 'video'; url: string; text: string; textBg: string }
  >;
  endLabel: string;
  endLabelBg: string;
  status: string;
  translationStatus: string;
  featured: boolean;
  sponsored: boolean;
  sourced: boolean;
  sponsorName?: string | null;
  behindStory: string;
  behindStoryBg: string;
  seoTitle: string | null;
  seoTitleBg: string | null;
  seoDescription: string | null;
  seoDescriptionBg: string | null;
  gallery: Array<{
    id: string;
    url: string;
    creditBg: string | null;
    kind?: 'IMAGE' | 'VIDEO' | 'AUDIO' | string | null;
  }>;
  tags: Array<{
    id: string;
    slug: string;
    kind: string;
    nameBg: string;
    nameEn: string | null;
    name: string;
  }>;
  categories?: Array<{
    id: string;
    slug: string;
    nameBg: string;
    nameEn: string | null;
    name: string;
    parentId: string | null;
  }>;
  categoryIds?: string[];
  series?: {
    id: string;
    slug: string;
    title: string;
    titleBg: string;
    titleEn: string | null;
    episodeNumber: number;
  } | null;
  /** Phase 3 — “I Relate” count (public article). */
  relateCount?: number;
  viewerHasRelated?: boolean;
};
