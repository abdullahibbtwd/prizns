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

const usePublicArticles = vi.fn()

vi.mock('@/lib/public-content', async () => {
  const actual = await vi.importActual<typeof import('@/lib/public-content')>(
    '@/lib/public-content',
  )
  return {
    ...actual,
    usePublicArticles: (...args: unknown[]) => usePublicArticles(...args),
  }
})

vi.mock('@/components/concept-3/RegionMap', () => ({
  RegionMap: () => null,
}))

describe('StoriesPage', () => {
  beforeEach(() => {
    usePublicArticles.mockReturnValue({
      data: [
        buildCmsArticle({
          section: 'stories',
          path: '/stories/village-life',
          slug: 'village-life',
          title: 'Village life',
          titleBg: 'Селски живот',
          subtitle: 'A quiet morning',
          subtitleBg: 'Тиха сутрин',
        }),
      ],
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

  it('reads location from the URL', () => {
    renderPage(<StoriesPage />, { route: '/stories?location=vidin&topic=test' })
    expect(usePublicArticles).toHaveBeenCalledWith('stories', {
      location: 'vidin',
    })
  })
})
