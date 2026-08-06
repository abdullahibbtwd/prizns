import type {
  ArticleSection,
  BodyBlock,
  CmsArticle,
} from '@/lib/cms-types'

/** Listing card shapes matching `journalContent` cards in content.ts */

export type PlaceCard = {
  id: string
  name: string
  nameBg: string
  sub: string
  subBg: string
  image: string
  readTime: string
  action: string
  actionBg: string
  detail: string
}

export type TraditionCard = {
  id: string
  title: string
  titleBg: string
  sub: string
  image: string
  description: string
}

export type HumanStoryCard = {
  id: string
  title: string
  titleBg: string
  author: string
  readTime: string
  readTimeBg: string
  location: string
  image: string
  excerpt: string
  series?: {
    id: string
    slug?: string
    title: string
    titleBg: string
    episodeNumber: number
  } | null
}

function articleId(article: CmsArticle): string {
  return article.slug || article.id
}

function firstParagraphBg(body?: BodyBlock[] | CmsArticle['body']): string {
  if (!body?.length) return ''
  const first = body[0] as { type?: string; textBg?: string; text?: string }
  if (first.type === 'paragraph') {
    return first.textBg || first.text || ''
  }
  return ''
}

/** Map a CMS/public article into a Places listing card (`content.ts` shape). */
export function toPlaceCard(article: CmsArticle): PlaceCard {
  const nameBg = article.titleBg
  const name = article.title || nameBg
  return {
    id: articleId(article),
    name,
    nameBg,
    sub: article.subtitle || article.subtitleBg,
    subBg: article.subtitleBg,
    image: article.image || '',
    readTime: article.readTime || article.readTimeBg,
    action: 'Discover',
    actionBg: 'Открийте',
    detail:
      firstParagraphBg(article.bodyRaw) ||
      firstParagraphBg(article.body) ||
      article.subtitleBg,
  }
}

/** Map article into a Traditions listing card. */
export function toTraditionCard(article: CmsArticle): TraditionCard {
  return {
    id: articleId(article),
    title: article.title || article.titleBg,
    titleBg: article.titleBg,
    sub: article.subtitle || article.subtitleBg,
    image: article.image || '',
    description:
      firstParagraphBg(article.bodyRaw) ||
      firstParagraphBg(article.body) ||
      article.subtitleBg,
  }
}

/** Map article into a Human Stories listing card. */
export function toHumanStoryCard(article: CmsArticle): HumanStoryCard {
  const series = article.series
  return {
    id: articleId(article),
    title: article.title || article.titleBg,
    titleBg: article.titleBg,
    author: article.author || article.authorBg || '',
    readTime: article.readTime || article.readTimeBg,
    readTimeBg: article.readTimeBg,
    location: article.location || article.locationBg,
    image: article.image || '',
    excerpt: article.subtitle || article.subtitleBg,
    series: series
      ? {
          id: series.id,
          slug: series.slug,
          title: series.title || series.titleEn || series.titleBg,
          titleBg: series.titleBg,
          episodeNumber: series.episodeNumber,
        }
      : null,
  }
}

export function toSectionCard(article: CmsArticle) {
  const section = (
    article.section === 'human_stories' ? 'human-stories' : article.section
  ) as ArticleSection

  if (section === 'places') return { section, card: toPlaceCard(article) }
  if (section === 'traditions')
    return { section, card: toTraditionCard(article) }
  if (section === 'human-stories')
    return { section, card: toHumanStoryCard(article) }
  return {
    section,
    card: toHumanStoryCard(article),
  }
}
