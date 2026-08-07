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
  speaker?: string;
  speakerBg?: string;
  date: string;
  dateBg: string;
  image: string;
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
  >;
  endLabel: string;
  endLabelBg: string;
  status: string;
  translationStatus: string;
  featured: boolean;
  sponsored: boolean;
  sponsorName?: string | null;
  series?: {
    id: string;
    slug: string;
    title: string;
    titleBg: string;
    titleEn: string | null;
    episodeNumber: number;
  } | null;
};
