import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
    uploadForm: vi.fn(),
  },
}))

import {
  clearArticleNarration,
  createCmsArticle,
  createCmsAuthor,
  deleteCmsArticle,
  getCmsArticle,
  getPublicArticle,
  listCmsArticles,
  listCmsAuthors,
  listCmsMedia,
  listPublicArticles,
  listPublicMedia,
  listRelatedArticles,
  queueArticleNarration,
  queueArticleTranslation,
  relateToArticle,
  updateCmsArticle,
  uploadCmsMedia,
} from '@/lib/articles-api'
import {
  createCmsShopProduct,
  createShopCheckout,
  createShopCodOrder,
  getCmsShopOrder,
  getPublicShopProduct,
  listCmsShopOrders,
  listCmsShopProducts,
  listPublicShopProducts,
  markShopOrderDelivered,
  shipCmsShopOrder,
  trackShopOrder,
  updateCmsShopProduct,
} from '@/lib/shop-api'
import {
  deleteCmsNewsletterSubscriber,
  listCmsNewsletterSubscribers,
  subscribeNewsletter,
} from '@/lib/newsletter-api'
import {
  createPublicContact,
  getCmsContact,
  listCmsContact,
  updateCmsContact,
} from '@/lib/contact-api'
import {
  createDonationCheckout,
  getCmsDonationTrend,
  listCmsDonations,
} from '@/lib/donations-api'
import {
  createCmsTag,
  deleteCmsTag,
  geocodeCmsTag,
  listCmsTags,
  listPlacesMap,
  listPublicTags,
  updateCmsTag,
} from '@/lib/tags-api'
import {
  createCmsCategory,
  deleteCmsCategory,
  listCmsCategories,
  listPublicCategories,
} from '@/lib/categories-api'
import {
  getReaderMe,
  getSaveStatus,
  listSavedArticles,
  logoutReader,
  refreshReaderSession,
  requestMagicLink,
  saveArticle,
  unsaveArticle,
  verifyMagicLink,
} from '@/lib/reader-api'
import {
  createPublicPartnership,
  getCmsPartnership,
  listCmsPartnerships,
  updateCmsPartnership,
} from '@/lib/partnerships-api'
import {
  convertCmsSubmission,
  createPublicSubmission,
  deleteCmsSubmission,
  getCmsSubmission,
  listCmsSubmissions,
  updateCmsSubmission,
} from '@/lib/submissions-api'
import { getAnalyticsSummary, sendAnalyticsBeacon } from '@/lib/analytics-api'
import { fetchRegionalContext, suggestCmsAi, askArchive } from '@/lib/ai-api'
import {
  getCmsDigestPreview,
  listCmsDigestHistory,
  sendCmsDigest,
} from '@/lib/digest-api'
import { listCmsUsers, updateCmsUser, createCmsUser, getCmsProfile, updateCmsProfile } from '@/lib/users-api'
import {
  createCmsTodo,
  deleteCmsTodo,
  getDashboardChecklist,
  listCmsTodos,
  updateCmsTodo,
} from '@/lib/dashboard-api'
import { cmsGlobalSearch } from '@/lib/cms-search-api'
import { getCmsSeoOverview } from '@/lib/seo-api'
import {
  awardCmsBadge,
  createCmsStoryYear,
  evaluateAuthorBadges,
  getCmsStoryYear,
  getStoryOfTheYear,
  listCmsBadges,
  listCmsStoryYear,
  setCmsStoryYearNominations,
  updateCmsStoryYear,
  voteStoryOfTheYear,
} from '@/lib/community-api'
import {
  approveCmsSocialPost,
  deleteCmsSocialPost,
  generateCmsSocial,
  getCmsSocialPlatforms,
  listCmsSocialPosts,
  saveCmsSocialPlatforms,
  updateCmsSocialPost,
} from '@/lib/social-api'
import {
  createCmsAuthor as createCmsAuthorFull,
  createCmsAuthorQuick,
  createCmsSeries,
  deleteCmsAuthor,
  deleteCmsSeries,
  getCmsAuthor,
  getCmsSeries,
  listCmsAuthors as listCmsAuthorsFull,
  listCmsSeries,
  setCmsSeriesEpisodes,
  updateCmsAuthor,
  updateCmsSeries,
} from '@/lib/cms-content-api'

const mocked = vi.mocked(api)

