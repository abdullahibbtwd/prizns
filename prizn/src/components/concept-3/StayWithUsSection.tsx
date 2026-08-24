import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Handshake, Heart } from 'lucide-react'
import { journalContent } from '@/data/concept-3/content'
import { NewsletterSection } from '@/components/concept-3/NewsletterSection'

interface StayWithUsSectionProps {
  lang: 'bg' | 'en'
}

export function StayWithUsSection({ lang }: StayWithUsSectionProps) {
  const support = journalContent.support

  return (
    <section
      id="stay-with-us"
      className="flex min-h-svh flex-col bg-[#FDFBF7] md:h-svh"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6 md:px-10 md:py-8 lg:px-12 lg:py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="shrink-0 pb-5 text-center md:pb-6"
        >
          <span className="font-sans text-[10px] font-medium uppercase tracking-[0.32em] text-[#0C2686] sm:text-[11px]">
            {lang === 'bg' ? 'Останете близо' : 'Stay with the journal'}
          </span>
          <h2 className="mt-2 font-heading text-3xl font-light tracking-tight text-[#1A1A1A] sm:text-4xl lg:text-5xl">
            {lang === 'bg' ? 'Пишете. Подкрепете. Четете.' : 'Write. Support. Read on.'}
          </h2>
        </motion.div>

        <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3 md:gap-5">
          <article
            id="support"
            className="relative flex min-h-0 overflow-hidden rounded-[20px] bg-[#1A1A1A] text-white"
          >
            <div
              className="absolute inset-0 bg-cover bg-center opacity-45"
              style={{ backgroundImage: 'url(/festival.jpg)' }}
              aria-hidden
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-black via-[#0C2686]/50 to-black/20"
              aria-hidden
            />
            <div className="relative z-10 flex h-full flex-col justify-end p-5 sm:p-7 lg:p-9">
              <span className="font-sans text-[10px] font-medium uppercase tracking-[0.28em] text-white/65">
                {lang === 'bg' ? support.eyebrowBg : support.eyebrow}
              </span>
              <h3 className="mt-2 font-heading text-2xl font-light tracking-tight sm:text-3xl lg:text-4xl">
                {lang === 'bg' ? support.titleBg : support.title}
              </h3>
              <p className="mt-3 max-w-md font-sans text-xs font-light leading-relaxed text-white/75 sm:text-sm lg:line-clamp-none line-clamp-2">
                {lang === 'bg' ? support.textBg : support.text}
              </p>
              <Link
                to="/support"
                className="mt-5 inline-flex w-fit cursor-pointer items-center gap-2 rounded-full bg-white px-5 py-2.5 font-sans text-[10px] font-medium uppercase tracking-[0.2em] text-[#1A1A1A] transition-colors hover:bg-[#FDFBF7] sm:px-6 sm:text-xs"
              >
                <Heart className="size-3.5 fill-current text-[#0C2686]" />
                {lang === 'bg' ? support.ctaBg : support.cta}
              </Link>
            </div>
          </article>

          <article
            id="partnerships"
            className="flex min-h-0 flex-col justify-end rounded-[20px] border border-[#EAE6DF] bg-white p-5 sm:p-7 lg:p-9"
          >
            <span className="inline-flex size-10 items-center justify-center rounded-full border border-[#0C2686]/20 text-[#0C2686] sm:size-12">
              <Handshake className="size-4 sm:size-5" />
            </span>
            <span className="mt-4 font-sans text-[10px] font-medium uppercase tracking-[0.28em] text-[#0C2686] sm:text-[11px]">
              {lang === 'bg' ? 'Заедно' : 'Together'}
            </span>
            <h3 className="mt-2 font-heading text-2xl font-light tracking-tight text-[#1A1A1A] sm:text-3xl lg:text-4xl">
              {lang === 'bg' ? 'Партньорства' : 'Partnerships'}
            </h3>
            <p className="mt-3 max-w-md font-sans text-xs font-light leading-relaxed text-[#1A1A1A]/65 sm:text-sm line-clamp-2 lg:line-clamp-none">
              {lang === 'bg'
                ? 'Работим с културни институции, местни общности и марки, които споделят нашата мисия.'
                : 'We collaborate with cultural institutions, local communities, and brands that share our mission.'}
            </p>
            <Link
              to="/partnerships"
              className="mt-5 inline-flex w-fit cursor-pointer items-center gap-2 rounded-full border border-[#0C2686] px-5 py-2.5 font-sans text-[10px] font-medium uppercase tracking-[0.2em] text-[#0C2686] transition-all hover:bg-[#0C2686] hover:text-white sm:px-6 sm:text-xs"
            >
              {lang === 'bg' ? 'Свържете се с нас' : 'Get in touch'}
            </Link>
          </article>

          <article
            id="newsletter"
            className="flex min-h-0 flex-col justify-end overflow-hidden rounded-[20px] bg-[#0C2686] p-5 text-white sm:p-7 lg:p-9"
          >
            <NewsletterSection lang={lang} variant="panel" />
          </article>
        </div>
      </div>
    </section>
  )
}
