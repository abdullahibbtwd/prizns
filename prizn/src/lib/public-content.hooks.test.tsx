import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import {
  usePopularStories,
  usePublicArticleSearch,
  usePublicArticles,
  usePublicAuthors,
  usePublicMedia,
  usePublicSeries,
  usePublicTags,
} from './public-content'
import * as articlesApi from './articles-api'
import * as tagsApi from './tags-api'
import * as analyticsApi from './analytics-api'

vi.mock('./articles-api', () => ({
  listPublicArticles: vi.fn(),
  listPublicMedia: vi.fn(),
}))

vi.mock('./tags-api', () => ({
  listPublicTags: vi.fn(),
}))

vi.mock('./analytics-api', () => ({
  listPopularStories: vi.fn(),
}))

vi.mock('./api', () => ({
  api: {
    get: vi.fn(),
  },
}))

import { api } from './api'

function wrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

describe('public content hooks', () => {
  it('fetches articles for a section', async () => {
    vi.mocked(articlesApi.listPublicArticles).mockResolvedValue([
      { id: '1', slug: 'story', section: 'places' } as never,
    ])
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    const { result } = renderHook(
      () => usePublicArticles('places', { hasAudio: true }),
      { wrapper: wrapper(client) },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(articlesApi.listPublicArticles).toHaveBeenCalledWith('places', {
      series: undefined,
      location: undefined,
      topic: undefined,
      category: undefined,
      categorySlug: undefined,
      hasAudio: true,
      q: undefined,
      limit: undefined,
    })
    expect(result.current.data).toHaveLength(1)
  })

  it('searches public articles when the query is at least two characters', async () => {
    vi.mocked(articlesApi.listPublicArticles).mockResolvedValue([
      { id: '1', slug: 'vidin', section: 'places' } as never,
    ])
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    const { result } = renderHook(() => usePublicArticleSearch('Vidin'), {
      wrapper: wrapper(client),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(articlesApi.listPublicArticles).toHaveBeenCalledWith(undefined, {
      q: 'Vidin',
      limit: 12,
    })
  })

  it('fetches public tags', async () => {
    vi.mocked(tagsApi.listPublicTags).mockResolvedValue([
      { id: 't-1', slug: 'vidin', kind: 'LOCATION' } as never,
    ])
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    const { result } = renderHook(() => usePublicTags('LOCATION'), {
      wrapper: wrapper(client),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(tagsApi.listPublicTags).toHaveBeenCalledWith('LOCATION')
  })

  it('fetches public authors via the API client', async () => {
    vi.mocked(api.get).mockResolvedValue([
      { slug: 'maria', name: 'Maria', nameBg: 'Мария' },
    ])
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    const { result } = renderHook(() => usePublicAuthors(), {
      wrapper: wrapper(client),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.get).toHaveBeenCalledWith('/authors')
  })

  it('fetches public series via the API client', async () => {
    vi.mocked(api.get).mockResolvedValue([
      { slug: 'danube', title: 'Danube', titleBg: 'Дунав' },
    ])
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    const { result } = renderHook(() => usePublicSeries(), {
      wrapper: wrapper(client),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.get).toHaveBeenCalledWith('/series')
  })

  it('fetches public media by kind', async () => {
    vi.mocked(articlesApi.listPublicMedia).mockResolvedValue([
      { id: 'm-1', url: 'https://cdn.example/photo.jpg', kind: 'IMAGE' } as never,
    ])
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    const { result } = renderHook(() => usePublicMedia('IMAGE'), {
      wrapper: wrapper(client),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(articlesApi.listPublicMedia).toHaveBeenCalledWith('IMAGE')
  })

  it('fetches popular stories from analytics', async () => {
    vi.mocked(analyticsApi.listPopularStories).mockResolvedValue([
      {
        id: 'a1',
        slug: 'belogradchik',
        path: '/places/belogradchik',
        section: 'places',
        title: 'Belogradchik',
        titleBg: 'Белоградчик',
      },
    ])
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    const { result } = renderHook(() => usePopularStories(5), {
      wrapper: wrapper(client),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(analyticsApi.listPopularStories).toHaveBeenCalledWith(5)
    expect(result.current.data).toHaveLength(1)
  })
})

