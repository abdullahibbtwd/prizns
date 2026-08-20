import { screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { buildCmsArticle } from '@/test/factories'
import { renderPage } from '@/test/render-page'
import ArticlePage from './index'

vi.mock('@/components/concept-3/LuxuryVideoPlayer', () => ({
  LuxuryVideoPlayer: ({ src }: { src: string }) => (
    <div data-testid="story-video">{src}</div>
  ),
}))

vi.mock('@/components/concept-3/JournalShell', () => ({
  JournalShell: ({
    children,
  }: {
    children: (ctx: { lang: 'en' | 'bg' }) => React.ReactNode
  }) => <div>{children({ lang: 'en' })}</div>,
}))

vi.mock('@/hooks/useJournalLang', () => ({
  useJournalLang: () => ({ lang: 'en', setLang: vi.fn() }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/hooks/usePageAnalytics', () => ({
  useAnalyticsMeta: vi.fn(),
  AnalyticsProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/lib/reader-auth', () => ({
  useReaderAuth: () => ({ reader: null, loading: false }),
}))

vi.mock('@/lib/reader-api', () => ({
  getSaveStatus: vi.fn().mockResolvedValue({ saved: false }),
  saveArticle: vi.fn(),
  unsaveArticle: vi.fn(),
}))

const getPublicArticle = vi.fn()

vi.mock('@/lib/articles-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/articles-api')>(
    '@/lib/articles-api',
  )
  return {
    ...actual,
    getPublicArticle: (...args: unknown[]) => getPublicArticle(...args),
    listRelatedArticles: vi.fn().mockResolvedValue([]),
    relateToArticle: vi.fn(),
  }
})

function renderArticle(route = '/stories/village-life') {
  return renderPage(
    <Routes>
      <Route path="/stories/:slug" element={<ArticlePage />} />
    </Routes>,
    { route },
  )
}

describe('ArticlePage', () => {
  it('renders article content when the API returns a match', async () => {
    getPublicArticle.mockResolvedValue(
      buildCmsArticle({
        section: 'stories',
        slug: 'village-life',
        path: '/stories/village-life',
        title: 'Village life',
        titleBg: 'Селски живот',
        subtitle: 'Morning in the valley',
        subtitleBg: 'Сутрин в долината',
        body: [
          {
            type: 'paragraph',
            text: 'First paragraph of the story.',
            textBg: 'Първи параграф.',
          },
        ],
      }),
    )

    renderArticle()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Village life' })).toBeInTheDocument()
    })
    expect(screen.getByText('First paragraph of the story.')).toBeInTheDocument()
  })

  it('shows the sourced pill when the article is marked sourced', async () => {
    getPublicArticle.mockResolvedValue(
      buildCmsArticle({
        section: 'stories',
        slug: 'village-life',
        path: '/stories/village-life',
        title: 'Village life',
        titleBg: 'Селски живот',
        sourced: true,
        body: [
          {
            type: 'paragraph',
            text: 'First paragraph of the story.',
            textBg: 'Първи параграф.',
          },
        ],
      }),
    )

    renderArticle()

    expect(await screen.findByText('Sourced')).toBeInTheDocument()
  })

  it('redirects home when the article path does not match', async () => {
    getPublicArticle.mockResolvedValue(
      buildCmsArticle({
        section: 'stories',
        slug: 'other',
        path: '/stories/other-story',
        title: 'Other',
        titleBg: 'Друго',
      }),
    )

    renderArticle('/stories/village-life')

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Other' })).not.toBeInTheDocument()
    })
  })

  it('places extra photos in the story body instead of the hero slider', async () => {
    getPublicArticle.mockResolvedValue(
      buildCmsArticle({
        section: 'stories',
        slug: 'village-life',
        path: '/stories/village-life',
        title: 'Village life',
        titleBg: 'Селски живот',
        image: 'https://cdn.example/hero.jpg',
        gallery: [
          { id: 'g2', url: 'https://cdn.example/two.jpg', creditBg: null },
        ],
        body: [
          {
            type: 'paragraph',
            text: 'First paragraph of the story.',
            textBg: 'Първи параграф.',
          },
          {
            type: 'image',
            url: 'https://cdn.example/two.jpg',
            text: 'Archive photo',
            textBg: 'Архивна снимка',
          },
        ],
      }),
    )

    renderArticle()
    await screen.findByRole('heading', { name: 'Village life' })
    expect(screen.getByRole('img', { name: 'Village life' })).toHaveAttribute(
      'src',
      'https://cdn.example/hero.jpg',
    )
    expect(
      screen.queryByRole('button', { name: 'nextPhoto' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Archive photo' })).toHaveAttribute(
      'src',
      'https://cdn.example/two.jpg',
    )
    expect(screen.getByText('Archive photo')).toBeInTheDocument()
  })

  it('keeps the hero photo when a story also has a video', async () => {
    getPublicArticle.mockResolvedValue(
      buildCmsArticle({
        section: 'stories',
        slug: 'village-life',
        path: '/stories/village-life',
        title: 'Village life',
        titleBg: 'Селски живот',
        image: 'https://cdn.example/hero.jpg',
        heroKind: 'image',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        body: [
          {
            type: 'paragraph',
            text: 'First paragraph of the story.',
            textBg: 'Първи параграф.',
          },
        ],
      }),
    )

    renderArticle()
    await screen.findByRole('heading', { name: 'Village life' })
    expect(screen.getByRole('img', { name: 'Village life' })).toHaveAttribute(
      'src',
      'https://cdn.example/hero.jpg',
    )
    expect(screen.getByTestId('story-video')).toHaveTextContent(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    )
  })

  it('plays video as the hero when the story marks video as hero', async () => {
    getPublicArticle.mockResolvedValue(
      buildCmsArticle({
        section: 'stories',
        slug: 'village-life',
        path: '/stories/village-life',
        title: 'Village life',
        titleBg: 'Селски живот',
        image: 'https://cdn.example/poster.jpg',
        heroKind: 'video',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        body: [
          {
            type: 'paragraph',
            text: 'First paragraph of the story.',
            textBg: 'Първи параграф.',
          },
        ],
      }),
    )

    renderArticle()
    await screen.findByRole('heading', { name: 'Village life' })
    expect(screen.queryByRole('img', { name: 'Village life' })).not.toBeInTheDocument()
    expect(screen.getByTestId('story-video')).toHaveTextContent(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    )
  })
})
