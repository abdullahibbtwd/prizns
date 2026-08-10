import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { JournalShell } from '@/components/concept-3/JournalShell'
import { PageMeta } from '@/components/PageMeta'
import { useJournalLang } from '@/hooks/useJournalLang'
import {
  markShopOrderDelivered,
  trackShopOrder,
  type ShopOrderTrack,
} from '@/lib/shop-api'
import { ApiError } from '@/lib/api'

export default function ShopTrackPage() {
  const { lang } = useJournalLang()
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const [publicId, setPublicId] = useState(
    (params.get('id') || '').toUpperCase(),
  )
  const [email, setEmail] = useState('')
  const [result, setResult] = useState<ShopOrderTrack | null>(null)

  const trackMutation = useMutation({
    mutationFn: () => trackShopOrder(publicId.trim(), email.trim()),
    onSuccess: setResult,
  })

  const deliveredMutation = useMutation({
    mutationFn: () => markShopOrderDelivered(publicId.trim(), email.trim()),
    onSuccess: setResult,
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    trackMutation.mutate()
  }

  return (
    <JournalShell navVariant="solid">
      {() => (
        <>
          <PageMeta lang={lang} title={t('shop.trackOrder')} path="/shop/track" />
          <div className="mx-auto max-w-xl px-6 pb-20 pt-28 md:px-12">
            <Link
              to="/shop"
              className="mb-8 inline-block font-sans text-[11px] uppercase tracking-widest text-[#0C2686]"
            >
              ← {t('shop.backToShop')}
            </Link>
            <h1 className="mb-3 font-heading text-4xl text-[#1A1A1A]">
              {t('shop.trackOrder')}
            </h1>
            <p className="mb-8 font-sans text-sm font-light text-[#1A1A1A]/60">
              {t('shop.trackHint')}
            </p>

            <form onSubmit={onSubmit} className="space-y-4">
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-500">
                {t('shop.orderId')}
                <input
                  required
                  value={publicId}
                  onChange={(e) => setPublicId(e.target.value.toUpperCase())}
                  className="mt-1 w-full rounded-xl border border-[#EAE6DF] px-3 py-2.5 text-sm"
                  placeholder="PRZ-XXXXXXXX"
                />
              </label>
              <label className="block text-xs font-medium uppercase tracking-wider text-stone-500">
                {t('shop.email')}
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#EAE6DF] px-3 py-2.5 text-sm"
                />
              </label>
              <button
                type="submit"
                disabled={trackMutation.isPending}
                className="rounded-full bg-[#0C2686] px-6 py-3 font-sans text-[11px] uppercase tracking-[0.2em] text-white disabled:opacity-50"
              >
                {t('shop.lookUp')}
              </button>
            </form>

            {trackMutation.isError ? (
              <p className="mt-4 text-sm text-rose-700">
                {(trackMutation.error as ApiError)?.message ||
                  t('shop.trackFailed')}
              </p>
            ) : null}

            {result ? (
              <div className="mt-10 border-t border-[#EAE6DF] pt-8">
                <p className="font-sans text-[11px] uppercase tracking-[0.2em] text-[#0C2686]">
                  {result.publicId}
                </p>
                <p className="mt-2 font-heading text-3xl text-[#1A1A1A]">
                  {t(`shop.status.${result.status}`, {
                    defaultValue: result.status,
                  })}
                </p>
                <p className="mt-2 text-sm text-[#1A1A1A]/55">
                  {result.emailMasked}
                </p>
                {result.paymentMethod === 'COD' ? (
                  <p className="mt-2 text-sm text-[#0C2686]">
                    {t('shop.payCod')}
                  </p>
                ) : null}
                {result.estimatedArrival ? (
                  <p className="mt-2 text-sm text-[#1A1A1A]/65">
                    {t('shop.estimatedArrival')}: {result.estimatedArrival}
                  </p>
                ) : null}
                <ul className="mt-6 space-y-2 text-sm text-[#1A1A1A]/75">
                  {result.items.map((item, index) => (
                    <li key={`${item.title}-${index}`}>
                      {item.qty}× {item.title}
                    </li>
                  ))}
                </ul>
                {result.canMarkDelivered ? (
                  <button
                    type="button"
                    disabled={deliveredMutation.isPending}
                    onClick={() => deliveredMutation.mutate()}
                    className="mt-8 rounded-full border border-[#0C2686] px-6 py-3 font-sans text-[11px] uppercase tracking-[0.2em] text-[#0C2686] disabled:opacity-50"
                  >
                    {t('shop.markDelivered')}
                  </button>
                ) : null}
                {deliveredMutation.isError ? (
                  <p className="mt-3 text-sm text-rose-700">
                    {(deliveredMutation.error as ApiError)?.message}
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
