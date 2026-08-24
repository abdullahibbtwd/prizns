import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Alert, type AlertVariant } from '@/components/ui/Alert'
import { journalContent } from '@/data/concept-3/content'
import { ApiError } from '@/lib/api'
import { subscribeNewsletter } from '@/lib/newsletter-api'

interface NewsletterSectionProps {
  lang: 'bg' | 'en'
  variant?: 'page' | 'panel'
}

export function NewsletterSection({
  lang,
  variant = 'page',
}: NewsletterSectionProps) {
  const newsletter = journalContent.newsletter
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const [alertVariant, setAlertVariant] = useState<AlertVariant>('success')
  const [alertTitle, setAlertTitle] = useState('')
  const [alertMessage, setAlertMessage] = useState('')
  const panel = variant === 'panel'

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

  const Root = panel ? 'div' : 'section'

  return (
    <Root
      className={
        panel
          ? 'flex h-full flex-col justify-end text-left'
          : 'border-b border-[#EAE6DF] bg-[#FDFBF7] px-6 py-28 md:px-12 md:py-40'
      }
    >
      <div className={panel ? 'w-full' : 'mx-auto max-w-xl text-center'}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <span
            className={
              panel
                ? 'mb-3 block font-sans text-[10px] font-medium uppercase tracking-[0.28em] text-white/65 sm:text-[11px]'
                : 'mb-4 block font-sans text-xs font-medium uppercase tracking-[0.3em] text-[#0C2686]'
            }
          >
            {lang === 'bg' ? 'Седмичен Журнал' : 'Weekly Dispatch'}
          </span>

          {panel ? (
            <h3 className="font-heading text-2xl font-light leading-tight tracking-tight sm:text-3xl lg:text-4xl">
              {lang === 'bg' ? newsletter.titleBg : newsletter.title}
            </h3>
          ) : (
            <h2 className="mb-4 font-heading text-4xl font-light leading-tight text-[#1A1A1A] md:text-5xl">
              {lang === 'bg' ? newsletter.titleBg : newsletter.title}
            </h2>
          )}

          <p
            className={
              panel
                ? 'mt-3 hidden font-sans text-sm font-light leading-relaxed text-white/70 lg:block'
                : 'mb-10 font-sans text-xs font-light leading-relaxed text-[#1A1A1A]/60 md:text-sm'
            }
          >
            {newsletter.subtitle}
          </p>

          <form
            onSubmit={handleSubmit}
            className={panel ? 'relative mt-5 max-w-md' : 'relative mx-auto max-w-md'}
          >
            <div
              className={
                panel
                  ? 'flex items-center gap-2 border-b border-white/40 pb-2'
                  : 'relative flex items-center gap-2 border-b-2 border-[#1A1A1A] pb-2'
              }
            >
              <input
                type="email"
                name="email"
                required
                value={email}
                disabled={submitting}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={newsletter.emailPlaceholder}
                className={
                  panel
                    ? 'w-full bg-transparent font-sans text-sm text-white outline-none placeholder:text-white/40 disabled:opacity-60'
                    : 'w-full bg-transparent font-sans text-sm text-[#1A1A1A] outline-none placeholder:text-[#1A1A1A]/30 disabled:opacity-60 md:text-base'
                }
              />
              <button
                type="submit"
                disabled={submitting}
                className={
                  panel
                    ? 'flex shrink-0 cursor-pointer items-center gap-2 px-2 py-2 font-sans text-[10px] font-medium uppercase tracking-[0.22em] text-white transition-colors hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-60 sm:text-xs'
                    : 'flex shrink-0 items-center gap-2 px-3 py-2 font-sans text-xs font-medium uppercase tracking-[0.25em] text-[#0C2686] transition-colors hover:text-[#1A1A1A] disabled:cursor-not-allowed disabled:opacity-60'
                }
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
    </Root>
  )
}
