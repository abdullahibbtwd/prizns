import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderPage } from '@/test/render-page'
import CmsSeriesPage from './SeriesPage'

vi.mock('@/hooks/useJournalLang', () => ({
  useJournalLang: () => ({ lang: 'en', setLang: vi.fn() }),
}))

const listCmsSeries = vi.fn()
const deleteCmsSeries = vi.fn()

vi.mock('@/lib/cms-content-api', () => ({
  listCmsSeries: (...args: unknown[]) => listCmsSeries(...args),
  deleteCmsSeries: (...args: unknown[]) => deleteCmsSeries(...args),
}))

describe('CmsSeriesPage', () => {
  it('lists series with episode stats', async () => {
    listCmsSeries.mockResolvedValue([
      {
        id: 'ser-1',
        slug: 'voices',
        titleEn: 'Voices',
        titleBg: 'Гласове',
        status: 'ACTIVE',
        episodes: [],
        _count: { episodes: 4 },
        episodeStats: {
          total: 4,
          published: 3,
          draft: 1,
          scheduled: 0,
          review: 0,
          archived: 0,
        },
      },
    ])

    renderPage(<CmsSeriesPage />)
    await waitFor(() => {
      expect(screen.getByText('Voices')).toBeInTheDocument()
    })
    expect(screen.getByText(/cms.series.episodeCount:4/)).toBeInTheDocument()
  })

  it('deletes a series after confirm', async () => {
    const user = userEvent.setup()
    listCmsSeries.mockResolvedValue([
      {
        id: 'ser-1',
        slug: 'voices',
        titleEn: 'Voices',
        titleBg: 'Гласове',
        status: 'ACTIVE',
        episodes: [],
        _count: { episodes: 4 },
        episodeStats: {
          total: 4,
          published: 3,
          draft: 1,
          scheduled: 0,
          review: 0,
          archived: 0,
        },
      },
    ])
    deleteCmsSeries.mockResolvedValue({ ok: true, id: 'ser-1' })

    renderPage(<CmsSeriesPage />)
    await screen.findByText('Voices')
    await user.click(screen.getByRole('button', { name: 'cms.series.delete' }))
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'cms.common.delete',
      }),
    )
    await waitFor(() => {
      expect(deleteCmsSeries).toHaveBeenCalledWith('ser-1')
    })
  })
})
