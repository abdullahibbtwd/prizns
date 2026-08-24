import type { JournalLang } from '@/components/concept-3/JournalShell'

export interface JournalNavLink {
  label: string
  to: string
}

/** Primary browse destinations — Human Stories, Places, Events, Traditions. */
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
      label: lang === 'bg' ? 'Събития' : 'Events',
      to: '/events',
    },
    {
      label: lang === 'bg' ? 'Традиции' : 'Traditions',
      to: '/traditions',
    },
  ]
}

/**
 * Destinations after Shop. Sports and News are topic tags, not menu items.
 * Story of the Year / Archive / Discover / Voices stay reachable from the homepage.
 */
export function getFooterSecondaryLinks(lang: JournalLang): JournalNavLink[] {
  return [
    { label: lang === 'bg' ? 'Магазин' : 'Shop', to: '/shop' },
    { label: lang === 'bg' ? 'Автори' : 'Authors', to: '/authors' },
  ]
}

/** Contribute destinations that always remain in the menu after Shop. */
export function getContributeNavLinks(lang: JournalLang): JournalNavLink[] {
  return [
    {
      label: lang === 'bg' ? 'Пишете за нас' : 'Write for Us',
      to: '/write-for-us',
    },
    {
      label: lang === 'bg' ? 'Подкрепете ни' : 'Support Us',
      to: '/support',
    },
    {
      label: lang === 'bg' ? 'Партньорства' : 'Partnerships',
      to: '/partnerships',
    },
  ]
}

/** @deprecated Prefer getPrimaryNavLinks / getFooterSecondaryLinks */
export function getTertiaryNavLinks(lang: JournalLang): JournalNavLink[] {
  return getContributeNavLinks(lang)
}

/** @deprecated Prefer getPrimaryNavLinks / getFooterSecondaryLinks */
export function getJournalNavLinks(lang: JournalLang): JournalNavLink[] {
  return [
    ...getPrimaryNavLinks(lang),
    ...getFooterSecondaryLinks(lang),
    ...getContributeNavLinks(lang),
    { label: lang === 'bg' ? 'Видео' : 'Video', to: '/video' },
    { label: lang === 'bg' ? 'Кампании' : 'Campaigns', to: '/campaigns' },
  ]
}
