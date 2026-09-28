import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderPage } from '@/test/render-page'
import CmsAuthorsPage from './AuthorsPage'

const authState = vi.hoisted(() => ({
  user: { id: 'u-admin', role: 'ADMIN', roles: ['ADMIN'] } as {
    id: string
    role: string
    roles: string[]
  },
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: authState.user, loading: false }),
}))

vi.mock('@/hooks/useJournalLang', () => ({
  useJournalLang: () => ({ lang: 'en', setLang: vi.fn() }),
}))

const listCmsAuthors = vi.fn()
const deleteCmsAuthor = vi.fn()

vi.mock('@/lib/cms-content-api', () => ({
  listCmsAuthors: (...args: unknown[]) => listCmsAuthors(...args),
  deleteCmsAuthor: (...args: unknown[]) => deleteCmsAuthor(...args),
}))

const baseAuthor = {
  nameBg: '',
  roleEn: 'Author',
  roleBg: 'Автор',
  locationEn: null,
  locationBg: null,
  imageUrl: null,
  isActive: true,
  showOnAuthors: true,
  _count: { articles: 1 },
}

describe('CmsAuthorsPage', () => {
  beforeEach(() => {
    authState.user = { id: 'u-admin', role: 'ADMIN', roles: ['ADMIN'] }
  })

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

  it('filters guest authors and badges them', async () => {
    const user = userEvent.setup()
    listCmsAuthors.mockResolvedValue([
      { ...baseAuthor, id: 'a-1', nameEn: 'Regular Writer', isGuest: false },
      { ...baseAuthor, id: 'a-2', nameEn: 'Guest Writer', isGuest: true },
    ])

    renderPage(<CmsAuthorsPage />)
    await screen.findByText('Guest Writer')
    expect(screen.getAllByText('cms.authors.guestBadge')).toHaveLength(1)

    await user.click(screen.getByRole('tab', { name: /cms.authors.filterGuest/ }))
    expect(screen.getByText('Guest Writer')).toBeInTheDocument()
    expect(screen.queryByText('Regular Writer')).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('tab', { name: /cms.authors.filterRegular/ }),
    )
    expect(screen.getByText('Regular Writer')).toBeInTheDocument()
    expect(screen.queryByText('Guest Writer')).not.toBeInTheDocument()
  })

  it('hides delete from moderators', async () => {
    authState.user = { id: 'u-mod', role: 'MODERATOR', roles: ['MODERATOR'] }
    listCmsAuthors.mockResolvedValue([
      { ...baseAuthor, id: 'a-1', nameEn: 'Regular Writer' },
    ])

    renderPage(<CmsAuthorsPage />)
    await screen.findByText('Regular Writer')
    expect(
      screen.queryByRole('button', { name: 'cms.authors.delete' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /cms.authors.edit/ })).toBeInTheDocument()
  })
})
