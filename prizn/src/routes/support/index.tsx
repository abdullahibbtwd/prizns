import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ChevronDown,
  Handshake,
  Heart,
  PenLine,
  Share2,
} from 'lucide-react'
import { JournalShell } from '@/components/concept-3/JournalShell'
import {
  ContributeHero,
  FieldLabel,
  SectionIntro,
  SectionShell,
  TextInput,
} from '@/components/concept-3/contribute/shared'
import { ApiError } from '@/lib/api'
import { createDonationCheckout } from '@/lib/donations-api'
import { cn } from '@/lib/utils'

const stats = [
  { value: '120+', label: 'Stories Published', labelBg: 'Публикувани истории' },
  { value: '48', label: 'Villages Covered', labelBg: 'Обхванати села' },
  { value: '35', label: 'Contributors', labelBg: 'Сътрудници' },
]

const tiers = [
  {
    amount: '10',
    title: 'Buy us a coffee',
    titleBg: 'Кафе за екипа',
    text: 'Keeps a field notebook day warm.',
    textBg: 'Затопля един ден с теренна тетрадка.',
  },
  {
    amount: '25',
    title: 'Support one interview',
    titleBg: 'Подкрепете едно интервю',
    text: 'Travel, tea, and careful listening.',
    textBg: 'Пътуване, чай и внимателно слушане.',
    featured: true,
  },
  {
    amount: '50',
    title: 'Help preserve a local tradition',
    titleBg: 'Помогнете да се съхрани традиция',
    text: 'Funds photos, transcription, and editing.',
    textBg: 'Финансира снимки, транскрипция и редакция.',
  },
]

const otherWays = [
  {
    to: '/write-for-us',
    icon: PenLine,
    title: 'Become a Contributor',
    titleBg: 'Станете сътрудник',
    text: 'Share a story from your village or craft.',
    textBg: 'Споделете история от вашето село или занаят.',
  },
  {
    to: '/#shop',
    icon: Share2,
    title: 'Share Our Stories',
    titleBg: 'Споделете нашите истории',
    text: 'Pass a piece to someone who still remembers.',
    textBg: 'Препратете разказ на някой, който още помни.',
  },
  {
    to: '/partnerships',
    icon: Handshake,
    title: 'Partner With Us',
    titleBg: 'Станете партньор',
    text: 'Collaborate as an institution or brand.',
    textBg: 'Сътрудничете като институция или марка.',
  },
]

const faqs = [
  {
    q: 'Is my donation secure?',
    qBg: 'Сигурно ли е дарението ми?',
    a: 'Yes. Payments are processed through trusted providers. PRIZNI never stores full card details on our servers.',
    aBg: 'Да. Плащанията минават през доверени доставчици. PRIZNI не съхранява пълни данни за карти на нашите сървъри.',
  },
  {
    q: 'Is it tax deductible?',
    qBg: 'Данъчно признато ли е?',
    a: 'Depending on your status and local rules, donations may qualify. We’ll provide a receipt for your records.',
    aBg: 'В зависимост от статута ви и местните правила дарението може да бъде признато. Предоставяме разписка за вашите документи.',
  },
  {
    q: 'Where does my money go?',
    qBg: 'Къде отиват парите?',
    a: 'Straight into reporting: travel to villages, photography, audio archive work, editing, and publishing independent stories.',
    aBg: 'Директно в репортажа: пътувания до села, фотография, аудио архив, редакция и публикуване на независими истории.',
  },
]

