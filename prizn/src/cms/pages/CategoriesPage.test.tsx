import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderPage } from '@/test/render-page'
import CmsCategoriesPage from './CategoriesPage'

const listCmsCategories = vi.fn()
const createCmsCategory = vi.fn()
const updateCmsCategory = vi.fn()
const deleteCmsCategory = vi.fn()

vi.mock('@/hooks/useJournalLang', () => ({
  useJournalLang: () => ({ lang: 'en', setLang: vi.fn() }),
}))

vi.mock('@/lib/categories-api', () => ({
  listCmsCategories: (...args: unknown[]) => listCmsCategories(...args),
  createCmsCategory: (...args: unknown[]) => createCmsCategory(...args),
  updateCmsCategory: (...args: unknown[]) => updateCmsCategory(...args),
  deleteCmsCategory: (...args: unknown[]) => deleteCmsCategory(...args),
}))

describe('CmsCategoriesPage', () => {
  beforeEach(() => {
    listCmsCategories.mockResolvedValue([
      {
        id: 'cat-1',
        slug: 'nashite-mesta',
        nameBg: 'Нашите места',
        nameEn: 'Our places',
        descriptionBg: null,
        parentId: null,
        articleCount: 22,
        childCount: 0,
      },
      {
        id: 'cat-2',
        slug: 'otbivki',
        nameBg: 'Отбивки',
        nameEn: 'Detours',
        descriptionBg: null,
        parentId: 'cat-1',
        articleCount: 22,
        childCount: 0,
      },
    ])
    createCmsCategory.mockResolvedValue({ id: 'cat-new' })
    updateCmsCategory.mockResolvedValue({ id: 'cat-1' })
    deleteCmsCategory.mockResolvedValue(undefined)
  })

  it('lists main categories and hides leftover subcategories', async () => {
    renderPage(<CmsCategoriesPage />)
    expect(await screen.findByText('Our places')).toBeInTheDocument()
    expect(screen.queryByText('Detours')).not.toBeInTheDocument()
    expect(screen.queryByText('cms.categories.createChild')).not.toBeInTheDocument()
  })

  it('creates a category', async () => {
    const user = userEvent.setup()
    renderPage(<CmsCategoriesPage />)
    await screen.findByText('Our places')

    await user.type(
      screen.getByPlaceholderText('cms.categories.namePlaceholder'),
      'Бизнес',
    )
    await user.click(
      screen.getByRole('button', { name: 'cms.categories.addParent' }),
    )

    await waitFor(() => {
      expect(createCmsCategory).toHaveBeenCalledWith({
        nameBg: 'Бизнес',
        descriptionBg: undefined,
      })
    })
  })

  it('edits a category', async () => {
    const user = userEvent.setup()
    renderPage(<CmsCategoriesPage />)
    await screen.findByText('Our places')

    await user.click(
      screen.getByRole('button', { name: 'cms.categories.edit: Our places' }),
    )
    const nameInput = screen.getByLabelText('cms.categories.name')
    await user.clear(nameInput)
    await user.type(nameInput, 'Нашите пътища')
    await user.click(screen.getByRole('button', { name: 'cms.common.save' }))

    await waitFor(() => {
      expect(updateCmsCategory).toHaveBeenCalledWith('cat-1', {
        nameBg: 'Нашите пътища',
        descriptionBg: '',
      })
    })
  })

  it('deletes a category after confirm', async () => {
    const user = userEvent.setup()
    renderPage(<CmsCategoriesPage />)
    await screen.findByText('Our places')

    await user.click(
      screen.getByRole('button', {
        name: 'cms.common.delete: Our places',
      }),
    )
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'cms.common.delete',
      }),
    )
    await waitFor(() => {
      expect(deleteCmsCategory).toHaveBeenCalledWith('cat-1')
    })
  })

  it('paginates categories to page 2', async () => {
    const user = userEvent.setup()
    listCmsCategories.mockResolvedValue(
      Array.from({ length: 21 }, (_, i) => ({
        id: `c-${i + 1}`,
        slug: `c-${i + 1}`,
        nameBg: `Категория ${i + 1}`,
        nameEn: `Category ${i + 1}`,
        parentId: null,
        articleCount: 0,
        childCount: 0,
      })),
    )

    renderPage(<CmsCategoriesPage />)
    expect(await screen.findByText('Category 1')).toBeInTheDocument()
    expect(screen.queryByText('Category 21')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '2' }))
    expect(await screen.findByText('Category 21')).toBeInTheDocument()
    expect(screen.queryByText('Category 1')).not.toBeInTheDocument()
  })
})
