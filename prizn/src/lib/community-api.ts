import { api } from '@/lib/api'

export type PublicAuthorBadge = {
  id: string
  slug: string
  nameBg: string
  nameEn: string | null
  descriptionBg: string
  descriptionEn: string | null
  icon: string
  awardedAt: string
  source: string
}

export type CmsBadge = {
  id: string
  slug: string
  nameBg: string
  nameEn: string | null
  descriptionBg: string
  descriptionEn: string | null
  icon: string
  minPublished: number | null
  isActive: boolean
  sortOrder: number
  _count: { authors: number }
  authors: Array<{
    awardedAt: string
    source: string
    author: {
      id: string
      slug: string
      nameBg: string
      nameEn: string | null
    }
  }>
}

export function listCmsBadges() {
  return api.get<CmsBadge[]>('/cms/badges')
}

export function awardCmsBadge(authorId: string, badgeId: string) {
  return api.post('/cms/badges/award', { authorId, badgeId })
}

export function evaluateAuthorBadges(authorId: string) {
  return api.post<{ awarded: string[]; published: number }>(
    `/cms/badges/evaluate/${encodeURIComponent(authorId)}`,
  )
}

export type StoryYearNomination = {
  id: string
  articleId: string
  path: string
  titleBg: string
  titleEn: string | null
  subtitleBg: string
  subtitleEn: string | null
  locationBg: string
  locationEn: string | null
  heroUrl: string | null
  authorNameBg: string | null
  authorNameEn: string | null
  authorSlug: string | null
  voteCount: number
}

export type StoryYearPublic = {
  id: string
  year: number
  titleBg: string
  titleEn: string | null
  descriptionBg: string
  descriptionEn: string | null
  status: 'DRAFT' | 'OPEN' | 'CLOSED'
  votingOpen: boolean
  opensAt: string | null
  closesAt: string | null
  totalVotes: number
  myVoteArticleId: string | null
  nominations: StoryYearNomination[]
}

export type CmsStoryYearCampaign = {
  id: string
  year: number
  titleBg: string
  titleEn: string | null
  descriptionBg: string
  descriptionEn: string | null
  status: 'DRAFT' | 'OPEN' | 'CLOSED'
  opensAt: string | null
  closesAt: string | null
  _count: { nominations: number; votes: number }
}

export function getStoryOfTheYear() {
  return api.get<StoryYearPublic | null>('/story-of-the-year')
}

export function voteStoryOfTheYear(articleId: string) {
  return api.post<StoryYearPublic>('/story-of-the-year/vote', { articleId })
}

export function listCmsStoryYear() {
  return api.get<CmsStoryYearCampaign[]>('/cms/story-year')
}

export type CmsStoryYearDetail = {
  id: string
  year: number
  titleBg: string
  titleEn: string | null
  descriptionBg: string
  descriptionEn: string | null
  status: 'DRAFT' | 'OPEN' | 'CLOSED'
  opensAt: string | null
  closesAt: string | null
  nominations: Array<{
    id: string
    articleId: string
    sortOrder: number
    article: {
      id: string
      titleBg: string
      titleEn: string | null
      path: string
      section: string
      slug: string
      status: string
      heroMedia: { url: string } | null
    }
    _count: { votes: number }
  }>
  _count: { votes: number }
}

export function getCmsStoryYear(id: string) {
  return api.get<CmsStoryYearDetail>(`/cms/story-year/${encodeURIComponent(id)}`)
}

export function createCmsStoryYear(body: {
  year: number
  titleBg: string
  titleEn?: string
  descriptionBg?: string
  status?: 'DRAFT' | 'OPEN' | 'CLOSED'
}) {
  return api.post<CmsStoryYearCampaign>('/cms/story-year', body)
}

export function updateCmsStoryYear(
  id: string,
  body: Partial<{
    titleBg: string
    titleEn: string | null
    descriptionBg: string
    descriptionEn: string | null
    status: 'DRAFT' | 'OPEN' | 'CLOSED'
  }>,
) {
  return api.patch(`/cms/story-year/${encodeURIComponent(id)}`, body)
}

export function setCmsStoryYearNominations(id: string, articleIds: string[]) {
  return api.put(`/cms/story-year/${encodeURIComponent(id)}/nominations`, {
    articleIds,
  })
}
