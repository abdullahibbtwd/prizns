import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { JournalShell } from '@/components/concept-3/JournalShell'
import { PageMeta } from '@/components/PageMeta'
import { useJournalLang } from '@/hooks/useJournalLang'
import { getPublicShopProduct } from '@/lib/shop-api'
import { addToCart } from '@/lib/shop-cart'
import { QtyStepper } from '@/components/shop/QtyStepper'
import { useEffect, useMemo, useState } from 'react'

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

export default function ShopProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const { lang } = useJournalLang()
  const { t } = useTranslation()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [activeSlide, setActiveSlide] = useState(0)

  const productQuery = useQuery({
    queryKey: ['shop-product', slug],
    queryFn: () => getPublicShopProduct(slug!),
    enabled: Boolean(slug),
    retry: false,
  })

  const product = productQuery.data

  const gallery = useMemo(() => {
    if (!product) return [] as Array<{ id: string; url: string }>
    if (product.gallery?.length) return product.gallery
    if (product.image) return [{ id: 'primary', url: product.image }]
    return []
  }, [product])

  useEffect(() => {
    setActiveSlide(0)
  }, [product?.id])

  useEffect(() => {
    if (gallery.length === 0) {
      setActiveSlide(0)
      return
    }
    setActiveSlide((prev) => Math.min(prev, gallery.length - 1))
  }, [gallery.length])

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!product) return
      addToCart(product.id, qty, product.stock)
    },
    onSuccess: () => {
      setAdded(true)
      window.setTimeout(() => setAdded(false), 2000)
    },
  })

  const goPrev = () =>
    setActiveSlide((prev) => (prev <= 0 ? gallery.length - 1 : prev - 1))
  const goNext = () =>
    setActiveSlide((prev) => (prev >= gallery.length - 1 ? 0 : prev + 1))

  const heroUrl = gallery[activeSlide]?.url || product?.image || undefined

  return (
    <JournalShell navVariant="solid">
      {() => (
        <>
          <PageMeta
            lang={lang}
            title={
              product
                ? lang === 'bg'
                  ? product.titleBg
                  : product.title
                : t('shop.title')
            }
            path={product ? `/shop/${product.slug}` : '/shop'}
            image={gallery[0]?.url || product?.image || undefined}
          />
          <div className="mx-auto max-w-5xl px-6 pb-20 pt-28 md:px-12">
            <Link
              to="/shop"
              className="mb-8 inline-block font-sans text-[11px] uppercase tracking-widest text-[#0C2686]"
            >
              ← {t('shop.backToShop')}
            </Link>

            {productQuery.isLoading && (
              <p className="text-sm text-[#1A1A1A]/50">{t('shop.loading')}</p>
            )}
            {productQuery.isError && (
              <p className="text-sm text-rose-700">{t('shop.productMissing')}</p>
            )}

            {product ? (
              <div className="grid gap-10 md:grid-cols-2">
                <div className="relative aspect-[4/5] overflow-hidden bg-[#EAE6DF]">
                  {heroUrl ? (
                    <img
                      src={heroUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                  {gallery.length > 1 ? (
                    <>
                      <button
                        type="button"
                        onClick={goPrev}
                        className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/95 text-[#1A1A1A] shadow-md"
                        aria-label={t('cms.stories.prev')}
                      >
                        <ChevronLeft className="size-5" />
                      </button>
                      <button
                        type="button"
                        onClick={goNext}
                        className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/95 text-[#1A1A1A] shadow-md"
                        aria-label={t('cms.stories.next')}
                      >
                        <ChevronRight className="size-5" />
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[11px] font-semibold text-white">
                        {activeSlide + 1} / {gallery.length}
                      </div>
                    </>
                  ) : null}
                </div>
                <div>
                  <h1 className="font-heading text-4xl text-[#1A1A1A] md:text-5xl">
                    {lang === 'bg' ? product.titleBg : product.title}
                  </h1>
                  <p className="mt-4 font-sans text-lg text-[#0C2686]">
                    {formatPrice(product.priceCents, product.currency, lang)}
                  </p>
                  <p className="mt-6 whitespace-pre-line font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/75">
                    {lang === 'bg'
                      ? product.descriptionBg || product.description
                      : product.description}
                  </p>

                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <QtyStepper
                      value={qty}
                      min={1}
                      max={Math.min(20, Math.max(1, product.stock))}
                      disabled={!product.inStock}
                      label={t('shop.qty')}
                      onChange={setQty}
                    />
                    <button
                      type="button"
                      disabled={!product.inStock || addMutation.isPending}
                      onClick={() => addMutation.mutate()}
                      className="rounded-full bg-[#0C2686] px-6 py-3 font-sans text-[11px] uppercase tracking-[0.2em] text-white disabled:opacity-40"
                    >
                      {product.inStock ? t('shop.buy') : t('shop.soldOut')}
                    </button>
                    <Link
                      to="/shop/cart"
                      className="rounded-full border border-black/10 px-5 py-3 font-sans text-[11px] uppercase tracking-[0.2em] text-[#1A1A1A]/70"
                    >
                      {t('shop.cart')}
                    </Link>
                  </div>
                  {added ? (
                    <p className="mt-3 text-sm text-[#0C2686]">{t('shop.added')}</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}
    </JournalShell>
  )
}
