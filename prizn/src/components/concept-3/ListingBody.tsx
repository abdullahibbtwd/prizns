import type { JournalLang } from '@/components/concept-3/JournalShell'
import { SectionLoading } from '@/components/concept-3/SectionLoading'

export function ListingBody({
  lang,
  isLoading,
  isError,
  isEmpty,
  empty,
  children,
  skeletonCount = 6,
  cardClassName,
  gridClassName,
  tone = 'light',
}: {
  lang: JournalLang
  isLoading: boolean
  isError?: boolean
  isEmpty: boolean
  empty: string
  children: React.ReactNode
  skeletonCount?: number
  cardClassName?: string
  gridClassName?: string
  tone?: 'light' | 'dark'
}) {
  if (isLoading) {
    return (
      <SectionLoading
        lang={lang}
        count={skeletonCount}
        cardClassName={cardClassName}
        gridClassName={gridClassName}
        tone={tone}
      />
    )
  }

  if (isError) {
    return (
      <p
        className={
          tone === 'dark'
            ? 'text-center font-sans text-sm text-rose-300'
            : 'text-center font-sans text-sm text-rose-700'
        }
      >
        {lang === 'bg'
          ? 'Неуспешно зареждане. Опреснете страницата.'
          : 'Could not load. Refresh the page.'}
      </p>
    )
  }

  if (isEmpty) {
    return (
      <p
        className={
          tone === 'dark'
            ? 'text-center font-sans text-sm text-white/50'
            : 'text-center font-sans text-sm text-[#1A1A1A]/55'
        }
      >
        {empty}
      </p>
    )
  }

  return children
}

export function listingCountLabel(
  lang: JournalLang,
  isLoading: boolean,
  ready: string,
) {
  if (isLoading) return lang === 'bg' ? 'Зареждане…' : 'Loading…'
  return ready
}
