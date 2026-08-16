import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderPage } from '@/test/render-page'
import CmsAuthorsPage from './AuthorsPage'

vi.mock('@/hooks/useJournalLang', () => ({
  useJournalLang: () => ({ lang: 'en', setLang: vi.fn() }),
}))

const listCmsAuthors = vi.fn()
const deleteCmsAuthor = vi.fn()

vi.mock('@/lib/cms-content-api', () => ({
  listCmsAuthors: (...args: unknown[]) => listCmsAuthors(...args),
  deleteCmsAuthor: (...args: unknown[]) => deleteCmsAuthor(...args),
}))

describe('CmsAuthorsPage', () => {
  it('renders author cards', async () => {
    listCmsAuthors.mockResolvedValue([
      {
        id: 'auth-1',
        nameEn: 'Maria Petrova',
        nameBg: 'Мария Петрова',
        roleEn: 'Editor',
        roleBg: 'Редактор',
        locationEn: 'Vidin',
        locationBg: 'Видин',
        imageUrl: null,
        isActive: true,
        translationStatus: 'READY',
        _count: { articles: 3 },
      },
    ])

    renderPage(<CmsAuthorsPage />)
    await waitFor(() => {
      expect(screen.getByText('Maria Petrova')).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: /cms.authors.edit/i })).toHaveAttribute(
      'href',
      '/cms/authors/auth-1',
    )
  })

  it('shows empty state', async () => {
    listCmsAuthors.mockResolvedValue([])
    renderPage(<CmsAuthorsPage />)
    expect(await screen.findByText(/cms.authors.empty/)).toBeInTheDocument()
  })

  it('deletes an author after confirm', async () => {
    const user = userEvent.setup()
    listCmsAuthors.mockResolvedValue([
      {
        id: 'auth-1',
        nameEn: 'Maria Petrova',
        nameBg: 'Мария Петрова',
        roleEn: 'Editor',
        roleBg: 'Редактор',
        locationEn: 'Vidin',
        locationBg: 'Видин',
        imageUrl: null,
        isActive: true,
        translationStatus: 'READY',
        _count: { articles: 3 },
      },
    ])
    deleteCmsAuthor.mockResolvedValue({ ok: true, id: 'auth-1' })

    renderPage(<CmsAuthorsPage />)
    await screen.findByText('Maria Petrova')
    await user.click(screen.getByRole('button', { name: 'cms.authors.delete' }))
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'cms.common.delete',
      }),
    )
    await waitFor(() => {
      expect(deleteCmsAuthor).toHaveBeenCalledWith('auth-1')
    })
  })
})
