import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderPage } from '@/test/render-page'
import CmsTagsPage from './TagsPage'

const listCmsTags = vi.fn()
const createCmsTag = vi.fn()
const deleteCmsTag = vi.fn()
const updateCmsTag = vi.fn()
const geocodeCmsTag = vi.fn()

vi.mock('@/lib/tags-api', () => ({
  listCmsTags: (...args: unknown[]) => listCmsTags(...args),
  createCmsTag: (...args: unknown[]) => createCmsTag(...args),
  deleteCmsTag: (...args: unknown[]) => deleteCmsTag(...args),
  updateCmsTag: (...args: unknown[]) => updateCmsTag(...args),
  geocodeCmsTag: (...args: unknown[]) => geocodeCmsTag(...args),
}))

describe('CmsTagsPage', () => {
  beforeEach(() => {
    listCmsTags.mockResolvedValue([
      {
        id: 'tag-1',
        kind: 'LOCATION',
        nameBg: 'Видин',
        nameEn: 'Vidin',
        slug: 'vidin',
        lat: null,
        lng: null,
        geocodeStatus: 'idle',
      },
    ])
    createCmsTag.mockResolvedValue({ id: 'tag-new' })
    deleteCmsTag.mockResolvedValue(undefined)
  })

  it('lists grouped tags', async () => {
    renderPage(<CmsTagsPage />)
    expect(await screen.findByText('Видин')).toBeInTheDocument()
    expect(screen.getByText(/vidin/)).toBeInTheDocument()
  })

  it('creates a tag', async () => {
    const user = userEvent.setup()
    renderPage(<CmsTagsPage />)
    await screen.findByText('Видин')

    await user.type(screen.getByPlaceholderText('cms.tags.namePlaceholder'), 'Montana')
    await user.click(screen.getByRole('button', { name: 'cms.common.create' }))

    await waitFor(() => {
      expect(createCmsTag).toHaveBeenCalledWith({
        kind: 'LOCATION',
        nameBg: 'Montana',
      })
    })
  })

  it('deletes a tag after confirm', async () => {
    const user = userEvent.setup()
    renderPage(<CmsTagsPage />)
    await screen.findByText('Видин')

    await user.click(
      screen.getByRole('button', { name: 'cms.common.delete: Видин' }),
    )
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'cms.common.delete',
      }),
    )
    await waitFor(() => {
      expect(deleteCmsTag).toHaveBeenCalledWith('tag-1')
    })
  })

  it('geocodes a location tag', async () => {
    const user = userEvent.setup()
    geocodeCmsTag.mockResolvedValue({
      id: 'tag-1',
      geocodeStatus: 'ok',
      lat: 43.99,
      lng: 22.87,
    })
    renderPage(<CmsTagsPage />)
    await screen.findByText('Видин')
    await user.click(screen.getByRole('button', { name: 'cms.tags.geocode' }))
    await waitFor(() => {
      expect(geocodeCmsTag).toHaveBeenCalledWith('tag-1')
    })
  })

  it('hides coordinate inputs after a location is mapped until Edit', async () => {
    const user = userEvent.setup()
    listCmsTags.mockResolvedValue([
      {
        id: 'tag-1',
        kind: 'LOCATION',
        nameBg: 'Видин',
        nameEn: 'Vidin',
        slug: 'vidin',
        lat: 43.99,
        lng: 22.87,
        geocodeStatus: 'ok',
      },
    ])
    renderPage(<CmsTagsPage />)
    await screen.findByText('Видин')
    expect(screen.queryByRole('button', { name: 'cms.tags.geocode' })).not.toBeInTheDocument()
    expect(screen.getByText('43.99, 22.87')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'cms.tags.editCoords' }))
    expect(screen.getByRole('button', { name: 'cms.tags.geocode' })).toBeInTheDocument()
  })
})
