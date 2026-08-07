import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Alert, type AlertVariant } from '@/components/ui/Alert'
import { journalContent } from '@/data/concept-3/content'
import { ApiError } from '@/lib/api'
import { subscribeNewsletter } from '@/lib/newsletter-api'

interface NewsletterSectionProps {
  lang: 'bg' | 'en'
}

export function NewsletterSection({ lang }: NewsletterSectionProps) {
  const newsletter = journalContent.newsletter
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const [alertVariant, setAlertVariant] = useState<AlertVariant>('success')
  const [alertTitle, setAlertTitle] = useState('')
  const [alertMessage, setAlertMessage] = useState('')

  const showAlert = (
    variant: AlertVariant,
    title: string,
    message: string,
  ) => {
    setAlertVariant(variant)
    setAlertTitle(title)
    setAlertMessage(message)
    setAlertOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = email.trim()
    if (!value || submitting) return

    setSubmitting(true)
    try {
      await subscribeNewsletter(value, 'website')
      setEmail('')
      showAlert(
        'success',
        lang === 'bg' ? 'Успешно абониране' : 'Subscribed',
        lang === 'bg'
          ? 'Благодарим ви! Всяка неделя сутрин ще получавате нов разказ.'
          : 'Thank you. You will receive one calm story every Sunday morning.',
      )
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        showAlert(
          'info',
          lang === 'bg' ? 'Вече сте абонирани' : 'Already subscribed',
          lang === 'bg'
            ? 'Този имейл вече е в нашия списък.'
            : 'This email is already on our list.',
        )
      } else {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : lang === 'bg'
                ? 'Нещо се обърка. Опитайте отново.'
                : 'Something went wrong. Please try again.'
        showAlert(
          'error',
          lang === 'bg' ? 'Грешка' : 'Error',
          message,
        )
      }
    } finally {
      setSubmitting(false)
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

          <form onSubmit={handleSubmit} className="relative max-w-md mx-auto">
            <div className="relative border-b-2 border-[#1A1A1A] pb-2 flex items-center gap-2">
              <input
                type="email"
                name="email"
                required
                value={email}
                disabled={submitting}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={newsletter.emailPlaceholder}
                className="w-full bg-transparent font-sans text-sm md:text-base text-[#1A1A1A] placeholder:text-[#1A1A1A]/30 outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={submitting}
                className="shrink-0 flex items-center gap-2 font-sans text-xs uppercase tracking-[0.25em] font-medium text-[#0C2686] hover:text-[#1A1A1A] transition-colors py-2 px-3 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>
                  {submitting
                    ? lang === 'bg'
                      ? 'Изпращане…'
                      : 'Sending…'
                    : lang === 'bg'
                      ? newsletter.buttonTextBg
                      : newsletter.buttonText}
                </span>
                <ArrowRight className="size-3.5 stroke-[1.5]" />
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      <Alert
        open={alertOpen}
        variant={alertVariant}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertOpen(false)}
      />
    </section>
  )
}
