import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { JournalShell } from '@/components/concept-3/JournalShell'
import { PageMeta } from '@/components/PageMeta'
import { useJournalLang } from '@/hooks/useJournalLang'
import {
  createShopCheckout,
  createShopCodOrder,
  listPublicShopProducts,
} from '@/lib/shop-api'
import { clearCart, getCart, setCartQty, type CartLine } from '@/lib/shop-cart'
import { QtyStepper } from '@/components/shop/QtyStepper'
import { ApiError } from '@/lib/api'

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

export default function ShopCartPage() {
  const { lang } = useJournalLang()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [lines, setLines] = useState<CartLine[]>([])
  const [payMode, setPayMode] = useState<'stripe' | 'cod'>('stripe')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [line1, setLine1] = useState('')
  const [line2, setLine2] = useState('')
  const [city, setCity] = useState('')
  const [postal, setPostal] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    const sync = () => setLines(getCart())
    sync()
    window.addEventListener('prizni-shop-cart', sync)
    return () => window.removeEventListener('prizni-shop-cart', sync)
  }, [])

  const productsQuery = useQuery({
    queryKey: ['shop-products'],
    queryFn: listPublicShopProducts,
  })

  const byId = useMemo(() => {
    const map = new Map(
      (productsQuery.data ?? []).map((product) => [product.id, product]),
    )
    return map
  }, [productsQuery.data])

  useEffect(() => {
    if (!productsQuery.data) return
    for (const line of getCart()) {
      const product = byId.get(line.productId)
      if (!product) continue
      const maxQty = Math.min(20, Math.max(0, product.stock))
      if (maxQty <= 0) {
        setCartQty(line.productId, 0)
      } else if (line.qty > maxQty) {
        setCartQty(line.productId, maxQty, maxQty)
      }
    }
  }, [productsQuery.data, byId])

  const cartProducts = lines
    .map((line) => byId.get(line.productId))
    .filter(Boolean)
  const allAllowCod =
    lines.length > 0 &&
    cartProducts.length === lines.length &&
    cartProducts.every((p) => p?.allowCod)

  useEffect(() => {
    if (!allAllowCod && payMode === 'cod') setPayMode('stripe')
  }, [allAllowCod, payMode])

  const checkoutMutation = useMutation({
    mutationFn: () => createShopCheckout(lines),
    onSuccess: (data) => {
      clearCart()
      window.location.href = data.url
    },
  })

  const codMutation = useMutation({
    mutationFn: () =>
      createShopCodOrder({
        items: lines,
        email: email.trim(),
        name: name.trim(),
        line1: line1.trim(),
        line2: line2.trim() || undefined,
        city: city.trim(),
        postal: postal.trim(),
        country: 'BG',
        phone: phone.trim() || undefined,
      }),
    onSuccess: (data) => {
      clearCart()
      navigate(
        `/shop/success?order=success&id=${encodeURIComponent(data.publicId)}`,
      )
    },
  })

  const onCodSubmit = (e: FormEvent) => {
    e.preventDefault()
    codMutation.mutate()
  }

  const pending = checkoutMutation.isPending || codMutation.isPending
  const error =
    (checkoutMutation.error as ApiError | null) ||
    (codMutation.error as ApiError | null)

  return (
    <JournalShell navVariant="solid">
      {() => (
        <>
          <PageMeta lang={lang} title={t('shop.cart')} path="/shop/cart" />
          <div className="mx-auto max-w-3xl px-6 pb-20 pt-28 md:px-12">
            <Link
              to="/shop"
              className="mb-8 inline-block font-sans text-[11px] uppercase tracking-widest text-[#0C2686]"
            >
              ← {t('shop.backToShop')}
            </Link>
            <h1 className="mb-8 font-heading text-4xl text-[#1A1A1A]">
              {t('shop.cart')}
            </h1>

            {lines.length === 0 ? (
              <p className="text-sm text-[#1A1A1A]/55">{t('shop.cartEmpty')}</p>
            ) : (
              <ul className="space-y-6">
                {lines.map((line) => {
                  const product = byId.get(line.productId)
                  const maxQty = Math.min(
                    20,
                    Math.max(1, product?.stock ?? 1),
                  )
                  const stepperDisabled =
                    Boolean(product) && product!.stock <= 0
                  return (
                    <li
                      key={line.productId}
                      className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EAE6DF] pb-4"
                    >
                      <div>
                        <p className="font-heading text-xl text-[#1A1A1A]">
                          {product
                            ? lang === 'bg'
                              ? product.titleBg
                              : product.title
                            : line.productId}
                        </p>
                        {product ? (
                          <p className="mt-1 text-sm text-[#1A1A1A]/55">
                            {formatPrice(
                              product.priceCents,
                              product.currency,
                              lang,
                            )}
                            {product.allowCod ? (
                              <span className="ml-2 text-[11px] uppercase tracking-wider text-[#0C2686]">
                                {t('shop.codAvailable')}
                              </span>
                            ) : null}
                            {product.stock <= 0 ? (
                              <span className="ml-2 uppercase tracking-wider text-rose-700">
                                {t('shop.soldOut')}
                              </span>
                            ) : null}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3">
                        <QtyStepper
                          value={Math.min(line.qty, maxQty)}
                          min={1}
                          max={maxQty}
                          disabled={stepperDisabled}
                          label={t('shop.qty')}
                          onChange={(next) =>
                            setCartQty(
                              line.productId,
                              next,
                              product?.stock ?? 20,
                            )
                          }
                        />
                        <button
                          type="button"
                          onClick={() => setCartQty(line.productId, 0)}
                          className="text-xs font-semibold text-rose-700"
                        >
                          {t('shop.remove')}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            {lines.length > 0 ? (
              <div className="mt-10 space-y-6">
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setPayMode('stripe')}
                    className={`rounded-full px-4 py-2 font-sans text-[11px] uppercase tracking-widest ${
                      payMode === 'stripe'
                        ? 'bg-[#0C2686] text-white'
                        : 'border border-black/10 text-[#1A1A1A]/70'
                    }`}
                  >
                    {t('shop.payCard')}
                  </button>
                  {allAllowCod ? (
                    <button
                      type="button"
                      onClick={() => setPayMode('cod')}
                      className={`rounded-full px-4 py-2 font-sans text-[11px] uppercase tracking-widest ${
                        payMode === 'cod'
                          ? 'bg-[#0C2686] text-white'
                          : 'border border-black/10 text-[#1A1A1A]/70'
                      }`}
                    >
                      {t('shop.payCod')}
                    </button>
                  ) : null}
                </div>

                {payMode === 'stripe' ? (
                  <div>
                    <p className="mb-4 font-sans text-xs text-[#1A1A1A]/55">
                      {t('shop.checkoutHint')}
                    </p>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => checkoutMutation.mutate()}
                      className="rounded-full bg-[#0C2686] px-8 py-3.5 font-sans text-xs uppercase tracking-[0.22em] text-white disabled:opacity-50"
                    >
                      {checkoutMutation.isPending
                        ? t('shop.redirecting')
                        : t('shop.checkout')}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={onCodSubmit} className="space-y-3">
                    <p className="font-sans text-xs text-[#1A1A1A]/55">
                      {t('shop.codHint')}
                    </p>
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('shop.shipName')}
                      className="w-full rounded-xl border border-[#EAE6DF] px-3 py-2.5 text-sm"
                    />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('shop.email')}
                      className="w-full rounded-xl border border-[#EAE6DF] px-3 py-2.5 text-sm"
                    />
                    <input
                      required
                      value={line1}
                      onChange={(e) => setLine1(e.target.value)}
                      placeholder={t('shop.shipLine1')}
                      className="w-full rounded-xl border border-[#EAE6DF] px-3 py-2.5 text-sm"
                    />
                    <input
                      value={line2}
                      onChange={(e) => setLine2(e.target.value)}
                      placeholder={t('shop.shipLine2')}
                      className="w-full rounded-xl border border-[#EAE6DF] px-3 py-2.5 text-sm"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder={t('shop.shipCity')}
                        className="w-full rounded-xl border border-[#EAE6DF] px-3 py-2.5 text-sm"
                      />
                      <input
                        required
                        value={postal}
                        onChange={(e) => setPostal(e.target.value)}
                        placeholder={t('shop.shipPostal')}
                        className="w-full rounded-xl border border-[#EAE6DF] px-3 py-2.5 text-sm"
                      />
                    </div>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t('shop.shipPhone')}
                      className="w-full rounded-xl border border-[#EAE6DF] px-3 py-2.5 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={pending}
                      className="rounded-full bg-[#0C2686] px-8 py-3.5 font-sans text-xs uppercase tracking-[0.22em] text-white disabled:opacity-50"
                    >
                      {codMutation.isPending
                        ? t('shop.placing')
                        : t('shop.placeCodOrder')}
                    </button>
                  </form>
                )}

                {error ? (
                  <p className="text-sm text-rose-700">
                    {error.message || t('shop.checkoutFailed')}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </>
      )}
    </JournalShell>
  )
}
