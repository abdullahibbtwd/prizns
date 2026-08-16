import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderPage } from '@/test/render-page'
import CmsProfilePage from './ProfilePage'

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { id: 'u-1', role: 'AUTHOR', email: 'writer@prizni.bg', name: 'Iva' },
    loading: false,
    reload: vi.fn(),
  }),
}))

const getCmsProfile = vi.fn()
const updateCmsProfile = vi.fn()
const logoutOtherCmsSessions = vi.fn()

vi.mock('@/lib/users-api', () => ({
  getCmsProfile: (...args: unknown[]) => getCmsProfile(...args),
  updateCmsProfile: (...args: unknown[]) => updateCmsProfile(...args),
  logoutOtherCmsSessions: (...args: unknown[]) => logoutOtherCmsSessions(...args),
}))

describe('CmsProfilePage', () => {
  it('loads the current user profile', async () => {
    getCmsProfile.mockResolvedValue({
      id: 'u-1',
      email: 'writer@prizni.bg',
      name: 'Iva Petrova',
      role: 'AUTHOR',
      imageUrl: null,
      bio: 'Northwest stories',
      websiteUrl: 'https://prizni.bg',
      facebookUrl: null,
      instagramUrl: null,
      youtubeUrl: null,
      linkedinUrl: null,
      xUsername: 'prizni',
      authorId: 'auth-9',
    })

    renderPage(<CmsProfilePage />)
    expect(await screen.findByDisplayValue('Iva Petrova')).toBeInTheDocument()
    expect(screen.getByDisplayValue('writer@prizni.bg')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'cms.users.openAuthor' })).toHaveAttribute(
      'href',
      '/cms/authors/auth-9',
    )
  })

  it('saves profile changes', async () => {
    getCmsProfile.mockResolvedValue({
      id: 'u-1',
      email: 'writer@prizni.bg',
      name: 'Iva',
      role: 'EDITOR',
      imageUrl: null,
      bio: '',
      websiteUrl: '',
      facebookUrl: '',
      instagramUrl: '',
      youtubeUrl: '',
      linkedinUrl: '',
      xUsername: '',
      authorId: null,
    })
    updateCmsProfile.mockResolvedValue({ id: 'u-1', name: 'Iva Petrova' })

    renderPage(<CmsProfilePage />)
    const name = await screen.findByLabelText('cms.profile.name')
    const user = userEvent.setup()
    await user.clear(name)
    await user.type(name, 'Iva Petrova')
    await user.click(screen.getByRole('button', { name: 'cms.common.save' }))
    expect(updateCmsProfile).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Iva Petrova' }),
    )
  })
})