beforeEach(() => {
  mocked.get.mockReset().mockResolvedValue({ ok: true })
  mocked.post.mockReset().mockResolvedValue({ ok: true })
  mocked.patch.mockReset().mockResolvedValue({ ok: true })
  mocked.put.mockReset().mockResolvedValue({ ok: true })
  mocked.delete.mockReset().mockResolvedValue({ ok: true })
  mocked.upload.mockReset().mockResolvedValue({ ok: true })
  mocked.uploadForm.mockReset().mockResolvedValue({ ok: true })
})

describe('articles-api', () => {
  it('lists CMS articles with filters', async () => {
    await listCmsArticles({
      section: 'places',
      status: 'PUBLISHED',
      q: 'vidin',
      sponsored: true,
      page: 2,
      pageSize: 9,
    })
    expect(mocked.get).toHaveBeenCalledWith(
      '/cms/articles?section=places&status=PUBLISHED&q=vidin&sponsored=true&page=2&pageSize=9',
    )
  })

  it('reads, writes, and queues article jobs', async () => {
    await getCmsArticle('art-1')
    await createCmsArticle({
      titleBg: 'Title',
      categoryBg: 'Cat',
      section: 'places',
    })
    await updateCmsArticle('art-1', { titleBg: 'Updated' })
    await deleteCmsArticle('art-1')
    await queueArticleTranslation('art-1')
    await queueArticleNarration('art-1')
    await clearArticleNarration('art-1')
    await listCmsAuthors()
    await createCmsAuthor('Мария')

    expect(mocked.get).toHaveBeenCalledWith('/cms/articles/art-1')
    expect(mocked.post).toHaveBeenCalledWith(
      '/cms/articles',
      expect.objectContaining({ titleBg: 'Title' }),
    )
    expect(mocked.patch).toHaveBeenCalledWith('/cms/articles/art-1', {
      titleBg: 'Updated',
    })
    expect(mocked.delete).toHaveBeenCalledWith('/cms/articles/art-1')
    expect(mocked.post).toHaveBeenCalledWith('/cms/articles/art-1/translate')
    expect(mocked.post).toHaveBeenCalledWith('/cms/articles/art-1/narrate')
    expect(mocked.delete).toHaveBeenCalledWith('/cms/articles/art-1/narration')
    expect(mocked.get).toHaveBeenCalledWith('/cms/authors')
    expect(mocked.post).toHaveBeenCalledWith('/cms/authors', { nameBg: 'Мария' })
  })

  it('lists public articles and related content', async () => {
    await listPublicArticles('stories', {
      series: 'voices',
      hasAudio: true,
      location: 'vidin',
    })
    await getPublicArticle('places', 'belogradchik', { visitorKey: 'v1' })
    await listRelatedArticles('places', 'belogradchik', 4)
    await relateToArticle('places', 'belogradchik', 'v1')
    await listPublicMedia('VIDEO')
    await listCmsMedia('IMAGE')

    expect(mocked.get).toHaveBeenCalledWith(
      '/articles?section=stories&series=voices&location=vidin&hasAudio=true',
    )
    expect(mocked.get).toHaveBeenCalledWith(
      '/articles/places/belogradchik?visitorKey=v1',
    )
    expect(mocked.get).toHaveBeenCalledWith(
      '/articles/places/belogradchik/related?limit=4',
    )
    expect(mocked.post).toHaveBeenCalledWith(
      '/articles/places/belogradchik/reactions',
      { kind: 'RELATE', visitorKey: 'v1' },
    )
    expect(mocked.get).toHaveBeenCalledWith('/media?kind=VIDEO')
    expect(mocked.get).toHaveBeenCalledWith('/cms/media?kind=IMAGE')
  })

  it('uploads CMS media with string credit or metadata object', async () => {
    const file = new File(['x'], 'hero.jpg', { type: 'image/jpeg' })
    await uploadCmsMedia(file, 'Photo credit')
    expect(mocked.upload).toHaveBeenCalledWith(
      '/cms/media/upload',
      file,
      undefined,
      { folder: 'cms', creditBg: 'Photo credit' },
    )

    await uploadCmsMedia(file, { titleBg: 'Hero', folder: 'gallery' })
    expect(mocked.upload).toHaveBeenCalledWith(
      '/cms/media/upload',
      file,
      undefined,
      { folder: 'gallery', titleBg: 'Hero' },
    )
  })
})

