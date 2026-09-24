import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { SeriesContinue } from './SeriesContinue'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { n?: number; title?: string }) => {
      if (key === 'seriesContinue') return "Don't miss the continuation…"
      if (key === 'seriesContinueEpisode')
        return `Part ${opts?.n}: ${opts?.title}`
      if (key === 'seriesPreviousEpisode')
        return `← Previous part ${opts?.n}: ${opts?.title}`
      return key
    },
  }),
}))

const getPublicSeries = vi.fn()

vi.mock('@/lib/public-content', () => ({
  getPublicSeries: (...args: unknown[]) => getPublicSeries(...args),
}))

vi.mock('@/components/LocaleLink', () => ({
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string
    children: React.ReactNode
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}))

function renderContinue() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SeriesContinue
          series={{
            id: 's1',
            slug: 'grandmother',
            title: "Grandmother's Story",
            titleBg: 'Бабината история',
            episodeNumber: 1,
          }}
          currentSlug="part-one"
          lang="en"
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SeriesContinue', () => {
  it('renders a real link to the next episode', async () => {
    getPublicSeries.mockResolvedValue({
      slug: 'grandmother',
      episodes: [
        {
          sortOrder: 0,
          articleId: 'a1',
          slug: 'part-one',
          path: '/stories/part-one',
          title: 'Part one',
          titleBg: 'Част едно',
        },
        {
          sortOrder: 1,
          articleId: 'a2',
          slug: 'part-two',
          path: '/stories/part-two',
          title: 'Part two',
          titleBg: 'Част две',
        },
      ],
    })

    renderContinue()

    expect(
      await screen.findByText("Don't miss the continuation…"),
    ).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Part 2: Part two/i })
    expect(link).toHaveAttribute('href', '/stories/part-two')
  })

  it('hides the teaser when there is no next episode', async () => {
    getPublicSeries.mockResolvedValue({
      slug: 'grandmother',
      episodes: [
        {
          sortOrder: 0,
          articleId: 'a1',
          slug: 'part-one',
          path: '/stories/part-one',
          title: 'Part one',
          titleBg: 'Част едно',
        },
      ],
    })

    const { container } = renderContinue()
    await waitFor(() => expect(getPublicSeries).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })
})
