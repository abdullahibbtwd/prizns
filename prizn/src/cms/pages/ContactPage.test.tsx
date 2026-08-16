import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderPage } from '@/test/render-page'
import CmsContactPage from './ContactPage'

const listCmsContact = vi.fn()

vi.mock('@/lib/contact-api', () => ({
  listCmsContact: (...args: unknown[]) => listCmsContact(...args),
}))

describe('CmsContactPage', () => {
  it('lists contact messages', async () => {
    listCmsContact.mockResolvedValue({
      items: [
        {
          id: 'msg-1',
          status: 'NEW',
          name: 'Jordan Lee',
          email: 'jordan@example.com',
          category: 'GENERAL',
          subject: 'Partnership question',
          message: 'Hello from Vidin',
          aiSummary: null,
          createdAt: '2026-08-01T10:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    })

    renderPage(<CmsContactPage />)
    expect(await screen.findByText('Jordan Lee')).toBeInTheDocument()
    expect(screen.getByText('Partnership question')).toBeInTheDocument()
  })

  it('opens AI summary modal for long summaries', async () => {
    listCmsContact.mockResolvedValue({
      items: [
        {
          id: 'msg-2',
          status: 'REVIEW',
          name: 'Alex',
          email: 'alex@example.com',
          category: 'GENERAL',
          subject: 'Help',
          message: 'Body',
          aiSummary: 'A'.repeat(60),
          createdAt: '2026-08-01T10:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    })

    const user = userEvent.setup()
    renderPage(<CmsContactPage />)
    await screen.findByText('Alex')
    await user.click(screen.getByRole('button', { name: /AI/i }))
    expect(await screen.findByText('cms.contactDesk.aiTitle')).toBeInTheDocument()
  })
})
