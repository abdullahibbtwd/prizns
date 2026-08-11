import { Link } from 'react-router-dom'
import { Heart, PenLine } from 'lucide-react'
import {
  getFooterSecondaryLinks,
  getPrimaryNavLinks,
} from '@/data/concept-3/nav'

interface JournalFooterProps {
  lang: 'bg' | 'en'
}

export function JournalFooter({ lang }: JournalFooterProps) {
  const primaryLinks = getPrimaryNavLinks(lang)
  const secondaryLinks = getFooterSecondaryLinks(lang)

  return (
    <footer className="overflow-x-hidden border-t border-[#EAE6DF] bg-[#FDFBF7] px-6 py-24 text-[#1A1A1A] md:px-12 md:py-32">
      <div className="mx-auto flex max-w-7xl flex-col items-center text-center">
        <Link
          to="/"
          className="font-heading text-5xl font-light uppercase tracking-[0.15em] text-[#1A1A1A] transition-opacity hover:opacity-85 sm:text-7xl sm:tracking-[0.25em] md:text-[120px]"
        >
          PRIZNI
        </Link>

        <p className="mt-8 max-w-2xl font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/65 md:text-base">
          {lang === 'bg'
            ? 'Топъл дигитален журнал за човешки истории, места и традиции от Северозападна България.'
            : 'A warm digital journal of human stories, places, and traditions from Northwestern Bulgaria.'}
        </p>

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
          <Link
            to="/write-for-us"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-[#0C2686]"
          >
            <PenLine className="size-3.5" />
            {lang === 'bg' ? 'Пишете за нас' : 'Write for Us'}
          </Link>
          <Link
            to="/support"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-[#0C2686]"
          >
            <Heart className="size-3.5" />
            {lang === 'bg' ? 'Подкрепете ни' : 'Support Us'}
          </Link>
          <Link
            to="/partnerships"
            className="transition-colors hover:text-[#0C2686]"
          >
            {lang === 'bg' ? 'Партньорства' : 'Partnerships'}
          </Link>
          <Link
            to="/contact"
            className="transition-colors hover:text-[#0C2686]"
          >
            {lang === 'bg' ? 'Контакт' : 'Contact'}
          </Link>
          <a
            href="/feed.xml"
            className="transition-colors hover:text-[#0C2686]"
          >
            RSS
          </a>
          <a href="#instagram" className="transition-colors hover:text-[#0C2686]">
            Instagram
          </a>
          <a href="#facebook" className="transition-colors hover:text-[#0C2686]">
            Facebook
          </a>
        </div>

        <div className="mt-16 flex w-full flex-col items-center justify-between gap-4 border-t border-[#EAE6DF] pt-8 font-sans text-[11px] uppercase tracking-widest text-[#1A1A1A]/40 sm:flex-row">
          <span>© 2026 PRIZNI</span>
          <span>The Living Journal of Northwestern Bulgaria</span>
        </div>
      </div>
    </footer>
  )
}
