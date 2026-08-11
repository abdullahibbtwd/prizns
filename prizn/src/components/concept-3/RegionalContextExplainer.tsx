import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Compass } from 'lucide-react'
import { ApiError } from '@/lib/api'
import {
  fetchRegionalContext,
  type RegionalContextResult,
} from '@/lib/ai-api'
import type { JournalLang } from '@/components/concept-3/JournalShell'

export function RegionalContextExplainer({
  section,
  slug,
  lang,
}: {
  section: string
  slug: string
  lang: JournalLang
}) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<RegionalContextResult | null>(null)

  const onExplain = async () => {
    setError('')
    setLoading(true)
    try {
      const data = await fetchRegionalContext({ section, slug, lang })
      setResult(data)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t('regionalContextError'),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <aside
      className="mt-10 rounded-[16px] border border-dashed border-[#0C2686]/25 bg-[#0C2686]/5 px-6 py-6 md:px-8 print-hidden"
      data-print-hide
    >
      <span className="mb-2 flex items-center gap-2 font-sans text-[11px] font-medium uppercase tracking-[0.22em] text-[#0C2686]">
        <Compass className="size-3.5" strokeWidth={1.5} />
        {t('regionalContextTitle')}
      </span>
      <p className="mb-4 max-w-xl font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/65">
        {t('regionalContextBody')}
      </p>

      {!result ? (
        <>
          {error ? (
            <p className="mb-3 font-sans text-sm text-rose-700">{error}</p>
          ) : null}
          <button
            type="button"
            disabled={loading}
            onClick={() => void onExplain()}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#0C2686]/35 px-5 py-2.5 font-sans text-[11px] uppercase tracking-[0.18em] text-[#0C2686] transition-colors hover:border-[#0C2686] hover:bg-white disabled:opacity-60"
          >
            {loading ? t('regionalContextLoading') : t('regionalContextCta')}
          </button>
        </>
      ) : (
        <div className="space-y-4">
          <p className="whitespace-pre-line font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/80 md:text-[15px]">
            {result.context}
          </p>
          {result.placeNotes.length > 0 ? (
            <ul className="space-y-1.5 border-t border-[#EAE6DF] pt-4">
              {result.placeNotes.map((note) => (
                <li
                  key={note}
                  className="font-sans text-sm font-light text-[#1A1A1A]/70 before:mr-2 before:text-[#0C2686] before:content-['·']"
                >
                  {note}
                </li>
              ))}
            </ul>
          ) : null}
          {result.whyItMatters ? (
            <p className="font-sans text-sm italic leading-relaxed text-[#1A1A1A]/60">
              {result.whyItMatters}
            </p>
          ) : null}
          <button
            type="button"
            disabled={loading}
            onClick={() => void onExplain()}
            className="font-sans text-[11px] uppercase tracking-[0.18em] text-[#0C2686]/70 transition-colors hover:text-[#0C2686]"
          >
            {loading ? t('regionalContextLoading') : t('regionalContextRefresh')}
          </button>
        </div>
      )}
    </aside>
  )
}
