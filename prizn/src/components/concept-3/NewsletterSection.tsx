import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ArrowRight } from 'lucide-react'
import { journalContent } from '@/data/concept-3/content'

interface NewsletterSectionProps {
  lang: 'bg' | 'en'
}

export function NewsletterSection({ lang }: NewsletterSectionProps) {
  const newsletter = journalContent.newsletter
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) {
      setSubmitted(true)
    }
  }

  return (
    <section className="bg-[#FDFBF7] py-28 md:py-40 px-6 md:px-12 border-b border-[#EAE6DF]">
      <div className="max-w-xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <span className="text-xs uppercase tracking-[0.3em] font-sans text-[#0C2686] font-medium block mb-4">
            {lang === 'bg' ? 'Седмичен Журнал' : 'Weekly Dispatch'}
          </span>

          <h2 className="font-heading text-4xl md:text-5xl text-[#1A1A1A] font-light leading-tight mb-4">
            {lang === 'bg' ? newsletter.titleBg : newsletter.title}
          </h2>

          <p className="font-sans text-xs md:text-sm text-[#1A1A1A]/60 font-light leading-relaxed mb-10">
            {newsletter.subtitle}
          </p>

          {submitted ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-6 rounded-2xl bg-[#0C2686]/5 border border-[#0C2686]/20 text-[#0C2686] font-sans text-sm flex items-center justify-center gap-3"
            >
              <div className="size-8 rounded-full bg-[#0C2686] text-white flex items-center justify-center">
                <Check className="size-4 stroke-[2]" />
              </div>
              <p>
                {lang === 'bg'
                  ? 'Благодарим ви! Всяка неделя сутрин ще получавате нов разказ.'
                  : 'Thank you. You will receive one calm story every Sunday morning.'}
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="relative max-w-md mx-auto">
              <div className="relative border-b-2 border-[#1A1A1A] pb-2 flex items-center gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={newsletter.emailPlaceholder}
                  className="w-full bg-transparent font-sans text-sm md:text-base text-[#1A1A1A] placeholder:text-[#1A1A1A]/30 outline-none"
                />
                <button
                  type="submit"
                  className="shrink-0 flex items-center gap-2 font-sans text-xs uppercase tracking-[0.25em] font-medium text-[#0C2686] hover:text-[#1A1A1A] transition-colors py-2 px-3"
                >
                  <span>{lang === 'bg' ? newsletter.buttonTextBg : newsletter.buttonText}</span>
                  <ArrowRight className="size-3.5 stroke-[1.5]" />
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  )
}
