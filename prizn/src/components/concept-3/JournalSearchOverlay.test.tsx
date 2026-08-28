import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildCmsArticle } from '@/test/factories'
import { JournalSearchOverlay } from './JournalSearchOverlay'

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

const usePublicArticleSearch = vi.fn()
const usePopularStories = vi.fn()

vi.mock('@/lib/public-content', async () => {
  const actual = await vi.importActual<typeof import('@/lib/public-content')>(
    '@/lib/public-content',
  )
  return {
    ...actual,
    usePublicArticleSearch: (...args: unknown[]) =>
      usePublicArticleSearch(...args),
    usePopularStories: (...args: unknown[]) => usePopularStories(...args),
  }
})

function renderOverlay() {
  return render(
    <MemoryRouter>
      <JournalSearchOverlay lang="en" onClose={vi.fn()} />
    </MemoryRouter>,
  )
}

describe('JournalSearchOverlay', () => {
  beforeEach(() => {
    usePopularStories.mockReturnValue({ data: [], isFetching: false })
  })

  it('asks for at least two characters before searching', () => {
    usePublicArticleSearch.mockReturnValue({ data: [], isFetching: false })
    renderOverlay()
    expect(
      screen.getByText('Type at least 2 characters to search.'),
    ).toBeInTheDocument()
  })

  it('shows a searching state while results are fetching', async () => {
    usePublicArticleSearch.mockImplementation((q: string) => ({
      data: [],
      isFetching: q.length >= 2,
    }))
    const user = userEvent.setup()
    renderOverlay()
    await user.type(screen.getByRole('searchbox'), 'vi')
    expect(await screen.findByText('Searching…')).toBeInTheDocument()
  })

  it('renders matching stories after a query', async () => {
    usePublicArticleSearch.mockImplementation((q: string) => ({
      data:
        q === 'village'
          ? [
              buildCmsArticle({
                title: 'Village portrait',
                titleBg: 'Село',
                section: 'stories',
                slug: 'village',
                path: '/stories/village',
              }),
            ]
          : [],
      isFetching: false,
    }))
    const user = userEvent.setup()
    renderOverlay()
    await user.type(screen.getByRole('searchbox'), 'village')
    expect(await screen.findByText('Village portrait')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Village portrait/ })).toHaveAttribute(
      'href',
      '/stories/village',
    )
  })

  it('shows an empty state when nothing matches', async () => {
    usePublicArticleSearch.mockReturnValue({ data: [], isFetching: false })
    const user = userEvent.setup()
    renderOverlay()
    await user.type(screen.getByRole('searchbox'), 'zzzz')
    await waitFor(() => {
      expect(screen.getByText('No stories for “zzzz”.')).toBeInTheDocument()
    })
  })

  it('links popular chips to the most visited stories', () => {
    usePublicArticleSearch.mockReturnValue({ data: [], isFetching: false })
    usePopularStories.mockReturnValue({
      data: [
        {
          id: 'a1',
          slug: 'belogradchik',
          path: '/places/belogradchik',
          section: 'places',
          title: 'Belogradchik',
          titleBg: 'Белоградчик',
        },
        {
          id: 'a2',
          slug: 'kilims',
          path: '/traditions/kilims',
          section: 'traditions',
          title: 'Chiprovtsi kilims',
          titleBg: 'Чипровски килими',
        },
      ],
      isFetching: false,
    })
    renderOverlay()
    expect(screen.getByText('Popular:')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Belogradchik' })).toHaveAttribute(
      'href',
      '/places/belogradchik',
    )
    expect(
      screen.getByRole('link', { name: 'Chiprovtsi kilims' }),
    ).toHaveAttribute('href', '/traditions/kilims')
  })
})
