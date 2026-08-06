import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BookOpen,
  CalendarDays,
  Camera,
  Check,
  Globe2,
  Heart,
  Landmark,
  MapPin,
  PenLine,
  Upload,
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

const whyCards = [
  {
    icon: BookOpen,
    title: 'Share Local Stories',
    titleBg: 'Споделете местни истории',
    text: 'Help preserve the history and culture of your region.',
    textBg: 'Помогнете да се съхрани историята и културата на вашия край.',
  },
  {
    icon: Globe2,
    title: 'Reach Thousands',
    titleBg: 'Достигнете до хиляди',
    text: 'Your story will be read by people across Bulgaria and the diaspora.',
    textBg: 'Историята ви ще бъде четена в България и от диаспората.',
  },
  {
    icon: Heart,
    title: 'Make an Impact',
    titleBg: 'Създайте влияние',
    text: 'Help future generations discover stories that might otherwise be forgotten.',
    textBg: 'Помогнете на следващите поколения да открият истории, които иначе биха били забравени.',
  },
]

const categories = [
  { icon: Users, en: 'Human Stories', bg: 'Човешки истории' },
  { icon: MapPin, en: 'Places', bg: 'Места' },
  { icon: Landmark, en: 'Traditions', bg: 'Традиции' },
  { icon: CalendarDays, en: 'Events', bg: 'Събития' },
  { icon: BookOpen, en: 'Culture', bg: 'Култура' },
  { icon: Camera, en: 'Photography', bg: 'Фотография' },
]

const guidelines = [
  {
    en: 'Original content',
    bg: 'Оригинално съдържание',
    detailEn: 'Submit work you created or have clear rights to share.',
    detailBg: 'Изпращайте работи, които сте създали или имате право да споделяте.',
  },
  {
    en: 'High-quality photos',
    bg: 'Качествени снимки',
    detailEn: 'Clear images help editors shape and publish your piece.',
    detailBg: 'Ясните кадри помагат на редакцията да оформи и публикува текста.',
  },
  {
    en: 'Respect privacy',
    bg: 'Уважавайте поверителността',
    detailEn: 'Ask before naming people or sharing intimate details.',
    detailBg: 'Питайте преди да споменавате хора или интимни подробности.',
  },
  {
    en: 'Cite sources if needed',
    bg: 'Цитирайте източници при нужда',
    detailEn: 'Credit archives, interviews, and borrowed materials.',
    detailBg: 'Посочвайте архиви, интервюта и заети материали.',
  },
]

const workflow = [
  { en: 'Submit', bg: 'Изпращане' },
  { en: 'Editorial Review', bg: 'Редакторски преглед' },
  { en: 'Possible Feedback', bg: 'Евентуална обратна връзка' },
  { en: 'Approved', bg: 'Одобрение' },
  { en: 'Published', bg: 'Публикация' },
]

