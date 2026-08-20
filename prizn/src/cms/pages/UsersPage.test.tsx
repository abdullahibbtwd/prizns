import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderPage } from '@/test/render-page'
import CmsUsersPage from './UsersPage'

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { id: 'u-1', role: 'ADMIN', email: 'admin@prizni.bg' },
    loading: false,
  }),
}))

const listCmsUsers = vi.fn()
const createCmsUser = vi.fn()
const updateCmsUser = vi.fn()

vi.mock('@/lib/users-api', () => ({
  listCmsUsers: (...args: unknown[]) => listCmsUsers(...args),
  updateCmsUser: (...args: unknown[]) => updateCmsUser(...args),
  createCmsUser: (...args: unknown[]) => createCmsUser(...args),
}))

describe('CmsUsersPage', () => {
  it('lists CMS users for admins without the old stats cards', async () => {
    listCmsUsers.mockResolvedValue({
      items: [
        {
          id: 'u-2',
          email: 'editor@prizni.bg',
          name: 'Editor User',
          role: 'EDITOR',
          isActive: true,
          emailVerified: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          authorId: null,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    })

    renderPage(<CmsUsersPage />)
    expect(await screen.findByText('editor@prizni.bg')).toBeInTheDocument()
    expect(screen.queryByText('cms.users.teamMembers')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cms.users.newUser/ })).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /cms.users.newUser/ }))
    expect(screen.getByRole('checkbox', { name: 'cms.roles.seoEditor' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'cms.roles.author' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'cms.roles.contributor' })).toBeInTheDocument()
    expect(screen.getByText('cms.users.showOnAuthors')).toBeInTheDocument()
  })

  it('creates a user and links author pages in the table', async () => {
    listCmsUsers.mockResolvedValue({
      items: [
        {
          id: 'u-3',
          email: 'writer@prizni.bg',
          name: 'Iva Petrova',
          role: 'AUTHOR',
          isActive: true,
          emailVerified: false,
          createdAt: '2026-01-01T00:00:00.000Z',
          authorId: 'auth-9',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    })
    createCmsUser.mockResolvedValue({
      id: 'u-3',
      authorId: 'auth-9',
    })

    renderPage(<CmsUsersPage />)
    expect(await screen.findByRole('link', { name: 'cms.users.openAuthor' })).toHaveAttribute(
      'href',
      '/cms/authors/auth-9',
    )

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /cms.users.newUser/ }))
    expect(screen.getByText('cms.users.createTitle')).toBeInTheDocument()
    expect(screen.getByLabelText('cms.users.confirmPassword')).toBeInTheDocument()

    const password = screen.getByLabelText('cms.users.password')
    expect(password).toHaveAttribute('type', 'password')
    await user.click(screen.getAllByRole('button', { name: 'cms.users.showPassword' })[0]!)
    expect(password).toHaveAttribute('type', 'text')
  })

  it('opens the edit user modal from the table', async () => {
    listCmsUsers.mockResolvedValue({
      items: [
        {
          id: 'u-2',
          email: 'editor@prizni.bg',
          name: 'Editor User',
          role: 'EDITOR',
          isActive: true,
          emailVerified: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          authorId: null,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    })

    renderPage(<CmsUsersPage />)
    expect(await screen.findByText('cms.users.verified')).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'cms.users.edit' }))
    expect(screen.getByText('cms.users.editTitle')).toBeInTheDocument()
    expect(screen.getByDisplayValue('editor@prizni.bg')).toBeInTheDocument()
  })
})
