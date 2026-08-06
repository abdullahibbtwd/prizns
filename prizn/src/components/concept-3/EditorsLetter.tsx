import { motion } from 'framer-motion'
import { journalContent } from '@/data/concept-3/content'

interface EditorsLetterProps {
  lang: 'bg' | 'en'
}

export function EditorsLetter({ lang }: EditorsLetterProps) {
  const content = journalContent.editorsLetter

  return (
    <section id="editors-letter" className="bg-[#FDFBF7] py-28 md:py-40 px-6 md:px-12 border-b border-[#EAE6DF]">
      <div className="max-w-3xl mx-auto text-center">
        {/* Subtle Category Badge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <span className="font-sans text-[11px] uppercase tracking-[0.3em] text-[#0C2686] font-medium">
            {lang === 'bg' ? content.tagline : content.title}
          </span>
          <div className="w-10 h-0.5 bg-[#0C2686]/30 mx-auto mt-3" />
        </motion.div>

        {/* Quote Lines */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.2 }}
          className="space-y-3 font-heading text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] font-light leading-snug"
        >
          {lang === 'bg' ? (
            <>
              <p>Всяко село пази история.</p>
              <p>Всяка традиция носи памет.</p>
              <p>Всеки човек оставя следа.</p>
            </>
          ) : (
            content.quoteLines.map((line, idx) => <p key={idx}>{line}</p>)
          )}
        </motion.div>

        {/* Welcome Text */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.4 }}
          className="mt-10 font-sans text-base md:text-lg text-[#1A1A1A]/70 font-light leading-relaxed max-w-xl mx-auto italic"
        >
          {lang === 'bg'
            ? 'Добре дошли на поредното вдъхновяващо пътешествие из неподправената красота на Северозападна България.'
            : content.welcome}
        </motion.p>

        {/* Signature */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-8"
        >
          <span className="font-script text-3xl md:text-4xl text-[#1A1A1A]/90 block tracking-wide">
            {content.signature}
          </span>
          <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-[#1A1A1A]/40 mt-1 block">
            {lang === 'bg' ? 'Главен редактор, PRIZNI' : 'Editor-in-Chief, PRIZNI'}
          </span>
        </motion.div>
      </div>
    </section>
  )
}
