import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { buildCmsArticle } from '@/test/factories'
import { QuoteSection } from './QuoteSection'
import { JournalFooter } from './JournalFooter'
import { VideoSection } from './VideoSection'

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

vi.mock('./LuxuryVideoPlayer', () => ({
  LuxuryVideoPlayer: ({ title }: { title: string }) => (
    <div data-testid="video-player">{title}</div>
  ),
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

function renderSection(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('misc concept-3 sections', () => {
  it('QuoteSection renders journal quote lines', () => {
    renderSection(<QuoteSection lang="en" />)
    expect(screen.getByText('PRIZNI', { selector: 'span' })).toBeInTheDocument()
  })

  it('JournalFooter renders primary navigation links', () => {
    renderSection(<JournalFooter lang="en" />)
    expect(screen.getByRole('link', { name: 'PRIZNI' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
  })

  it('VideoSection renders featured and side videos', () => {
    usePublicArticles.mockReturnValue({
      data: [
        buildCmsArticle({
          section: 'video',
          slug: 'feature',
          title: 'Featured film',
          titleBg: 'Филм',
          videoUrl: 'https://cdn.example/feature.mp4',
        }),
        buildCmsArticle({
          section: 'video',
          slug: 'side-one',
          title: 'Side film',
          titleBg: 'Страничен',
          videoUrl: 'https://cdn.example/side.mp4',
        }),
      ],
    })

    renderSection(<VideoSection lang="en" />)
    expect(screen.getByText('Film desk')).toBeInTheDocument()
    expect(screen.getAllByTestId('video-player')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Side film' })).toBeInTheDocument()
  })
})
