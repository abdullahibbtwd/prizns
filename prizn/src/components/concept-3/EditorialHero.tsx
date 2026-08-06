import { motion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import { journalContent } from '@/data/concept-3/content'

interface EditorialHeroProps {
  lang: 'bg' | 'en'
}

export function EditorialHero({ lang }: EditorialHeroProps) {
  const content = journalContent.hero

  const scrollToLetter = () => {
    const el = document.getElementById('editors-letter')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="relative h-screen w-full overflow-hidden flex flex-col justify-between items-center text-white px-6 py-12 md:py-16">
      {/* Editorial Portrait Background with Subtle Slow Motion Zoom */}
      <motion.div
        initial={{ scale: 1.05 }}
        animate={{ scale: 1 }}
        transition={{ duration: 10, ease: 'easeOut' }}
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${content.heroImage})` }}
      />

      {/* Luxury Matte Dark Overlay */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/50 via-black/35 to-black/70" />

      {/* Top Brand Mark */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.2 }}
        className="relative z-10 pt-16 md:pt-12 text-center"
      >
        <span className="font-heading text-lg md:text-xl tracking-[0.4em] uppercase font-light text-white/90">
          {content.brand}
        </span>
      </motion.div>

      {/* Center Hero Heading */}
      <div className="relative z-10 max-w-4xl mx-auto text-center my-auto px-4">
        <motion.h1
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.4 }}
          className="font-heading text-4xl sm:text-6xl md:text-7xl lg:text-[80px] font-normal leading-[1.08] tracking-tight text-white drop-shadow-sm"
        >
          {lang === 'bg' ? content.bgTitle : content.title}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="mt-6 flex items-center justify-center gap-3"
        >
          <div className="h-px w-8 bg-white/40" />
          <span className="font-sans text-[11px] md:text-xs uppercase tracking-[0.35em] text-white/80 font-light">
            {lang === 'bg' ? content.editionBg : content.edition}
          </span>
          <div className="h-px w-8 bg-white/40" />
        </motion.div>
      </div>

      {/* Bottom Action - Begin Reading */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 1 }}
        className="relative z-10 pb-6 md:pb-8 text-center"
      >
        <button
          onClick={scrollToLetter}
          className="group inline-flex items-center gap-3 font-sans text-xs uppercase tracking-[0.3em] text-white/90 hover:text-white border border-white/30 hover:border-white rounded-full px-7 py-3.5 backdrop-blur-xs transition-all duration-300 hover:bg-white/10"
        >
          <span>{lang === 'bg' ? content.ctaBg : content.cta}</span>
          <ArrowDown className="size-3.5 transition-transform duration-300 group-hover:translate-y-1 stroke-[1.5]" />
        </button>
      </motion.div>
    </section>
  )
}
