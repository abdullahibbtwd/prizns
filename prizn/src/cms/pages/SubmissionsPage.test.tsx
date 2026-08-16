import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderPage } from '@/test/render-page'
import CmsSubmissionsPage from './SubmissionsPage'

const listCmsSubmissions = vi.fn()

vi.mock('@/lib/submissions-api', () => ({
  listCmsSubmissions: (...args: unknown[]) => listCmsSubmissions(...args),
}))

describe('CmsSubmissionsPage', () => {
  it('lists submissions and filters by search', async () => {
    listCmsSubmissions.mockResolvedValue({
      items: [
        {
          id: 'sub-1',
          status: 'new',
          name: 'Alex Writer',
          email: 'alex@example.com',
          pitch: 'A story about Vidin',
          createdAt: '2026-08-01T10:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    })

    const user = userEvent.setup()
    renderPage(<CmsSubmissionsPage />)
    expect(await screen.findByText('Alex Writer')).toBeInTheDocument()

    await user.type(
      screen.getByPlaceholderText('cms.submissions.searchPlaceholder'),
      'Vidin',
    )
    await waitFor(() => {
      expect(listCmsSubmissions).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: 'Vidin' }),
      )
    })
  })
})
