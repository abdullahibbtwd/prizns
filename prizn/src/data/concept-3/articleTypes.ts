/**
 * Shared types for slug-based journal articles.
 * Modeled after StoryReaderModal reading layout.
 */

export type ArticleSection =
  | 'featured'
  | 'human-stories'
  | 'places'
  | 'traditions'
  | 'discover'
  | 'voices'
  | 'sports'
  | 'events'
  | 'video'
  | 'campaigns'
  | 'gallery'

/** Shared reading layout; bodies differ per article via these blocks. */
export type ArticleBlock =
  | {
      type: 'paragraph'
      text: string
      textBg: string
    }
  | {
      type: 'pullquote'
      text: string
      textBg: string
      cite: string
      citeBg: string
    }
  | {
      /** Soft editorial aside — same visual language, different note per story */
      type: 'note'
      label: string
      labelBg: string
      text: string
      textBg: string
    }
  | {
      type: 'caption'
      text: string
      textBg: string
    }

export interface JournalArticle {
  /** Matches / links from cards later, e.g. "walnut-keeper-varbovo" */
  slug: string
  /** Source card id from journalContent when applicable */
  sourceId?: string
  section: ArticleSection
  /** Suggested future path, e.g. "/stories/walnut-keeper-varbovo" */
  path: string

  category: string
  categoryBg: string
  title: string
  titleBg: string
  subtitle: string
  subtitleBg: string

  readTime: string
  readTimeBg: string
  location: string
  locationBg: string

  author: string
  authorBg: string
  /** Optional link to `/authors/:slug` */
  authorSlug?: string
  /** For voices: spoken by */
  speaker?: string
  speakerBg?: string
  date: string
  dateBg: string

  image: string
  photoCredit: string
  photoCreditBg: string

  /** Optional audio for voices section pages */
  audioUrl?: string
  audioDuration?: string
  /** YouTube / Vimeo / uploaded video playback URL */
  videoUrl?: string

  /** Present when the story belongs to a series */
  series?: {
    id: string
    slug?: string
    title: string
    titleBg: string
    titleEn?: string | null
    episodeNumber: number
  } | null

  /**
   * Body blocks in reading order.
   * First `paragraph` is intended for the drop-cap treatment (like the modal).
   */
  body: ArticleBlock[]

  endLabel: string
  endLabelBg: string
}
