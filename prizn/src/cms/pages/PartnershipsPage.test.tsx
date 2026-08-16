import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderPage } from '@/test/render-page'
import CmsPartnershipsPage from './PartnershipsPage'

const listCmsPartnerships = vi.fn()
const updateCmsPartnership = vi.fn()

vi.mock('@/lib/partnerships-api', () => ({
  listCmsPartnerships: (...args: unknown[]) => listCmsPartnerships(...args),
  updateCmsPartnership: (...args: unknown[]) => updateCmsPartnership(...args),
}))

describe('CmsPartnershipsPage', () => {
  it('lists partnership inquiries', async () => {
    listCmsPartnerships.mockResolvedValue({
      items: [
        {
          id: 'p-1',
          status: 'NEW',
          organization: 'Cultural Center',
          type: 'NGO',
          contactName: 'Jordan',
          email: 'jordan@example.com',
          message: 'We would love to collaborate on a photo series.',
          createdAt: '2026-08-01T10:00:00.000Z',
        },
      ],
      total: 1,
    })

    renderPage(<CmsPartnershipsPage />)
    expect(await screen.findByText('Cultural Center')).toBeInTheDocument()
    expect(screen.getByText(/collaborate/i)).toBeInTheDocument()
  })
})
