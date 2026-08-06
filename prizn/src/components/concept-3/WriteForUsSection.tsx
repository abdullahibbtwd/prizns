import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PenLine } from 'lucide-react'
import { journalContent } from '@/data/concept-3/content'

interface WriteForUsSectionProps {
  lang: 'bg' | 'en'
}

export function WriteForUsSection({ lang }: WriteForUsSectionProps) {
  const content = journalContent.writeForUs

  return (
    <section id="write-for-us" className="border-t border-[#EAE6DF] bg-[#FDFBF7] px-6 py-24 md:px-12 md:py-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="mx-auto max-w-3xl text-center"
      >
        <span className="mb-4 block font-sans text-xs font-medium uppercase tracking-[0.3em] text-[#0C2686]">
          {lang === 'bg' ? 'Присъединете се' : 'Contribute'}
        </span>
        <h2 className="font-heading text-4xl font-light tracking-tight text-[#1A1A1A] md:text-6xl">
          {lang === 'bg' ? content.titleBg : content.title}
        </h2>
        <p className="mt-8 font-heading text-2xl italic leading-snug text-[#1A1A1A]/75 md:text-3xl">
          {lang === 'bg' ? content.line1Bg : content.line1}
        </p>
        <p className="mt-3 font-heading text-2xl italic leading-snug text-[#0C2686] md:text-3xl">
          {lang === 'bg' ? content.line2Bg : content.line2}
        </p>
        <Link
          to="/write-for-us"
          className="mt-10 inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#0C2686] bg-transparent px-8 py-3.5 font-sans text-xs font-medium uppercase tracking-[0.22em] text-[#0C2686] transition-all duration-300 hover:bg-[#0C2686] hover:text-white"
        >
          <PenLine className="size-3.5" />
          {lang === 'bg' ? content.ctaBg : content.cta}
        </Link>
      </motion.div>
    </section>
  )
}
