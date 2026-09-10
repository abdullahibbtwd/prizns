import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { buildCmsArticle } from '@/test/factories'
import { renderPage } from '@/test/render-page'
import StoriesPage from './index'

vi.mock('@/components/concept-3/JournalShell', () => ({
  JournalShell: ({
    children,
  }: {
    children: (ctx: { lang: 'en' | 'bg' }) => React.ReactNode
  }) => <div>{children({ lang: 'en' })}</div>,
}))

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
}))

vi.mock('@/hooks/useJournalLang', () => ({
  useJournalLang: () => ({ lang: 'en', setLang: vi.fn() }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number }) => {
      if (key === 'storiesCount') return `${opts?.count ?? 0} stories`
      if (key === 'humanStories') return 'Human Stories'
      if (key === 'humanStoriesEyebrow') return 'Stories'
      if (key === 'humanStoriesDesc') return 'Stories from the region'
      if (key === 'read') return 'Read'
      return key
    },
  }),
}))

const usePublicArticleListing = vi.fn()

vi.mock('@/lib/public-content', async () => {
  const actual = await vi.importActual<typeof import('@/lib/public-content')>(
    '@/lib/public-content',
  )
  return {
    ...actual,
    usePublicArticleListing: (...args: unknown[]) =>
      usePublicArticleListing(...args),
  }
})

vi.mock('@/components/concept-3/RegionMap', () => ({
  RegionMap: () => null,
}))

describe('StoriesPage', () => {
  beforeEach(() => {
    const article = buildCmsArticle({
      section: 'stories',
      path: '/stories/village-life',
      slug: 'village-life',
      title: 'Village life',
      titleBg: 'Селски живот',
      subtitle: 'A quiet morning',
      subtitleBg: 'Тиха сутрин',
    })
    usePublicArticleListing.mockReturnValue({
      items: [article],
      total: 1,
      totalPages: 1,
      pageSize: 30,
      isLoading: false,
      isError: false,
    })
  })

  it('lists human stories from the API', () => {
    renderPage(<StoriesPage />, { route: '/stories' })
    expect(screen.getByRole('heading', { name: 'Human Stories' })).toBeInTheDocument()
    expect(screen.getByText('Village life')).toBeInTheDocument()
    expect(screen.getByText('1 stories')).toBeInTheDocument()
  })

  it('does not render location, topic, or series dropdowns', () => {
    renderPage(<StoriesPage />, { route: '/stories' })
    expect(screen.queryByText('Location')).not.toBeInTheDocument()
    expect(screen.queryByText('Topic')).not.toBeInTheDocument()
    expect(screen.queryByText('Series')).not.toBeInTheDocument()
  })

  it('reads location and page from the URL', () => {
    renderPage(<StoriesPage />, { route: '/stories?location=vidin&topic=test&page=2' })
    expect(usePublicArticleListing).toHaveBeenCalledWith('stories', {
      location: 'vidin',
      page: 2,
    })
  })

  it('renders pagination when there is more than one page', () => {
    usePublicArticleListing.mockReturnValue({
      items: [
        buildCmsArticle({
          section: 'stories',
          path: '/stories/village-life',
          slug: 'village-life',
          title: 'Village life',
        }),
      ],
      total: 48,
      totalPages: 2,
      pageSize: 30,
      isLoading: false,
    })
    renderPage(<StoriesPage />, { route: '/stories?page=1' })
    expect(screen.getByLabelText('Pagination')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('48 stories')).toBeInTheDocument()
  })

  it('shows loading instead of the empty copy', () => {
    usePublicArticleListing.mockReturnValue({
      items: [],
      total: 0,
      totalPages: 1,
      pageSize: 30,
      isLoading: true,
      isError: false,
    })
    renderPage(<StoriesPage />, { route: '/stories' })
    expect(screen.getAllByText('Loading…').length).toBeGreaterThan(0)
    expect(screen.queryByText('No published stories yet.')).not.toBeInTheDocument()
  })
})
