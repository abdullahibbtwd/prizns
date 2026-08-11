import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Heart } from 'lucide-react'
import { ApiError } from '@/lib/api'
import { createDonationCheckout } from '@/lib/donations-api'
import type { JournalLang } from '@/components/concept-3/JournalShell'

const PRESETS = [5, 10, 25] as const

export function SupportThisStory({
  articleId,
  lang,
}: {
  articleId?: string
  lang: JournalLang
}) {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState<number>(10)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [thanks, setThanks] = useState(
    () => searchParams.get('donation') === 'success',
  )

  useEffect(() => {
    if (searchParams.get('donation') === 'success') {
      setThanks(true)
      setOpen(true)
      const next = new URLSearchParams(searchParams)
      next.delete('donation')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  if (!articleId) return null

  const onDonate = async () => {
    setError('')
    setSubmitting(true)
    try {
      const result = await createDonationCheckout({
        amountBgn: amount,
        articleId,
      })
      window.location.href = result.url
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t('supportStoryError'),
      )
      setSubmitting(false)
    }
  }

  if (thanks) {
    return (
      <aside
        className="mt-14 text-center print-hidden"
        data-print-hide
      >
        <p className="inline-flex items-center gap-2 font-sans text-sm font-light text-[#0C2686]">
          <Heart className="size-3.5 fill-[#0C2686]" strokeWidth={1.5} />
          {t('supportStoryThanks')}
        </p>
      </aside>
    )
  }

  if (!open) {
    return (
      <div className="mt-14 flex justify-center print-hidden" data-print-hide>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-black/10 px-5 py-2.5 font-sans text-[11px] uppercase tracking-[0.2em] text-[#1A1A1A]/70 transition-colors hover:border-[#0C2686] hover:text-[#0C2686]"
        >
          <Heart className="size-3.5" strokeWidth={1.5} />
          {t('supportStoryOpen')}
        </button>
      </div>
    )
  }

  return (
    <aside
      className="mt-14 rounded-[16px] border border-[#EAE6DF] bg-white px-6 py-6 md:px-8 print-hidden"
      data-print-hide
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-sans text-[11px] font-medium uppercase tracking-[0.22em] text-[#0C2686]">
          <Heart className="size-3.5" strokeWidth={1.5} />
          {t('supportStoryTitle')}
        </span>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setError('')
          }}
          className="font-sans text-[10px] uppercase tracking-[0.18em] text-[#1A1A1A]/40 transition-colors hover:text-[#1A1A1A]/70"
        >
          {t('close')}
        </button>
      </div>
      <p className="mb-5 max-w-xl font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/70">
        {t('supportStoryBody')}
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setAmount(preset)}
            className={`rounded-full border px-4 py-2 font-sans text-[11px] uppercase tracking-[0.18em] transition-colors ${
              amount === preset
                ? 'border-[#0C2686] bg-[#0C2686]/5 text-[#0C2686]'
                : 'border-black/10 text-[#1A1A1A]/65 hover:border-[#0C2686]/40'
            }`}
          >
            {preset} {lang === 'bg' ? 'лв.' : 'BGN'}
          </button>
        ))}
      </div>
      {error ? (
        <p className="mb-3 font-sans text-sm text-rose-700">{error}</p>
      ) : null}
      <button
        type="button"
        disabled={submitting}
        onClick={() => void onDonate()}
        className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#0C2686] px-6 py-3 font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#1A1A1A] disabled:opacity-60"
      >
        {submitting ? t('supportStoryRedirecting') : t('supportStoryCta')}
      </button>
    </aside>
  )
}