export default function WriteForUsPage() {
  const [submitted, setSubmitted] = useState(false)

  return (
    <JournalShell>
      {({ lang }) => (
        <main>
          <ContributeHero
            lang={lang}
            eyebrow="Write for Us"
            eyebrowBg="Пишете за нас"
            title="Tell the Untold Stories of Northwestern Bulgaria"
            titleBg="Разкажете неразказаните истории на Северозападна България"
            subtitle="We believe every village, family, and tradition has a story worth preserving. Join our community of storytellers."
            subtitleBg="Вярваме, че всяко село, семейство и традиция пазят история, която си струва да се съхрани. Присъединете се към нашата общност от разказвачи."
            cta="Become a Contributor"
            ctaBg="Станете сътрудник"
            ctaHref="#submit"
            image="/local-jounal.jpg"
          />

          <SectionShell>
            <SectionIntro
              lang={lang}
              eyebrow="Why contribute"
              eyebrowBg="Защо да пишете"
              title="Why Write for Prizni?"
              titleBg="Защо да пишете за „Призни“?"
              text="Your voice helps keep Northwestern Bulgaria visible — on the page, and in memory."
              textBg="Вашият глас държи Северозапада видим — на страницата и в паметта."
              center
            />
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {whyCards.map((card, index) => {
                const Icon = card.icon
                return (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.08 }}
                    className="border-t border-[#0C2686]/20 pt-6"
                  >
                    <Icon className="size-5 text-[#0C2686]" strokeWidth={1.5} />
                    <h3 className="mt-4 font-heading text-2xl font-normal text-[#1A1A1A]">
                      {lang === 'bg' ? card.titleBg : card.title}
                    </h3>
                    <p className="mt-3 font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/60">
                      {lang === 'bg' ? card.textBg : card.text}
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
              title="What Can You Submit?"
              titleBg="Какво можете да изпратите?"
              center
            />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
              {categories.map((item, index) => {
                const Icon = item.icon
                return (
                  <motion.div
                    key={item.en}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    className="flex flex-col items-start gap-3 border border-[#EAE6DF] bg-[#FDFBF7] px-5 py-6 md:px-6"
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

          <SectionShell>
            <SectionIntro
              lang={lang}
              eyebrow="Standards"
              eyebrowBg="Стандарти"
              title="Submission Guidelines"
              titleBg="Насоки за изпращане"
              center
            />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {guidelines.map((item) => (
                <div
                  key={item.en}
                  className="flex gap-4 border border-[#EAE6DF] bg-white px-5 py-6 md:px-6"
                >
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#0C2686]/10 text-[#0C2686]">
                    <Check className="size-3.5" strokeWidth={2} />
                  </span>
                  <div>
                    <h3 className="font-heading text-xl text-[#1A1A1A]">
                      {lang === 'bg' ? item.bg : item.en}
                    </h3>
                    <p className="mt-2 font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/60">
                      {lang === 'bg' ? item.detailBg : item.detailEn}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </SectionShell>

          <SectionShell id="submit" className="bg-white">
            <SectionIntro
              lang={lang}
              eyebrow="Your story"
              eyebrowBg="Вашата история"
              title="Submission Form"
              titleBg="Формуляр за изпращане"
              text="Tell us what you’ve witnessed. Our editors review every submission carefully."
              textBg="Разкажете ни какво сте видели. Редакторите преглеждат внимателно всяко предложение."
            />

            {submitted ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl border border-[#0C2686]/20 bg-[#0C2686]/5 px-8 py-10"
              >
                <Check className="size-6 text-[#0C2686]" />
                <h3 className="mt-4 font-heading text-3xl text-[#1A1A1A]">
                  {lang === 'bg' ? 'Благодарим ви.' : 'Thank you.'}
                </h3>
                <p className="mt-3 font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/65">
                  {lang === 'bg'
                    ? 'Получихме вашата история. Ще получите имейл актуализации през редакционния преглед.'
                    : 'We’ve received your story. You’ll get email updates through editorial review.'}
                </p>
              </motion.div>
            ) : (
              <form
                className="max-w-3xl space-y-8"
                onSubmit={(e) => {
                  e.preventDefault()
                  setSubmitted(true)
                }}
              >
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  <div>
                    <FieldLabel>{lang === 'bg' ? 'Име' : 'Name'} *</FieldLabel>
                    <TextInput required name="name" placeholder={lang === 'bg' ? 'Вашето име' : 'Your name'} />
                  </div>
                  <div>
                    <FieldLabel>Email *</FieldLabel>
                    <TextInput required type="email" name="email" placeholder="you@email.com" />
                  </div>
                  <div>
                    <FieldLabel>{lang === 'bg' ? 'Телефон (по избор)' : 'Phone (optional)'}</FieldLabel>
                    <TextInput type="tel" name="phone" placeholder="+359…" />
                  </div>
                  <div>
                    <FieldLabel>{lang === 'bg' ? 'Град / Село' : 'City / Village'} *</FieldLabel>
                    <TextInput required name="place" placeholder={lang === 'bg' ? 'напр. Белоградчик' : 'e.g. Belogradchik'} />
                  </div>
                </div>

                <div>
                  <FieldLabel>{lang === 'bg' ? 'Заглавие на историята' : 'Title of your Story'} *</FieldLabel>
                  <TextInput required name="title" placeholder={lang === 'bg' ? 'Работно заглавие' : 'Working title'} />
                </div>

                <div>
                  <FieldLabel>{lang === 'bg' ? 'Категория' : 'Category'} *</FieldLabel>
                  <JournalSelect
                    required
                    name="category"
                    label={lang === 'bg' ? 'Категория' : 'Category'}
                    placeholder={lang === 'bg' ? 'Изберете категория' : 'Select a category'}
                    options={categories.map((c) => ({
                      value: c.en,
                      label: lang === 'bg' ? c.bg : c.en,
                    }))}
                  />
                </div>

                <div>
                  <FieldLabel>{lang === 'bg' ? 'Кратко описание' : 'Short Description'} *</FieldLabel>
                  <TextArea
                    required
                    name="description"
                    rows={4}
                    placeholder={
                      lang === 'bg'
                        ? 'За какво е историята и защо е важна сега?'
                        : 'What is the story about, and why does it matter now?'
                    }
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="border border-dashed border-[#EAE6DF] bg-[#FDFBF7] px-5 py-6">
                    <FieldLabel>{lang === 'bg' ? 'Качете снимки' : 'Upload Photos'}</FieldLabel>
                    <label className="mt-2 flex cursor-pointer flex-col items-start gap-2">
                      <span className="inline-flex items-center gap-2 font-sans text-xs uppercase tracking-[0.18em] text-[#0C2686]">
                        <Upload className="size-3.5" />
                        {lang === 'bg' ? 'Изберете файлове' : 'Choose files'}
                      </span>
                      <input type="file" name="photos" accept="image/*" multiple className="sr-only" />
                      <span className="font-sans text-xs text-[#1A1A1A]/40">JPG, PNG · max 20MB</span>
                    </label>
                  </div>
                  <div className="border border-dashed border-[#EAE6DF] bg-[#FDFBF7] px-5 py-6">
                    <FieldLabel>{lang === 'bg' ? 'Качете документи' : 'Upload Documents'}</FieldLabel>
                    <label className="mt-2 flex cursor-pointer flex-col items-start gap-2">
                      <span className="inline-flex items-center gap-2 font-sans text-xs uppercase tracking-[0.18em] text-[#0C2686]">
                        <Upload className="size-3.5" />
                        {lang === 'bg' ? 'Изберете файлове' : 'Choose files'}
                      </span>
                      <input type="file" name="documents" accept=".pdf,.doc,.docx,.txt" multiple className="sr-only" />
                      <span className="font-sans text-xs text-[#1A1A1A]/40">PDF, DOC · optional</span>
                    </label>
                  </div>
                </div>

                <div>
                  <FieldLabel>{lang === 'bg' ? 'Текст на историята' : 'Story Text'} *</FieldLabel>
                  <TextArea
                    required
                    name="story"
                    rows={10}
                    placeholder={
                      lang === 'bg'
                        ? 'Поставете черновата си тук…'
                        : 'Paste or write your draft here…'
                    }
                  />
                </div>

                <div>
                  <FieldLabel>{lang === 'bg' ? 'Линкове (по избор)' : 'Links (optional)'}</FieldLabel>
                  <TextInput
                    name="links"
                    placeholder={lang === 'bg' ? 'Портфолио, Drive, социални мрежи…' : 'Portfolio, Drive, social…'}
                  />
                </div>

                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    required
                    type="checkbox"
                    name="ownWork"
                    className="mt-1 size-4 accent-[#0C2686]"
                  />
                  <span className="font-sans text-sm font-light text-[#1A1A1A]/70">
                    {lang === 'bg'
                      ? 'Потвърждавам, че тази история е моя собствена работа.'
                      : 'I confirm this story is my own work.'}
                  </span>
                </label>

                <button
                  type="submit"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#0C2686] px-8 py-3.5 font-sans text-xs font-medium uppercase tracking-[0.22em] text-white transition-colors hover:bg-[#1A1A1A]"
                >
                  <PenLine className="size-3.5" />
                  {lang === 'bg' ? 'Изпратете историята' : 'Submit Story'}
                </button>
              </form>
            )}
          </SectionShell>

          <SectionShell>
            <SectionIntro
              lang={lang}
              eyebrow="After you send"
              eyebrowBg="След изпращане"
              title="What Happens Next"
              titleBg="Какво следва"
              text="You’ll receive email updates as your story moves through the editorial desk."
              textBg="Ще получавате имейл актуализации, докато историята преминава през редакцията."
              center
            />
            <ProcessSteps lang={lang} steps={workflow} />
          </SectionShell>
        </main>
      )}
    </JournalShell>
  )
}