describe('shop-api', () => {
  it('covers public shop flows', async () => {
    await listPublicShopProducts()
    await getPublicShopProduct('mug')
    await createShopCheckout([{ productId: 'p1', qty: 2 }])
    await createShopCodOrder({
      items: [{ productId: 'p1', qty: 1 }],
      email: 'a@b.c',
      name: 'A',
      line1: '1 St',
      city: 'Vidin',
      postal: '3700',
    })
    await trackShopOrder('PRZ-1', 'a@b.c')
    await markShopOrderDelivered('PRZ-1', 'a@b.c')

    expect(mocked.get).toHaveBeenCalledWith('/shop/products')
    expect(mocked.get).toHaveBeenCalledWith('/shop/products/mug')
    expect(mocked.post).toHaveBeenCalledWith(
      '/shop/checkout',
      expect.objectContaining({ successPath: '/shop/success' }),
    )
    expect(mocked.post).toHaveBeenCalledWith(
      '/shop/checkout/cod',
      expect.objectContaining({ email: 'a@b.c' }),
    )
    expect(mocked.post).toHaveBeenCalledWith('/shop/orders/track', {
      publicId: 'PRZ-1',
      email: 'a@b.c',
    })
  })

  it('covers CMS shop products and orders', async () => {
    await listCmsShopProducts()
    await createCmsShopProduct({
      titleBg: 'Mug',
      priceCents: 1500,
      stock: 4,
    })
    await updateCmsShopProduct('p1', { stock: 3 })
    await listCmsShopOrders({ page: 1, status: 'PAID' })
    await getCmsShopOrder('o1')
    await shipCmsShopOrder('o1')

    expect(mocked.get).toHaveBeenCalledWith('/cms/shop/products')
    expect(mocked.post).toHaveBeenCalledWith(
      '/cms/shop/products',
      expect.objectContaining({ titleBg: 'Mug' }),
    )
    expect(mocked.patch).toHaveBeenCalledWith('/cms/shop/products/p1', {
      stock: 3,
    })
    expect(mocked.get).toHaveBeenCalledWith(
      '/cms/shop/orders?page=1&status=PAID',
    )
    expect(mocked.patch).toHaveBeenCalledWith('/cms/shop/orders/o1/ship')
  })
})

describe('newsletter / contact / donations', () => {
  it('normalizes newsletter emails', async () => {
    await subscribeNewsletter('  Reader@Example.com ')
    expect(mocked.post).toHaveBeenCalledWith('/newsletter/subscribe', {
      email: 'reader@example.com',
      source: 'website',
    })
    await listCmsNewsletterSubscribers({ page: 1, q: 'reader' })
    await deleteCmsNewsletterSubscriber('n1')
    expect(mocked.get).toHaveBeenCalledWith(
      '/cms/newsletter/subscribers?page=1&q=reader',
    )
  })

  it('creates and manages contact inquiries', async () => {
    await createPublicContact({
      name: 'Jane',
      email: 'j@x.com',
      subject: 'Hi',
      message: 'Hello',
    })
    await listCmsContact({ status: 'NEW', category: 'GENERAL' })
    await getCmsContact('c1')
    await updateCmsContact('c1', { status: 'REPLIED' })
    expect(mocked.post).toHaveBeenCalledWith(
      '/contact',
      expect.objectContaining({ name: 'Jane' }),
    )
    expect(mocked.get).toHaveBeenCalledWith(
      '/cms/contact?status=NEW&category=GENERAL',
    )
  })

  it('creates donation checkout and lists CMS donations', async () => {
    await createDonationCheckout({ amountBgn: 10, email: 'd@x.com' })
    await listCmsDonations({ status: 'COMPLETED' })
    await getCmsDonationTrend('month')
    expect(mocked.post).toHaveBeenCalledWith('/donations/checkout', {
      amountBgn: 10,
      email: 'd@x.com',
    })
    expect(mocked.get).toHaveBeenCalledWith('/cms/donations?status=COMPLETED')
    expect(mocked.get).toHaveBeenCalledWith('/cms/donations/trend?granularity=month')
  })
})

