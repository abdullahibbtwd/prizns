import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Building2,
  Check,
  Church,
  Grape,
  Handshake,
  Hotel,
  Landmark,
  School,
  Sparkles,
  Theater,
  Trees,
  Users,
} from 'lucide-react'
import { JournalShell } from '@/components/concept-3/JournalShell'
import {
  ContributeHero,
  FieldLabel,
  ProcessSteps,
  SectionIntro,
  SectionShell,
  JournalSelect,
  TextArea,
  TextInput,
} from '@/components/concept-3/contribute/shared'
import { ApiError } from '@/lib/api'
import { createPublicPartnership } from '@/lib/partnerships-api'

const whoCan = [
  { icon: Landmark, en: 'Museums', bg: 'Музеи' },
  { icon: Hotel, en: 'Tourism', bg: 'Туризъм' },
  { icon: Grape, en: 'Wineries', bg: 'Винарни' },
  { icon: Building2, en: 'Companies', bg: 'Компании' },
  { icon: Theater, en: 'Cultural Organizations', bg: 'Културни организации' },
  { icon: Church, en: 'Municipalities', bg: 'Общини' },
]

const partnershipTypes = [
  {
    icon: Sparkles,
    en: 'Sponsored Stories',
    bg: 'Спонсорирани истории',
    textEn: 'Commission reporting that aligns with your mission.',
    textBg: 'Поръчайте репортажи, които отговарят на вашата мисия.',
  },
  {
    icon: Handshake,
    en: 'Media Partnerships',
    bg: 'Медийни партньорства',
    textEn: 'Co-publish features and shared editorial series.',
    textBg: 'Съвместно публикуване на материали и серии.',
  },
  {
    icon: Theater,
    en: 'Events',
    bg: 'Събития',
    textEn: 'Activate festivals, talks, and community gatherings.',
    textBg: 'Активирайте фестивали, разговори и общински срещи.',
  },
  {
    icon: Users,
    en: 'Campaigns',
    bg: 'Кампании',
    textEn: 'Join long-form causes for craft, paths, and language.',
    textBg: 'Присъединете се към дълги каузи за занаят, пътеки и език.',
  },
  {
    icon: Trees,
    en: 'Tourism',
    bg: 'Туризъм',
    textEn: 'Guide visitors deeper with place-based storytelling.',
    textBg: 'Водите посетители по-дълбоко чрез истории за места.',
  },
  {
    icon: School,
    en: 'Education',
    bg: 'Образование',
    textEn: 'Workshops, school programs, and heritage learning.',
    textBg: 'Работилници, училищни програми и наследствено обучение.',
  },
]

const benefits = [
  { en: 'Audience Reach', bg: 'Достигане до аудитория' },
  { en: 'Regional Impact', bg: 'Регионално въздействие' },
  { en: 'Storytelling', bg: 'Разказване на истории' },
  { en: 'SEO Visibility', bg: 'SEO видимост' },
  { en: 'Social Media', bg: 'Социални мрежи' },
  { en: 'Community Trust', bg: 'Доверие на общността' },
]

const process = [
  { en: 'Send Inquiry', bg: 'Изпратете запитване' },
  { en: 'Discovery Meeting', bg: 'Опознаваща среща' },
  { en: 'Proposal', bg: 'Предложение' },
  { en: 'Campaign', bg: 'Кампания' },
  { en: 'Results', bg: 'Резултати' },
]

const typeOptions = [
  'Sponsored Stories',
  'Media Partnerships',
  'Events',
  'Campaigns',
  'Tourism',
  'Education',
  'Other',
]

