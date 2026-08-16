import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderPage } from '@/test/render-page'
import CmsOrdersPage from './OrdersPage'

const listCmsShopOrders = vi.fn()
const shipCmsShopOrder = vi.fn()

vi.mock('@/lib/shop-api', () => ({
  listCmsShopOrders: (...args: unknown[]) => listCmsShopOrders(...args),
  shipCmsShopOrder: (...args: unknown[]) => shipCmsShopOrder(...args),
}))

const paidOrder = {
  id: 'ord-1',
  publicId: 'PRZ-ABC123',
  email: 'buyer@example.com',
  status: 'PAID',
  paymentMethod: 'COD',
  totalCents: 1500,
  currency: 'eur',
  estimatedArrival: '3–5 days',
  shipping: {
    name: 'Buyer',
    line1: 'Main St 1',
    line2: null,
    city: 'Vidin',
    postal: '3700',
    country: 'BG',
    phone: null,
  },
  items: [{ id: 'li-1', qty: 1, title: 'Journal' }],
}

describe('CmsOrdersPage', () => {
  it('selects an order and marks it shipped', async () => {
    const user = userEvent.setup()
    listCmsShopOrders.mockResolvedValue({ items: [paidOrder], total: 1 })
    shipCmsShopOrder.mockResolvedValue({ ...paidOrder, status: 'SHIPPED' })

    renderPage(<CmsOrdersPage />)
    await screen.findByText('PRZ-ABC123')

    await user.click(screen.getByText('PRZ-ABC123'))
    expect(screen.getAllByText('buyer@example.com').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'cms.shop.markShipped' }))
    await waitFor(() => {
      expect(shipCmsShopOrder).toHaveBeenCalledWith('ord-1')
    })
  })

  it('shows empty orders table', async () => {
    listCmsShopOrders.mockResolvedValue({ items: [], total: 0 })
    renderPage(<CmsOrdersPage />)
    expect(await screen.findByText('cms.shop.noOrders')).toBeInTheDocument()
  })
})
