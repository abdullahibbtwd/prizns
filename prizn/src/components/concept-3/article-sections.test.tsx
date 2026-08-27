import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { buildCmsArticle } from '@/test/factories'
import { HumanStoriesSection } from './HumanStoriesSection'
import { OurPlacesSection } from './OurPlacesSection'
import { TraditionsSection } from './TraditionsSection'
import { NewsSection } from './NewsSection'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
}))

const usePublicArticles = vi.fn()

vi.mock('@/lib/public-content', async () => {
  const actual = await vi.importActual<typeof import('@/lib/public-content')>(
    '@/lib/public-content',
  )
  return {
    ...actual,
    usePublicArticles: (...args: unknown[]) => usePublicArticles(...args),
    usePublicCategories: () => ({ data: [] }),
  }
})

vi.mock('@/components/concept-3/RegionMap', () => ({
  RegionMap: () => null,
}))

function renderSection(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('article grid sections', () => {
  it('HumanStoriesSection shows loading skeletons while fetching', () => {
    usePublicArticles.mockReturnValue({ data: undefined, isLoading: true })
    renderSection(<HumanStoriesSection lang="en" />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('HumanStoriesSection renders story cards', () => {
    usePublicArticles.mockReturnValue({
      data: [
        buildCmsArticle({
          section: 'stories',
          slug: 'village',
          path: '/stories/village',
          title: 'Village portrait',
          titleBg: 'Село',
        }),
      ],
    })
    renderSection(<HumanStoriesSection lang="en" />)
    expect(screen.getByText('Human Stories')).toBeInTheDocument()
    expect(screen.getByText('Village portrait')).toBeInTheDocument()
  })

  it('OurPlacesSection renders place cards', () => {
    usePublicArticles.mockReturnValue({
      data: [
        buildCmsArticle({
          section: 'places',
          slug: 'vidin-bridge',
          path: '/places/vidin-bridge',
          title: 'Danube bridge',
          titleBg: 'Мост',
        }),
      ],
    })
    renderSection(<OurPlacesSection lang="en" />)
    expect(screen.getByText('Explore the Region')).toBeInTheDocument()
    expect(screen.getByText('Danube bridge')).toBeInTheDocument()
  })

  it('TraditionsSection renders tradition cards', () => {
    usePublicArticles.mockReturnValue({
      data: [
        buildCmsArticle({
          section: 'traditions',
          slug: 'kukeri',
          path: '/traditions/kukeri',
          title: 'Kukeri ritual',
          titleBg: 'Кукери',
        }),
      ],
    })
    renderSection(<TraditionsSection lang="en" />)
    expect(screen.getByText('Traditions')).toBeInTheDocument()
    expect(screen.getByText('Kukeri ritual')).toBeInTheDocument()
  })

  it('NewsSection returns null when empty', () => {
    usePublicArticles.mockReturnValue({ data: [] })
    const { container } = renderSection(<NewsSection lang="en" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('NewsSection renders when articles exist', () => {
    usePublicArticles.mockReturnValue({
      data: [
        buildCmsArticle({
          section: 'news',
          slug: 'update',
          path: '/news/update',
          title: 'Regional update',
          titleBg: 'Новина',
        }),
      ],
    })
    renderSection(<NewsSection lang="en" />)
    expect(screen.getByText('Regional update')).toBeInTheDocument()
  })
})
