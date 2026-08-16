import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderPage } from '@/test/render-page'
import CmsSeoPage from './SeoPage'

const getCmsSeoOverview = vi.fn()

vi.mock('@/hooks/useJournalLang', () => ({
  useJournalLang: () => ({ lang: 'en', setLang: vi.fn() }),
}))

vi.mock('@/lib/seo-api', () => ({
  getCmsSeoOverview: (...args: unknown[]) => getCmsSeoOverview(...args),
}))

describe('CmsSeoPage', () => {
  beforeEach(() => {
    getCmsSeoOverview.mockResolvedValue({
      siteUrl: 'https://prizni.bg',
      sitemapUrl: 'https://prizni.bg/sitemap.xml',
      robotsUrl: 'https://prizni.bg/robots.txt',
      feedUrl: 'https://prizni.bg/feed.xml',
      published: 4,
      withUniqueMeta: 2,
      missingTitle: 1,
      missingDescription: 2,
      coveragePct: 50,
      evergreen: { traditions: 3, places: 5 },
      gaps: [
        {
          id: 'story-1',
          path: '/stories/walnut-paths',
          section: 'traditions',
          titleBg: 'Орехови пътеки',
          titleEn: 'Walnut paths',
          hasTitle: false,
          hasDescription: false,
        },
      ],
    })
  })

  it('shows evergreen strategy, live technical SEO, and meta gaps', async () => {
    renderPage(<CmsSeoPage />)

    expect(await screen.findByText('Walnut paths')).toBeInTheDocument()
    expect(screen.getByText('cms.seoDesk.strategyTitle')).toBeInTheDocument()
    expect(screen.getByText('/stories/walnut-paths')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'cms.seoDesk.edit' })).toHaveAttribute(
      'href',
      '/cms/stories/story-1',
    )
    expect(
      screen.getAllByRole('link', { name: /cms.seoDesk.openSitemap/ })[0],
    ).toHaveAttribute('href', 'https://prizni.bg/sitemap.xml')
    expect(screen.getByText('cms.seoDesk.schema')).toBeInTheDocument()
    expect(screen.getByText('cms.seoDesk.canonical')).toBeInTheDocument()
  })
})
