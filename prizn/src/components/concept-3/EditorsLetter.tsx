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
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35 }}
          className="mb-8"
        >
          <span className="font-sans text-[11px] uppercase tracking-[0.3em] text-[#0C2686] font-medium">
            {lang === 'bg' ? content.tagline : content.title}
          </span>
          <div className="w-10 h-0.5 bg-[#0C2686]/30 mx-auto mt-3" />
        </motion.div>

        {/* Letter Body */}
        <motion.p
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="font-heading text-xl sm:text-2xl md:text-3xl text-[#1A1A1A] font-light leading-relaxed"
        >
          {lang === 'bg' ? content.bodyBg : content.body}
        </motion.p>

        {/* Signature */}
        <motion.div
          initial={false}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="mt-8"
        >
          <span className="font-script text-3xl md:text-4xl text-[#1A1A1A]/90 block tracking-wide">
            {lang === 'bg' ? content.signatureBg : content.signature}
          </span>
          <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-[#1A1A1A]/40 mt-1 block">
            {lang === 'bg' ? content.roleBg : content.role}
          </span>
        </motion.div>
      </div>
    </section>
  )
}
