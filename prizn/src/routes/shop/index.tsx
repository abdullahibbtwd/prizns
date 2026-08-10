import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { JournalShell } from '@/components/concept-3/JournalShell'
import { PageMeta } from '@/components/PageMeta'
import { useJournalLang } from '@/hooks/useJournalLang'
import { listPublicShopProducts, type ShopProduct } from '@/lib/shop-api'
import { addToCart, getCartCount } from '@/lib/shop-cart'
import { useEffect, useState } from 'react'

function formatPrice(cents: number, currency: string, lang: string) {
  try {
    return new Intl.NumberFormat(lang === 'bg' ? 'bg-BG' : 'en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`
  }
}

function ShopProductCard({
  product,
  lang,
}: {
  product: ShopProduct
  lang: 'bg' | 'en'
}) {
  const { t } = useTranslation()
  const [added, setAdded] = useState(false)

  const addMutation = useMutation({
    mutationFn: async () => {
      addToCart(product.id, 1, product.stock)
    },
    onSuccess: () => {
      setAdded(true)
      window.setTimeout(() => setAdded(false), 2000)
    },
  })

  return (
    <li className="flex flex-col">
      <Link to={`/shop/${product.slug}`} className="group block">
        <div className="mb-4 aspect-[4/5] overflow-hidden bg-[#EAE6DF]">
          {product.image ? (
            <img
              src={product.image}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              loading="lazy"
            />
          ) : null}
        </div>
      </Link>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
        <Link
          to={`/shop/${product.slug}`}
          className="min-w-0 flex-1 font-heading text-2xl text-[#1A1A1A] hover:text-[#0C2686]"
        >
          {lang === 'bg' ? product.titleBg : product.title}
        </Link>
        <p className="shrink-0 font-sans text-sm text-[#1A1A1A]/60">
          {formatPrice(product.priceCents, product.currency, lang)}
          {!product.inStock ? (
            <span className="ml-2 uppercase tracking-wider text-rose-700">
              {t('shop.soldOut')}
            </span>
          ) : null}
        </p>
        <button
          type="button"
          disabled={!product.inStock || addMutation.isPending}
          onClick={() => addMutation.mutate()}
          className="shrink-0 rounded-full bg-[#0C2686] px-5 py-2.5 font-sans text-[11px] uppercase tracking-[0.2em] text-white disabled:opacity-40"
        >
          {product.inStock ? t('shop.buy') : t('shop.soldOut')}
        </button>
      </div>
      {added ? (
        <p className="mt-2 text-sm text-[#0C2686]">{t('shop.added')}</p>
      ) : null}
    </li>
  )
}

export default function ShopPage() {
  const { lang } = useJournalLang()
  const { t } = useTranslation()
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    const sync = () => setCartCount(getCartCount())
    sync()
    window.addEventListener('prizni-shop-cart', sync)
    return () => window.removeEventListener('prizni-shop-cart', sync)
  }, [])

  const productsQuery = useQuery({
    queryKey: ['shop-products'],
    queryFn: listPublicShopProducts,
    retry: false,
  })

  const products = productsQuery.data ?? []

  return (
    <JournalShell navVariant="solid">
      {() => (
        <>
          <PageMeta
            lang={lang}
            title={t('shop.title')}
            description={t('shop.subtitle')}
            path="/shop"
          />
          <div className="mx-auto max-w-6xl px-6 pb-20 pt-28 md:px-12">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mb-2 font-sans text-[11px] uppercase tracking-[0.25em] text-[#0C2686]">
                  {t('shop.eyebrow')}
                </p>
                <h1 className="font-heading text-4xl text-[#1A1A1A] md:text-5xl">
                  {t('shop.title')}
                </h1>
                <p className="mt-3 max-w-xl font-sans text-sm font-light text-[#1A1A1A]/65">
                  {t('shop.subtitle')}
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  to="/shop/track"
                  className="rounded-full border border-black/10 px-4 py-2 font-sans text-[11px] uppercase tracking-widest text-[#1A1A1A]/70 hover:border-[#0C2686] hover:text-[#0C2686]"
                >
                  {t('shop.trackOrder')}
                </Link>
                <Link
                  to="/shop/cart"
                  className="rounded-full bg-[#0C2686] px-4 py-2 font-sans text-[11px] uppercase tracking-widest text-white"
                >
                  {t('shop.cart')} ({cartCount})
                </Link>
              </div>
            </div>

            {productsQuery.isLoading && (
              <p className="text-sm text-[#1A1A1A]/50">{t('shop.loading')}</p>
            )}
            {productsQuery.isError && (
              <p className="text-sm text-rose-700">{t('shop.unavailable')}</p>
            )}
            {!productsQuery.isLoading &&
              !productsQuery.isError &&
              products.length === 0 && (
                <p className="text-sm text-[#1A1A1A]/50">{t('shop.empty')}</p>
              )}

            <ul className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ShopProductCard
                  key={product.id}
                  product={product}
                  lang={lang}
                />
              ))}
            </ul>
          </div>
        </>
      )}
    </JournalShell>
  )
}
