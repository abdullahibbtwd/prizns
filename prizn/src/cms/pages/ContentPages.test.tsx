import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderPage } from '@/test/render-page'
import { CmsMediaPage } from './ContentPages'

const listCmsMedia = vi.fn()
const deleteCmsMedia = vi.fn()
const uploadCmsMedia = vi.fn()

vi.mock('@/lib/articles-api', () => ({
  listCmsMedia: (...args: unknown[]) => listCmsMedia(...args),
  deleteCmsMedia: (...args: unknown[]) => deleteCmsMedia(...args),
  uploadCmsMedia: (...args: unknown[]) => uploadCmsMedia(...args),
}))

describe('CmsMediaPage', () => {
  beforeEach(() => {
    listCmsMedia.mockResolvedValue([
      {
        id: 'media-1',
        kind: 'IMAGE',
        status: 'DONE',
        url: '/media/one.jpg',
        thumbnailUrl: '/media/one-thumb.jpg',
        titleBg: 'Sunset',
        locationBg: 'Vidin',
        originalName: 'sunset.jpg',
      },
    ])
    deleteCmsMedia.mockResolvedValue({ ok: true, id: 'media-1' })
  })

  it('deletes a library file after confirm', async () => {
    const user = userEvent.setup()
    renderPage(<CmsMediaPage />)
    await screen.findByText('Sunset')

    await user.click(
      screen.getByRole('button', { name: 'cms.mediaLibrary.delete' }),
    )
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'cms.common.delete',
      }),
    )

    await waitFor(() => {
      expect(deleteCmsMedia).toHaveBeenCalledWith('media-1')
    })
  })
})
