import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { JournalShell } from '@/components/concept-3/JournalShell'
import { PageMeta } from '@/components/PageMeta'
import { useJournalLang } from '@/hooks/useJournalLang'

export default function ShopSuccessPage() {
  const { lang } = useJournalLang()
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const publicId = params.get('id') || ''

  return (
    <JournalShell navVariant="solid">
      {() => (
        <>
          <PageMeta lang={lang} title={t('shop.successTitle')} path="/shop/success" />
          <div className="mx-auto max-w-xl px-6 pb-20 pt-28 text-center md:px-12">
            <h1 className="font-heading text-4xl text-[#1A1A1A]">
              {t('shop.successTitle')}
            </h1>
            <p className="mt-4 font-sans text-sm font-light text-[#1A1A1A]/65">
              {t('shop.successBody')}
            </p>
            {publicId ? (
              <p className="mt-6 font-sans text-sm text-[#0C2686]">
                {t('shop.orderId')}: <strong>{publicId}</strong>
              </p>
            ) : null}
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link
                to={
                  publicId
                    ? `/shop/track?id=${encodeURIComponent(publicId)}`
                    : '/shop/track'
                }
                className="rounded-full bg-[#0C2686] px-6 py-3 font-sans text-[11px] uppercase tracking-[0.2em] text-white"
              >
                {t('shop.trackOrder')}
              </Link>
              <Link
                to="/shop"
                className="rounded-full border border-black/10 px-6 py-3 font-sans text-[11px] uppercase tracking-[0.2em] text-[#1A1A1A]/70"
              >
                {t('shop.backToShop')}
              </Link>
            </div>
          </div>
        </>
      )}
    </JournalShell>
  )
}
