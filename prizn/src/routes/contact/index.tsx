import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { JournalShell } from '@/components/concept-3/JournalShell'
import {
  ContributeHero,
  FieldLabel,
  SectionShell,
  TextArea,
  TextInput,
} from '@/components/concept-3/contribute/shared'
import { PageMeta } from '@/components/PageMeta'
import { ApiError } from '@/lib/api'
import { createPublicContact } from '@/lib/contact-api'

export default function ContactPage() {
  const { t } = useTranslation()
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const data = new FormData(e.currentTarget)
    try {
      const result = await createPublicContact({
        name: String(data.get('name') ?? '').trim(),
        email: String(data.get('email') ?? '').trim(),
        subject: String(data.get('subject') ?? '').trim(),
        message: String(data.get('message') ?? '').trim(),
        honeypot: String(data.get('prizn_extra') ?? '').trim() || undefined,
      })
      // Honeypot bots get `{ ok: true }` with no id — don't treat as a real send.
      if (!('id' in result) || !result.id) {
        setError(t('contact.error'))
        return
      }
      setSubmitted(true)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t('contact.error'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <JournalShell>
      {({ lang }) => (
        <main>
          <PageMeta
            lang={lang}
            title={t('contact.title')}
            description={t('contact.subtitle')}
            path="/contact"
          />
          <ContributeHero
            lang={lang}
            eyebrow={lang === 'bg' ? 'Връзка' : 'Contact'}
            eyebrowBg="Връзка"
            title={
              lang === 'bg' ? 'Пишете ни' : 'Get in touch'
            }
            titleBg="Пишете ни"
            subtitle={
              lang === 'bg'
                ? 'Въпроси, идеи за истории или делови запитвания — ще ги прегледаме и ще отговорим.'
                : 'Questions, story tips, or business notes — we read every message and reply.'
            }
            subtitleBg="Въпроси, идеи за истории или делови запитвания — ще ги прегледаме и ще отговорим."
            cta={lang === 'bg' ? 'Към формата' : 'Write a message'}
            ctaBg="Към формата"
            ctaHref="#contact-form"
            image="/heroimg.jpg"
          />

          <SectionShell id="contact-form" className="bg-white">
            {submitted ? (
              <div className="mx-auto max-w-xl border border-[#EAE6DF] bg-[#FDFBF7] px-6 py-12 text-center">
                <p className="font-heading text-3xl text-[#0C2686]">
                  {t('contact.thanks')}
                </p>
                <p className="mt-3 font-sans text-sm text-[#1A1A1A]/65">
                  {t('contact.thanksBody')}
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="relative mx-auto max-w-xl space-y-5"
              >
                <p className="font-heading text-3xl text-[#1A1A1A]">
                  {t('contact.formTitle')}
                </p>

                <div>
                  <FieldLabel htmlFor="name">{t('contact.name')}</FieldLabel>
                  <TextInput id="name" name="name" required autoComplete="name" />
                </div>
                <div>
                  <FieldLabel htmlFor="email">{t('contact.email')}</FieldLabel>
                  <TextInput
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="subject">
                    {t('contact.subject')}
                  </FieldLabel>
                  <TextInput id="subject" name="subject" required />
                </div>
                <div>
                  <FieldLabel htmlFor="message">
                    {t('contact.message')}
                  </FieldLabel>
                  <TextArea id="message" name="message" rows={6} required />
                </div>

                {/* Honeypot — obscure name so browsers don't autofill */}
                <div
                  className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"
                  aria-hidden
                >
                  <label htmlFor="prizn_extra">Leave blank</label>
                  <input
                    id="prizn_extra"
                    name="prizn_extra"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    defaultValue=""
                  />
                </div>

                {error && (
                  <p className="font-sans text-sm text-rose-700">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full cursor-pointer rounded-full bg-[#0C2686] px-5 py-3 font-sans text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[#0a1f6b] disabled:opacity-60"
                >
                  {submitting ? t('contact.sending') : t('contact.submit')}
                </button>
              </form>
            )}
          </SectionShell>
        </main>
      )}
    </JournalShell>
  )
}
