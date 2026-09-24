import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from 'react'
import {
  Link as RouterLink,
  NavLink as RouterNavLink,
  type LinkProps,
  type NavLinkProps,
} from 'react-router-dom'
import { useJournalLang } from '@/hooks/useJournalLang'
import { withLocale } from '@/lib/locale-path'

function localizeTo(
  to: LinkProps['to'],
  lang: 'bg' | 'en',
): LinkProps['to'] {
  if (typeof to === 'string') return withLocale(to, lang)
  if (to && typeof to === 'object' && 'pathname' in to && to.pathname) {
    return { ...to, pathname: withLocale(to.pathname, lang) }
  }
  return to
}

/** Drop-in Link that prefixes `/en` when the journal language is English. */
export const Link = forwardRef<ElementRef<typeof RouterLink>, LinkProps>(
  function LocaleLink({ to, ...props }, ref) {
    const { lang } = useJournalLang()
    return <RouterLink ref={ref} to={localizeTo(to, lang)} {...props} />
  },
)

export const NavLink = forwardRef<
  ElementRef<typeof RouterNavLink>,
  NavLinkProps
>(function LocaleNavLink({ to, ...props }, ref) {
  const { lang } = useJournalLang()
  return <RouterNavLink ref={ref} to={localizeTo(to, lang)} {...props} />
})

export type { LinkProps, NavLinkProps }
export type LocaleLinkProps = ComponentPropsWithoutRef<typeof Link>