export default function SupportUsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [amount, setAmount] = useState('25')
  const [custom, setCustom] = useState('')
  const [email, setEmail] = useState('')
  const [donated, setDonated] = useState(
    () => searchParams.get('donation') === 'success',
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const selectedAmount = amount === 'custom' ? custom : amount

  useEffect(() => {
    if (searchParams.get('donation') === 'success') {
      setDonated(true)
    }
  }, [searchParams])

  const handleDonate = async () => {
    setError('')
    const amountBgn = Number(selectedAmount)
    if (!Number.isFinite(amountBgn) || amountBgn < 1) {
      setError('Please choose a valid amount (at least 1 BGN).')
      return
    }
    setSubmitting(true)
    try {
      const result = await createDonationCheckout({
        amountBgn,
        email: email.trim() || undefined,
      })
      window.location.href = result.url
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unable to start checkout.',
      )
      setSubmitting(false)
    }
  }

  return (
    <JournalShell>
      {({ lang }) => (
        <main>
          <ContributeHero
            lang={lang}
            eyebrow="Support Us"
            eyebrowBg="Подкрепете ни"
            title="Help Preserve the Stories of Northwestern Bulgaria"
            titleBg="Помогнете да се съхранят историите на Северозападна България"
            subtitle="Every donation helps us document people, places, and traditions before they're forgotten."
            subtitleBg="Всяко дарение ни помага да документираме хора, места и традиции, преди да бъдат забравени."
            cta="Donate Now"
            ctaBg="Дарете сега"
            ctaHref="#donate"
            image="/happy.jpg"
          />

          <SectionShell>
            <SectionIntro
              lang={lang}
              eyebrow="Why support"
              eyebrowBg="Защо да подкрепите"
              title="Your Support in Numbers"
              titleBg="Вашата подкрепа в цифри"
              center
            />
            <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.08 }}
                  className="text-center"
                >
                  <p className="font-heading text-5xl font-light text-[#0C2686] md:text-6xl">
                    {stat.value}
                  </p>
                  <p className="mt-3 font-sans text-xs uppercase tracking-[0.22em] text-[#1A1A1A]/50">
                    {lang === 'bg' ? stat.labelBg : stat.label}
                  </p>
                </motion.div>
              ))}
            </div>
          </SectionShell>

          <SectionShell id="donate" className="bg-white">
            <SectionIntro
              lang={lang}
              eyebrow="Give"
              eyebrowBg="Дарете"
              title="Choose an Amount"
              titleBg="Изберете сума"
              text="Pick a gift that fits — every amount funds real field work."
              textBg="Изберете подарък, който ви пасва — всяка сума финансира истинска теренна работа."
              center
            />

            {donated ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-auto max-w-xl border border-[#0C2686]/20 bg-[#0C2686]/5 px-8 py-10 text-center"
              >
                <Heart className="mx-auto size-6 fill-[#0C2686] text-[#0C2686]" />
                <h3 className="mt-4 font-heading text-3xl text-[#1A1A1A]">
                  {lang === 'bg' ? 'Благодарим ви от сърце.' : 'Thank you from the heart.'}
                </h3>
                <p className="mt-3 font-sans text-sm font-light text-[#1A1A1A]/65">
                  {lang === 'bg'
                    ? 'Вашето дарение помага да документираме хора, места и традиции.'
                    : 'Your donation helps us document people, places, and traditions.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setDonated(false)
                    setSearchParams({})
                  }}
                  className="mt-6 font-sans text-xs uppercase tracking-[0.2em] text-[#0C2686] underline-offset-4 hover:underline"
                >
                  {lang === 'bg' ? 'Дарете отново' : 'Donate again'}
                </button>
              </motion.div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
                  {tiers.map((tier) => (
                    <button
                      key={tier.amount}
                      type="button"
                      onClick={() => {
                        setAmount(tier.amount)
                        setCustom('')
                      }}
                      className={cn(
                        'cursor-pointer border px-6 py-8 text-left transition-all',
                        amount === tier.amount
                          ? 'border-[#0C2686] bg-[#0C2686]/5'
                          : 'border-[#EAE6DF] bg-[#FDFBF7] hover:border-[#0C2686]/40',
                      )}
                    >
                      <p className="font-heading text-4xl font-light text-[#0C2686]">
                        {tier.amount}{' '}
                        <span className="text-xl">BGN</span>
                      </p>
                      <h3 className="mt-4 font-heading text-2xl text-[#1A1A1A]">
                        {lang === 'bg' ? tier.titleBg : tier.title}
                      </h3>
                      <p className="mt-2 font-sans text-sm font-light text-[#1A1A1A]/60">
                        {lang === 'bg' ? tier.textBg : tier.text}
                      </p>
                    </button>
                  ))}
                </div>

                <div className="mx-auto mt-8 max-w-md space-y-4">
                  <button
                    type="button"
                    onClick={() => setAmount('custom')}
                    className={cn(
                      'w-full cursor-pointer border px-6 py-5 text-left transition-all',
                      amount === 'custom'
                        ? 'border-[#0C2686] bg-[#0C2686]/5'
                        : 'border-[#EAE6DF] bg-[#FDFBF7] hover:border-[#0C2686]/40',
                    )}
                  >
                    <p className="font-sans text-[11px] uppercase tracking-[0.2em] text-[#0C2686]">
                      {lang === 'bg' ? 'Друга сума' : 'Custom Amount'}
                    </p>
                    {amount === 'custom' && (
                      <div className="mt-3">
                        <FieldLabel>{lang === 'bg' ? 'Сума в BGN' : 'Amount in BGN'}</FieldLabel>
                        <TextInput
                          type="number"
                          min="1"
                          value={custom}
                          onChange={(e) => setCustom(e.target.value)}
                          placeholder="e.g. 100"
                          autoFocus
                        />
                      </div>
                    )}
                  </button>

                  <div>
                    <FieldLabel>
                      {lang === 'bg' ? 'Имейл (по избор)' : 'Email (optional)'}
                    </FieldLabel>
                    <TextInput
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={lang === 'bg' ? 'за разписка' : 'for your receipt'}
                    />
                  </div>
                </div>

                <div className="mt-10 text-center">
                  <button
                    type="button"
                    disabled={
                      submitting ||
                      !selectedAmount ||
                      Number(selectedAmount) <= 0
                    }
                    onClick={() => void handleDonate()}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#0C2686] px-8 py-3.5 font-sans text-xs font-medium uppercase tracking-[0.22em] text-white transition-colors hover:bg-[#1A1A1A] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Heart className="size-3.5 fill-current" />
                    {submitting
                      ? lang === 'bg'
                        ? 'Пренасочване…'
                        : 'Redirecting…'
                      : lang === 'bg'
                        ? `Дарете ${selectedAmount || '—'} BGN`
                        : `Donate ${selectedAmount || '—'} BGN`}
                  </button>
                  {error ? (
                    <p className="mt-4 font-sans text-sm text-rose-700">{error}</p>
                  ) : null}
                </div>
              </>
            )}
          </SectionShell>

          <SectionShell>
            <SectionIntro
              lang={lang}
              eyebrow="Beyond money"
              eyebrowBg="Отвъд парите"
              title="Other Ways to Help"
              titleBg="Други начини да помогнете"
              center
            />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {otherWays.map((item, index) => {
                const Icon = item.icon
                return (
                  <motion.div
                    key={item.to}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.55, delay: index * 0.06 }}
                  >
                    <Link
                      to={item.to}
                      className="group flex h-full flex-col border border-[#EAE6DF] bg-white px-6 py-8 transition-colors hover:border-[#0C2686]/35"
                    >
                      <Icon className="size-5 text-[#0C2686]" strokeWidth={1.5} />
                      <h3 className="mt-4 font-heading text-2xl text-[#1A1A1A] transition-colors group-hover:text-[#0C2686]">
                        {lang === 'bg' ? item.titleBg : item.title}
                      </h3>
                      <p className="mt-3 font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/60">
                        {lang === 'bg' ? item.textBg : item.text}
                      </p>
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </SectionShell>

          <SectionShell className="bg-white">
            <SectionIntro
              lang={lang}
              eyebrow="Questions"
              eyebrowBg="Въпроси"
              title="FAQ"
              titleBg="Често задавани въпроси"
              center
            />
            <div className="mx-auto max-w-3xl divide-y divide-[#EAE6DF] border-y border-[#EAE6DF]">
              {faqs.map((faq, index) => {
                const open = openFaq === index
                return (
                  <div key={faq.q}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : index)}
                      className="flex w-full cursor-pointer items-center justify-between gap-4 py-5 text-left"
                    >
                      <span className="font-heading text-xl text-[#1A1A1A] md:text-2xl">
                        {lang === 'bg' ? faq.qBg : faq.q}
                      </span>
                      <ChevronDown
                        className={cn(
                          'size-5 shrink-0 text-[#0C2686] transition-transform',
                          open && 'rotate-180',
                        )}
                      />
                    </button>
                    {open && (
                      <p className="pb-5 font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/65">
                        {lang === 'bg' ? faq.aBg : faq.a}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </SectionShell>
        </main>
      )}
    </JournalShell>
  )
}
