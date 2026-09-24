import { Link } from '@/components/LocaleLink'
import { useTranslation } from 'react-i18next'
import { JournalShell } from '@/components/concept-3/JournalShell'
import { PageMeta } from '@/components/PageMeta'

export default function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <JournalShell navVariant="solid">
      {({ lang }) => (
        <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 py-28 text-center md:px-12">
          <PageMeta
            lang={lang}
            title={t('pageNotFoundTitle')}
            description={t('pageNotFoundBody')}
            path="/404"
            noIndex
          />
          <p className="font-sans text-[11px] font-medium uppercase tracking-[0.28em] text-[#0C2686]">
            404
          </p>
          <h1 className="mt-4 font-heading text-4xl font-light tracking-tight text-[#1A1A1A] md:text-5xl">
            {t('pageNotFoundTitle')}
          </h1>
          <p className="mt-5 max-w-md font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/65 md:text-base">
            {t('pageNotFoundBody')}
          </p>
          <Link
            to="/"
            className="mt-10 inline-flex items-center rounded-full bg-[#0C2686] px-8 py-3.5 font-sans text-xs font-medium uppercase tracking-[0.25em] text-white transition-colors hover:bg-[#1A1A1A]"
          >
            {t('returnToJournal')}
          </Link>
        </main>
      )}
    </JournalShell>
  )
}
