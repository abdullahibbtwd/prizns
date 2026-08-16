import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderPage } from '@/test/render-page'
import ShopPage from './index'

vi.mock('@/components/concept-3/JournalShell', () => ({
  JournalShell: ({
    children,
  }: {
    children: (ctx: { lang: 'en' | 'bg' }) => React.ReactNode
  }) => <div>{children({ lang: 'en' })}</div>,
}))

vi.mock('@/hooks/useJournalLang', () => ({
  useJournalLang: () => ({ lang: 'en', setLang: vi.fn() }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const labels: Record<string, string> = {
        'shop.title': 'Shop',
        'shop.subtitle': 'Journal merchandise',
        'shop.eyebrow': 'Store',
        'shop.trackOrder': 'Track order',
        'shop.cart': 'Cart',
        'shop.loading': 'Loading products…',
        'shop.unavailable': 'Shop unavailable',
        'shop.empty': 'No products yet',
        'shop.buy': 'Buy',
        'shop.soldOut': 'Sold out',
        'shop.added': 'Added to cart',
      }
      return labels[key] ?? key
    },
  }),
}))

const listPublicShopProducts = vi.fn()

vi.mock('@/lib/shop-api', () => ({
  listPublicShopProducts: (...args: unknown[]) =>
    listPublicShopProducts(...args),
}))

describe('ShopPage', () => {
  it('renders products from the shop API', async () => {
    listPublicShopProducts.mockResolvedValue([
      {
        id: 'prod-1',
        slug: 'journal',
        title: 'Journal',
        titleBg: 'Дневник',
        priceCents: 1500,
        currency: 'eur',
        image: 'https://cdn.example/journal.jpg',
        inStock: true,
        stock: 5,
      },
    ])

    renderPage(<ShopPage />, { route: '/shop' })

    expect(await screen.findByRole('heading', { name: 'Shop' })).toBeInTheDocument()
    expect(await screen.findByText('Journal')).toBeInTheDocument()
    expect(screen.getByText(/€15\.00|15,00/i)).toBeInTheDocument()
  })

  it('adds a product to the cart', async () => {
    const user = userEvent.setup()
    listPublicShopProducts.mockResolvedValue([
      {
        id: 'prod-1',
        slug: 'journal',
        title: 'Journal',
        titleBg: 'Дневник',
        priceCents: 1500,
        currency: 'eur',
        image: null,
        inStock: true,
        stock: 5,
      },
    ])

    renderPage(<ShopPage />, { route: '/shop' })
    await screen.findByRole('button', { name: 'Buy' })
    await user.click(screen.getByRole('button', { name: 'Buy' }))

    await waitFor(() => {
      expect(screen.getByText('Added to cart')).toBeInTheDocument()
    })
  })

  it('shows unavailable state when the API fails', async () => {
    listPublicShopProducts.mockRejectedValue(new Error('offline'))
    renderPage(<ShopPage />, { route: '/shop' })
    expect(await screen.findByText('Shop unavailable')).toBeInTheDocument()
  })
})
