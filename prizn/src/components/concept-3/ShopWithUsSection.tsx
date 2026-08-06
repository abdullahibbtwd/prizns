import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

interface ShopWithUsSectionProps {
  lang: 'bg' | 'en'
}

export function ShopWithUsSection({ lang }: ShopWithUsSectionProps) {
  return (
    <section
      id="shop"
      className="relative overflow-hidden border-t border-[#EAE6DF] bg-[#1A1A1A] px-6 py-24 text-white md:px-12 md:py-32"
    >
      <div
        className="absolute inset-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: 'url(/craftsman.jpg)' }}
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/65 to-[#0C2686]/50"
        aria-hidden
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="relative z-10 mx-auto max-w-3xl text-center"
      >
        <span className="mb-4 block font-sans text-xs font-medium uppercase tracking-[0.3em] text-white/70">
          {lang === 'bg' ? 'Магазин' : 'Shop'}
        </span>
        <h2 className="font-heading text-4xl font-light tracking-tight md:text-6xl">
          {lang === 'bg' ? 'Пазарувайте с нас' : 'Shop with us'}
        </h2>
        <p className="mx-auto mt-6 max-w-xl font-sans text-sm font-light leading-relaxed text-white/75 md:text-base">
          {lang === 'bg'
            ? 'Печатни издания, предмети от местни занаятчии и подаръци, вдъхновени от Северозапада — скоро в PRIZNI.'
            : 'Print editions, objects from local makers, and gifts inspired by the Northwest — coming soon to PRIZNI.'}
        </p>
        <button
          type="button"
          className="mt-10 inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-8 py-3.5 font-sans text-xs font-medium uppercase tracking-[0.22em] text-[#1A1A1A] transition-colors duration-300 hover:bg-[#FDFBF7]"
        >
          {lang === 'bg' ? 'Към магазина' : 'Go to shop'}
          <ArrowRight className="size-3.5 stroke-[1.5]" />
        </button>
      </motion.div>
    </section>
  )
}