export default function PartnershipsPage() {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const data = new FormData(e.currentTarget)
    try {
      await createPublicPartnership({
        organization: String(data.get('org') ?? '').trim(),
        contactName: String(data.get('contact') ?? '').trim(),
        email: String(data.get('email') ?? '').trim(),
        phone: String(data.get('phone') ?? '').trim() || undefined,
        website: String(data.get('website') ?? '').trim() || undefined,
        type: String(data.get('type') ?? '').trim(),
        budget: String(data.get('budget') ?? '').trim() || undefined,
        message: String(data.get('message') ?? '').trim(),
        honeypot: String(data.get('company_fax') ?? '').trim() || undefined,
      })
      setSubmitted(true)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to send inquiry.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <JournalShell>
      {({ lang }) => (
        <main>
          <ContributeHero
            lang={lang}
            eyebrow="Partnerships"
            eyebrowBg="Партньорства"
            title="Let's Tell the Stories of Northwestern Bulgaria Together"
            titleBg="Нека заедно разкажем историите на Северозападна България"
            subtitle="We collaborate with organizations that share our passion for culture, heritage, and local communities."
            subtitleBg="Работим с организации, които споделят нашата страст към културата, наследството и местните общности."
            cta="Send Partnership Inquiry"
            ctaBg="Изпратете запитване"
            ctaHref="#inquiry"
            image="/meseum.jpg"
          />

          <SectionShell>
            <SectionIntro
              lang={lang}
              eyebrow="Audience"
              eyebrowBg="Аудитория"
              title="Who Can Partner?"
              titleBg="Кой може да е партньор?"
              center
            />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
              {whoCan.map((item, index) => {
                const Icon = item.icon
                return (
                  <motion.div
                    key={item.en}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    className="flex flex-col items-start gap-3 border border-[#EAE6DF] bg-white px-5 py-6"
                  >
                    <Icon className="size-5 text-[#0C2686]" strokeWidth={1.5} />
                    <p className="font-heading text-xl text-[#1A1A1A] md:text-2xl">
                      {lang === 'bg' ? item.bg : item.en}
                    </p>
                  </motion.div>
                )
              })}
            </div>
          </SectionShell>

          <SectionShell className="bg-white">
            <SectionIntro
              lang={lang}
              eyebrow="Formats"
              eyebrowBg="Формати"
              title="Partnership Types"
              titleBg="Видове партньорства"
              center
            />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {partnershipTypes.map((item, index) => {
                const Icon = item.icon
                return (
                  <motion.div
                    key={item.en}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.55, delay: index * 0.05 }}
                    className="border-t border-[#0C2686]/20 pt-6"
                  >
                    <Icon className="size-5 text-[#0C2686]" strokeWidth={1.5} />
                    <h3 className="mt-4 font-heading text-2xl text-[#1A1A1A]">
                      {lang === 'bg' ? item.bg : item.en}
                    </h3>
                    <p className="mt-2 font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/60">
                      {lang === 'bg' ? item.textBg : item.textEn}
                    </p>
                  </motion.div>
                )
              })}
            </div>
          </SectionShell>

          <SectionShell>
            <SectionIntro
              lang={lang}
              eyebrow="Value"
              eyebrowBg="Стойност"
              title="What Partnership Delivers"
              titleBg="Какво носи партньорството"
              text="Metrics that matter when you care about place, not just impressions."
              textBg="Метрики, които имат значение, когато ви интересува мястото, не само впечатленията."
              center
            />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
              {benefits.map((item) => (
                <div
                  key={item.en}
                  className="border border-[#EAE6DF] bg-white px-5 py-8 text-center"
                >
                  <p className="font-heading text-2xl text-[#1A1A1A] md:text-3xl">
                    {lang === 'bg' ? item.bg : item.en}
                  </p>
                </div>
              ))}
            </div>
          </SectionShell>

          <SectionShell className="bg-white">
            <SectionIntro
              lang={lang}
              eyebrow="How we work"
              eyebrowBg="Как работим"
              title="Partnership Process"
              titleBg="Процес на партньорство"
              center
            />
            <ProcessSteps lang={lang} steps={process} />
          </SectionShell>

          <SectionShell id="inquiry">
            <SectionIntro
              lang={lang}
              eyebrow="Start here"
              eyebrowBg="Започнете тук"
              title="Partnership Inquiry"
              titleBg="Запитване за партньорство"
              text="Tell us about your organization. We’ll reply with next steps."
              textBg="Разкажете ни за вашата организация. Ще отговорим със следващите стъпки."
            />

            {submitted ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl border border-[#0C2686]/20 bg-[#0C2686]/5 px-8 py-10"
              >
                <Check className="size-6 text-[#0C2686]" />
                <h3 className="mt-4 font-heading text-3xl text-[#1A1A1A]">
                  {lang === 'bg' ? 'Запитването е изпратено.' : 'Inquiry sent.'}
                </h3>
                <p className="mt-3 font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/65">
                  {lang === 'bg'
                    ? 'Благодарим ви. Екипът ни ще се свърже скоро, за да уговорим опознаваща среща.'
                    : 'Thank you. Our team will be in touch soon to schedule a discovery meeting.'}
                </p>
              </motion.div>
            ) : (
              <form className="max-w-3xl space-y-8" onSubmit={handleSubmit}>
                {/* Honeypot — leave empty */}
                <input
                  type="text"
                  name="company_fax"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="absolute left-[-9999px] h-0 w-0 opacity-0"
                />
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  <div>
                    <FieldLabel>
                      {lang === 'bg' ? 'Име на организацията' : 'Organization Name'} *
                    </FieldLabel>
                    <TextInput required name="org" />
                  </div>
                  <div>
                    <FieldLabel>
                      {lang === 'bg' ? 'Лице за контакт' : 'Contact Person'} *
                    </FieldLabel>
                    <TextInput required name="contact" />
                  </div>
                  <div>
                    <FieldLabel>Email *</FieldLabel>
                    <TextInput required type="email" name="email" />
                  </div>
                  <div>
                    <FieldLabel>{lang === 'bg' ? 'Телефон' : 'Phone'} *</FieldLabel>
                    <TextInput required type="tel" name="phone" />
                  </div>
                </div>

                <div>
                  <FieldLabel>Website</FieldLabel>
                  <TextInput type="url" name="website" placeholder="https://" />
                </div>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  <div>
                    <FieldLabel>
                      {lang === 'bg' ? 'Тип партньорство' : 'Type of Partnership'} *
                    </FieldLabel>
                    <JournalSelect
                      required
                      name="type"
                      label={lang === 'bg' ? 'Тип партньорство' : 'Partnership type'}
                      placeholder={lang === 'bg' ? 'Изберете тип' : 'Select type'}
                      options={typeOptions.map((opt) => ({
                        value: opt,
                        label: opt,
                      }))}
                    />
                  </div>
                  <div>
                    <FieldLabel>
                      {lang === 'bg' ? 'Бюджет (по избор)' : 'Budget (optional)'}
                    </FieldLabel>
                    <TextInput name="budget" placeholder={lang === 'bg' ? 'напр. 5 000 BGN' : 'e.g. 5,000 BGN'} />
                  </div>
                </div>

                <div>
                  <FieldLabel>{lang === 'bg' ? 'Съобщение' : 'Message'} *</FieldLabel>
                  <TextArea
                    required
                    name="message"
                    rows={6}
                    placeholder={
                      lang === 'bg'
                        ? 'Какво искате да постигнем заедно?'
                        : 'What would you like us to achieve together?'
                    }
                  />
                </div>

                {error ? (
                  <p className="font-sans text-sm text-rose-700">{error}</p>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#0C2686] px-8 py-3.5 font-sans text-xs font-medium uppercase tracking-[0.22em] text-white transition-colors hover:bg-[#1A1A1A] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Handshake className="size-3.5" />
                  {submitting
                    ? lang === 'bg'
                      ? 'Изпращане…'
                      : 'Sending…'
                    : lang === 'bg'
                      ? 'Изпратете запитване'
                      : 'Send Inquiry'}
                </button>
              </form>
            )}
          </SectionShell>
        </main>
      )}
    </JournalShell>
  )
}