describe('tags / reader / partnerships / submissions', () => {
  it('covers tag CRUD', async () => {
    await listPublicTags('LOCATION')
    await listCmsTags()
    await createCmsTag({ kind: 'TOPIC', nameBg: 'Река' })
    await updateCmsTag('t1', { nameBg: 'Дунав' })
    await geocodeCmsTag('t1')
    await listPlacesMap()
    await deleteCmsTag('t1')
    expect(mocked.get).toHaveBeenCalledWith('/tags?kind=LOCATION')
    expect(mocked.get).toHaveBeenCalledWith('/cms/tags')
    expect(mocked.post).toHaveBeenCalledWith('/cms/tags/t1/geocode')
    expect(mocked.get).toHaveBeenCalledWith('/places/map')
    expect(mocked.post).toHaveBeenCalledWith('/cms/tags', {
      kind: 'TOPIC',
      nameBg: 'Река',
    })
  })

  it('covers category CRUD', async () => {
    await listPublicCategories()
    await listCmsCategories()
    await createCmsCategory({ nameBg: 'Видин', slug: 'vidin' })
    await deleteCmsCategory('c1')
    expect(mocked.get).toHaveBeenCalledWith('/categories')
    expect(mocked.get).toHaveBeenCalledWith('/cms/categories')
    expect(mocked.post).toHaveBeenCalledWith('/cms/categories', {
      nameBg: 'Видин',
      slug: 'vidin',
    })
  })

  it('covers reader magic-link and saves', async () => {
    await requestMagicLink({ email: 'r@x.com', locale: 'en' })
    await verifyMagicLink('tok')
    await refreshReaderSession()
    await logoutReader()
    await getReaderMe()
    await listSavedArticles()
    await getSaveStatus('art-1')
    await saveArticle('art-1')
    await unsaveArticle('art-1')
    expect(mocked.post).toHaveBeenCalledWith(
      '/reader-auth/request',
      expect.objectContaining({ email: 'r@x.com' }),
    )
    expect(mocked.get).toHaveBeenCalledWith(
      '/reader/saves/status?articleId=art-1',
    )
    expect(mocked.delete).toHaveBeenCalledWith('/reader/saves/art-1')
  })

  it('covers partnerships', async () => {
    await createPublicPartnership({
      organization: 'NGO',
      contactName: 'A',
      email: 'a@x.com',
      type: 'sponsor',
      message: 'Hi',
    })
    await listCmsPartnerships({ status: 'NEW' })
    await getCmsPartnership('p1')
    await updateCmsPartnership('p1', { status: 'CONTACTED' })
    expect(mocked.get).toHaveBeenCalledWith('/cms/partnerships?status=NEW')
  })

  it('builds submission form data and maps status', async () => {
    const photo = new File(['p'], 'a.jpg', { type: 'image/jpeg' })
    await createPublicSubmission({
      name: 'N',
      email: 'n@x.com',
      place: 'Vidin',
      title: 'Story',
      category: 'places',
      description: 'd',
      story: 's',
      ownWork: true,
      photos: [photo],
    })
    expect(mocked.uploadForm).toHaveBeenCalledWith(
      '/submissions',
      expect.any(FormData),
    )
    await listCmsSubmissions({ status: 'review' })
    expect(mocked.get).toHaveBeenCalledWith('/cms/submissions?status=REVIEW')
    await getCmsSubmission('s1')
    await updateCmsSubmission('s1', { status: 'approved', notes: 'ok' })
    expect(mocked.patch).toHaveBeenCalledWith('/cms/submissions/s1', {
      status: 'APPROVED',
      notes: 'ok',
    })
    await convertCmsSubmission('s1')
    await deleteCmsSubmission('s1')
  })
})

