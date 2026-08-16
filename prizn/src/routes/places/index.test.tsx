import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderPage } from '@/test/render-page'
import PlacesPage from '@/routes/places'

vi.mock('@/components/concept-3/JournalShell', () => ({
  JournalShell: ({
    children,
  }: {
    children: (ctx: { lang: 'en' | 'bg' }) => React.ReactNode
  }) => <div>{children({ lang: 'en' })}</div>,
}))

vi.mock('@/lib/reader-auth', () => ({
  useReaderAuth: () => ({ reader: null, loading: false }),
}))

vi.mock('@/lib/public-content', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/public-content')>()
  return {
    ...actual,
    usePublicArticles: () => ({ data: [] }),
    usePublicTags: () => ({
      data: [{ id: 't1', slug: 'vidin', nameBg: 'Видин', name: 'Vidin' }],
    }),
    usePublicSeries: () => ({ data: [] }),
  }
})

vi.mock('@/components/concept-3/RegionMap', () => ({
  RegionMap: ({ selectedSlug }: { selectedSlug?: string }) => (
    <div data-testid="region-map">{selectedSlug || 'map'}</div>
  ),
}))

describe('PlacesPage map', () => {
  it('renders the regional map and location chips', async () => {
    renderPage(<PlacesPage />)
    expect(await screen.findByText('Our Places')).toBeInTheDocument()
    expect(screen.getByTestId('region-map')).toBeInTheDocument()
    expect(screen.getByText('Location')).toBeInTheDocument()
  })
})
