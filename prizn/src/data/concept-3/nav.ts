import type { JournalLang } from '@/components/concept-3/JournalShell'

export interface JournalNavLink {
  label: string
  to: string
}

/** Primary browse destinations — Phase 1 pillars. */
export function getPrimaryNavLinks(lang: JournalLang): JournalNavLink[] {
  return [
    {
      label: lang === 'bg' ? 'Човешки истории' : 'Human Stories',
      to: '/stories',
    },
    {
      label: lang === 'bg' ? 'Нашите места' : 'Our Places',
      to: '/places',
    },
    {
      label: lang === 'bg' ? 'Традиции' : 'Traditions',
      to: '/traditions',
    },
  ]
}

/** Footer secondary sections (lower UX priority). */
export function getFooterSecondaryLinks(lang: JournalLang): JournalNavLink[] {
  return [
    { label: lang === 'bg' ? 'Спорт' : 'Sports', to: '/sports' },
    { label: lang === 'bg' ? 'Събития' : 'Events', to: '/events' },
    { label: lang === 'bg' ? 'Новини' : 'News', to: '/news' },
    { label: lang === 'bg' ? 'Магазин' : 'Shop', to: '/shop' },
    {
      label: lang === 'bg' ? 'История на годината' : 'Story of the Year',
      to: '/story-of-the-year',
    },
    {
      label: lang === 'bg' ? 'Архивът' : 'Ask the Archive',
      to: '/archive',
    },
  ]
}

/** Tertiary destinations kept for deep links / mobile overflow. */
export function getTertiaryNavLinks(lang: JournalLang): JournalNavLink[] {
  return [
    { label: lang === 'bg' ? 'Открийте' : 'Discover', to: '/discover' },
    { label: lang === 'bg' ? 'Автори' : 'Authors', to: '/authors' },
    { label: lang === 'bg' ? 'Гласове' : 'Voices', to: '/voices' },
  ]
}

/** @deprecated Prefer getPrimaryNavLinks / getFooterSecondaryLinks */
export function getJournalNavLinks(lang: JournalLang): JournalNavLink[] {
  return [
    ...getPrimaryNavLinks(lang),
    ...getTertiaryNavLinks(lang),
    ...getFooterSecondaryLinks(lang),
    { label: lang === 'bg' ? 'Видео' : 'Video', to: '/video' },
    { label: lang === 'bg' ? 'Кампании' : 'Campaigns', to: '/campaigns' },
    { label: lang === 'bg' ? 'Магазин' : 'Shop', to: '/shop' },
  ]
}