describe('cms dashboard / users / digest / social / community / content', () => {
  it('covers dashboard todos', async () => {
    await getDashboardChecklist()
    await listCmsTodos()
    await createCmsTodo({ title: 'Edit' })
    await updateCmsTodo('t1', { done: true })
    await deleteCmsTodo('t1')
    expect(mocked.get).toHaveBeenCalledWith('/cms/dashboard/checklist')
    expect(mocked.post).toHaveBeenCalledWith('/cms/todos', { title: 'Edit' })
  })

  it('covers users, digest, analytics, and AI', async () => {
    await listCmsUsers({ role: 'EDITOR', q: 'a' })
    await updateCmsUser('u1', { isActive: false })
    await createCmsUser({
      name: 'Iva',
      email: 'iva@prizni.bg',
      password: 'secret12',
      roles: ['AUTHOR'],
      showOnAuthors: true,
    })
    await getCmsProfile()
    await updateCmsProfile({ bio: 'Hi' })
    await getCmsDigestPreview('ser-1')
    await listCmsDigestHistory()
    await sendCmsDigest({ seriesId: 'ser-1' })
    await getAnalyticsSummary('week')
    await sendAnalyticsBeacon({
      visitorKey: 'v',
      event: 'pageview',
      path: '/stories/x',
    })
    await suggestCmsAi({ titleBg: 'T' })
    await fetchRegionalContext({ section: 'places', slug: 'x' })
    await askArchive({ question: 'What is Kukeri?' })
    await cmsGlobalSearch('vidin')
    await getCmsSeoOverview()
    expect(mocked.get).toHaveBeenCalledWith(
      '/cms/users?q=a&role=EDITOR',
    )
    expect(mocked.get).toHaveBeenCalledWith(
      '/cms/digest/preview?seriesId=ser-1',
    )
    expect(mocked.get).toHaveBeenCalledWith('/cms/analytics/summary?range=week')
    expect(mocked.get).toHaveBeenCalledWith('/cms/dashboard/search?q=vidin')
    expect(mocked.get).toHaveBeenCalledWith('/cms/seo/overview')
    expect(mocked.post).toHaveBeenCalledWith('/archive/ask', {
      question: 'What is Kukeri?',
    })
  })

  it('covers social posts', async () => {
    await listCmsSocialPosts({ status: 'DRAFT' })
    await getCmsSocialPlatforms()
    await saveCmsSocialPlatforms(['instagram'])
    await generateCmsSocial('art-1')
    await updateCmsSocialPost('sp-1', { body: 'hi' })
    await approveCmsSocialPost('sp-1')
    await deleteCmsSocialPost('sp-1')
    expect(mocked.post).toHaveBeenCalledWith('/cms/social/generate', {
      articleId: 'art-1',
    })
    expect(mocked.put).toHaveBeenCalledWith('/cms/social/platforms', {
      platforms: ['instagram'],
    })
  })

  it('covers badges and story of the year', async () => {
    await listCmsBadges()
    await awardCmsBadge('a1', 'b1')
    await evaluateAuthorBadges('a1')
    await getStoryOfTheYear()
    await voteStoryOfTheYear('art-1')
    await listCmsStoryYear()
    await getCmsStoryYear('sy-1')
    await createCmsStoryYear({ year: 2026, titleBg: 'Year' })
    await updateCmsStoryYear('sy-1', { status: 'OPEN' })
    await setCmsStoryYearNominations('sy-1', ['art-1'])
    expect(mocked.post).toHaveBeenCalledWith('/story-of-the-year/vote', {
      articleId: 'art-1',
    })
    expect(mocked.put).toHaveBeenCalledWith('/cms/story-year/sy-1/nominations', {
      articleIds: ['art-1'],
    })
  })

  it('splits author aliases and series cover media', async () => {
    await listCmsAuthorsFull(true)
    await listCmsAuthorsFull()
    await getCmsAuthor('a1')
    await createCmsAuthorFull({ nameBg: 'A', aliases: 'one, two' })
    await updateCmsAuthor('a1', { aliases: 'x' })
    await createCmsAuthorQuick('Quick')
    await listCmsSeries()
    await getCmsSeries('s1')
    await createCmsSeries({ titleBg: 'Series', coverMediaId: '' })
    await updateCmsSeries('s1', { titleBg: 'S', coverMediaId: '' })
    await setCmsSeriesEpisodes('s1', ['art-1'])
    await deleteCmsAuthor('a1')
    await deleteCmsSeries('s1')
    expect(mocked.get).toHaveBeenCalledWith('/cms/authors?all=1')
    expect(mocked.post).toHaveBeenCalledWith(
      '/cms/authors',
      expect.objectContaining({ aliases: ['one', 'two'] }),
    )
    expect(mocked.post).toHaveBeenCalledWith(
      '/cms/series',
      expect.objectContaining({ coverMediaId: undefined }),
    )
    expect(mocked.patch).toHaveBeenCalledWith(
      '/cms/series/s1',
      expect.objectContaining({ coverMediaId: null }),
    )
    expect(mocked.delete).toHaveBeenCalledWith('/cms/authors/a1')
    expect(mocked.delete).toHaveBeenCalledWith('/cms/series/s1')
  })
})
