import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { FeaturedStoryCard } from './FeaturedStoryCard'
import { buildCmsArticle } from '@/test/factories'

vi.mock('@/lib/public-content', async () => {
  const actual = await vi.importActual<typeof import('@/lib/public-content')>(
    '@/lib/public-content',
  )
  return {
    ...actual,
    usePublicArticles: vi.fn(),
  }
})

import { usePublicArticles } from '@/lib/public-content'

describe('FeaturedStoryCard', () => {
  it('renders nothing without featured content', () => {
    vi.mocked(usePublicArticles).mockReturnValue({
      data: [],
      isLoading: false,
    } as never)
    const { container } = render(
      <MemoryRouter>
        <FeaturedStoryCard lang="en" />
      </MemoryRouter>,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the first featured story', () => {
    vi.mocked(usePublicArticles).mockReturnValue({
      data: [
        buildCmsArticle({
          title: 'Featured place',
          titleBg: 'Място',
          location: 'Vidin',
          locationBg: 'Видин',
          sponsored: true,
          sponsorName: 'Partner',
        }),
      ],
      isLoading: false,
    } as never)

    render(
      <MemoryRouter>
        <FeaturedStoryCard lang="en" />
      </MemoryRouter>,
    )
    expect(screen.getByText('Featured Editorial')).toBeInTheDocument()
    expect(screen.getByText('Featured place')).toBeInTheDocument()
    expect(screen.getAllByText('Sponsored by Partner')).toHaveLength(2)
  })
})
