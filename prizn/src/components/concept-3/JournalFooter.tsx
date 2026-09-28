import { useTranslation } from 'react-i18next'
import { Link } from '@/components/LocaleLink'
import { Heart, PenLine } from 'lucide-react'
import {
  getContributeNavLinks,
  getFooterSecondaryLinks,
  getPrimaryNavLinks,
} from '@/data/concept-3/nav'
import { useSectionPresence } from '@/hooks/useSectionPresence'
import { useSiteSettings } from '@/lib/site-settings-api'

interface JournalFooterProps {
  lang: 'bg' | 'en'
}

export function JournalFooter({ lang }: JournalFooterProps) {
  const { t } = useTranslation()
  const { isPathVisible } = useSectionPresence()
  const { data: settings } = useSiteSettings()
  const primaryLinks = getPrimaryNavLinks(lang).filter((link) =>
    isPathVisible(link.to),
  )
  const secondaryLinks = getFooterSecondaryLinks(lang).filter((link) =>
    isPathVisible(link.to),
  )
  const contributeLinks = getContributeNavLinks(lang)
  const socialLinks = [
    { label: 'Facebook', href: settings?.social.facebook },
    { label: 'Instagram', href: settings?.social.instagram },
    { label: 'YouTube', href: settings?.social.youtube },
    { label: 'TikTok', href: settings?.social.tiktok },
  ].filter((link): link is { label: string; href: string } => Boolean(link.href))
  const credit = settings?.photographerCredit ?? null

  return (
    <footer className="overflow-x-hidden border-t border-[#EAE6DF] bg-[#FDFBF7] px-6 py-24 text-[#1A1A1A] md:px-12 md:py-32">
      <div className="mx-auto flex max-w-7xl flex-col items-center text-center">
        <Link
          to="/"
          className="font-heading text-5xl font-light uppercase tracking-[0.15em] text-[#1A1A1A] transition-opacity hover:opacity-85 sm:text-7xl sm:tracking-[0.25em] md:text-[120px]"
        >
          PRIZNI
        </Link>

        <nav
          aria-label={lang === 'bg' ? 'Основна навигация' : 'Primary'}
          className="mt-12 flex max-w-4xl flex-wrap items-center justify-center gap-x-5 gap-y-3 font-sans text-[11px] uppercase tracking-[0.2em] text-[#1A1A1A]/70 sm:gap-x-7"
        >
          {primaryLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="transition-colors hover:text-[#0C2686]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <nav
          aria-label={lang === 'bg' ? 'Още раздели' : 'More sections'}
          className="mt-6 flex max-w-4xl flex-wrap items-center justify-center gap-x-5 gap-y-3 font-sans text-[11px] uppercase tracking-[0.2em] text-[#1A1A1A]/45 sm:gap-x-7"
        >
          {secondaryLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="transition-colors hover:text-[#0C2686]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mt-10 flex max-w-full flex-wrap items-center justify-center gap-x-6 gap-y-3 font-sans text-xs uppercase tracking-[0.2em] text-[#1A1A1A]/55 sm:gap-x-8">
          <Link
            to="/why-prizni"
            className="transition-colors hover:text-[#0C2686]"
          >
            {lang === 'bg' ? 'Защо Prizni' : 'Why Prizni'}
          </Link>
          {contributeLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="inline-flex items-center gap-1.5 transition-colors hover:text-[#0C2686]"
            >
              {link.to === '/write-for-us' ? (
                <PenLine className="size-3.5" />
              ) : null}
              {link.to === '/support' ? <Heart className="size-3.5" /> : null}
              {link.label}
            </Link>
          ))}
          <Link
            to="/contact"
            className="transition-colors hover:text-[#0C2686]"
          >
            {lang === 'bg' ? 'Контакт' : 'Contact'}
          </Link>
          {socialLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-[#0C2686]"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="mt-16 flex w-full flex-col items-center justify-between gap-4 border-t border-[#EAE6DF] pt-8 font-sans text-[11px] uppercase tracking-widest text-[#1A1A1A]/40 sm:flex-row">
          <span>© {new Date().getFullYear()} PRIZNI</span>
          {credit ? (
            <span>
              {lang === 'bg' ? 'Снимки: ' : 'Photography: '}
              {credit.url ? (
                <a
                  href={credit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#1A1A1A]/60 underline-offset-4 transition-colors hover:text-[#0C2686] hover:underline"
                >
                  {credit.name}
                </a>
              ) : (
                credit.name
              )}
            </span>
          ) : null}
          <span>{t('livingJournalTagline')}</span>
        </div>
      </div>
    </footer>
  )
}
