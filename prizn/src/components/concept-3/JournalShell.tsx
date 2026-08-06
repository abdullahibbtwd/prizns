import type { ReactNode } from 'react'
import { MinimalNav } from '@/components/concept-3/MinimalNav'
import { JournalFooter } from '@/components/concept-3/JournalFooter'
import { useJournalLang } from '@/hooks/useJournalLang'

export type JournalLang = 'bg' | 'en'

export interface JournalContextValue {
  lang: JournalLang
}

interface JournalShellProps {
  navVariant?: 'hero' | 'solid'
  /** Hide global nav/footer for reader pages that bring their own chrome */
  hideChrome?: boolean
  children: (ctx: JournalContextValue) => ReactNode
}

export function JournalShell({
  children,
  navVariant = 'solid',
  hideChrome = false,
}: JournalShellProps) {
  const { lang, setLang } = useJournalLang()

  return (
    <div className="min-h-svh w-full overflow-x-hidden bg-[#FDFBF7] text-[#1A1A1A] font-sans selection:bg-[#0C2686]/15 selection:text-[#0C2686]">
      {!hideChrome && <MinimalNav lang={lang} setLang={setLang} variant={navVariant} />}
      {children({ lang })}
      {!hideChrome && <JournalFooter lang={lang} />}
    </div>
  )
}
