import { motion } from 'framer-motion'
import { journalContent } from '@/data/concept-3/content'

interface QuoteSectionProps {
  lang: 'bg' | 'en'
}

export function QuoteSection({ lang }: QuoteSectionProps) {
  const quote = journalContent.quote

  return (
    <section className="bg-[#FDFBF7] py-32 md:py-48 px-6 md:px-12 border-t border-b border-[#EAE6DF] relative overflow-hidden">
      {/* Delicate Decorative Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 overflow-hidden">
        <span className="font-heading text-[10rem] sm:text-[16rem] md:text-[24rem] text-journal-ink uppercase select-none leading-none">
          PRIZNI
        </span>
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2 }}
          className="space-y-4"
        >
          <span className="font-heading text-6xl md:text-8xl text-[#0C2686]/30 leading-none block">
            “
          </span>
          <p className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-[#1A1A1A] font-light leading-[1.12] tracking-tight italic">
            {lang === 'bg' ? quote.line1Bg : quote.line1}
          </p>
          <p className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-[#0C2686] font-normal leading-[1.12] tracking-tight italic">
            {lang === 'bg' ? quote.line2Bg : quote.line2}
          </p>
          <div className="w-16 h-0.5 bg-[#0C2686]/40 mx-auto mt-10" />
        </motion.div>
      </div>
    </section>
  )
}
