import type { JournalLang } from '@/components/concept-3/JournalShell'

export interface JournalNavLink {
  label: string
  to: string
}

/** Primary browse destinations shown across footer / mobile nav. */
export function getJournalNavLinks(lang: JournalLang): JournalNavLink[] {
  return [
    { label: lang === 'bg' ? 'Истории' : 'Stories', to: '/stories' },
    { label: lang === 'bg' ? 'Места' : 'Places', to: '/places' },
    { label: lang === 'bg' ? 'Открийте' : 'Discover', to: '/discover' },
    { label: lang === 'bg' ? 'Автори' : 'Authors', to: '/authors' },
    { label: lang === 'bg' ? 'Традиции' : 'Traditions', to: '/traditions' },
    { label: lang === 'bg' ? 'Гласове' : 'Voices', to: '/voices' },
    { label: lang === 'bg' ? 'Спорт' : 'Sports', to: '/sports' },
    { label: lang === 'bg' ? 'Събития' : 'Events', to: '/events' },
    { label: lang === 'bg' ? 'Видео' : 'Video', to: '/video' },
    { label: lang === 'bg' ? 'Кампании' : 'Campaigns', to: '/campaigns' },
    { label: lang === 'bg' ? 'Магазин' : 'Shop', to: '/#shop' },
  ]
}
