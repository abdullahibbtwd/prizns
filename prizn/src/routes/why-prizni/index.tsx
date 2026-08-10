import { JournalShell } from '@/components/concept-3/JournalShell'
import { PageMeta } from '@/components/PageMeta'
import { Link } from 'react-router-dom'

const manifesto = {
  bg: {
    eyebrow: 'Манифест',
    title: 'Защо Prizni',
    lead:
      'Prizni съществува, за да пази топлите човешки истории, местата и традициите на Северозападна България — като един регион, не като административни късчета.',
    principles: [
      {
        title: 'Хората преди заглавията',
        text: 'Всяка история започва с човек, място или жест, който заслужава време и уважение.',
      },
      {
        title: 'Един Северозапад',
        text: 'Не разделяме региона на Montana / Vratsa / Kozloduy. Разказваме го като споделена земя.',
      },
      {
        title: 'Топъл тон',
        text: 'Ярко, приветливо и ясно — без студен моден блясък и без корпоративен жаргон.',
      },
      {
        title: 'Прозрачност',
        text: 'Когато съдържанието е спонсорирано, казваме го ясно. Зад всяка история стои процес, който сме готови да покажем.',
      },
    ],
  },
  en: {
    eyebrow: 'Manifesto',
    title: 'Why Prizni',
    lead:
      'Prizni exists to keep the warm human stories, places, and traditions of Northwestern Bulgaria alive — as one region, not administrative fragments.',
    principles: [
      {
        title: 'People before headlines',
        text: 'Every story begins with a person, place, or gesture that deserves time and care.',
      },
      {
        title: 'One Northwest',
        text: 'We do not split the region into Montana / Vratsa / Kozloduy. We tell it as shared ground.',
      },
      {
        title: 'A warm tone',
        text: 'Bright, welcoming, and clear — never cold fashion gloss or corporate jargon.',
      },
      {
        title: 'Transparency',
        text: 'When content is sponsored, we say so clearly. Behind every story is a process we are ready to show.',
      },
    ],
  },
}

export default function WhyPrizniPage() {
  return (
    <JournalShell>
      {({ lang }) => {
        const copy = manifesto[lang]
        return (
          <main className="mx-auto max-w-3xl px-6 pb-24 pt-28 md:px-12 md:pt-32">
            <PageMeta
              lang={lang}
              title={copy.title}
              description={copy.lead}
              path="/why-prizni"
            />
            <p className="text-center font-sans text-[11px] uppercase tracking-[0.22em] text-[#0C2686]">
              {copy.eyebrow}
            </p>
            <h1 className="mt-4 text-center font-heading text-4xl font-normal text-[#1A1A1A] md:text-6xl">
              {copy.title}
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-center font-sans text-base font-light leading-relaxed text-[#1A1A1A]/70 md:text-lg">
              {copy.lead}
            </p>

            <div className="mt-16 space-y-10 border-t border-[#EAE6DF] pt-12">
              {copy.principles.map((item) => (
                <section key={item.title}>
                  <h2 className="font-heading text-2xl text-[#1A1A1A] md:text-3xl">
                    {item.title}
                  </h2>
                  <p className="mt-3 font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/65 md:text-base">
                    {item.text}
                  </p>
                </section>
              ))}
            </div>

            <div className="mt-16 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/stories"
                className="inline-flex rounded-full bg-[#0C2686] px-7 py-3 font-sans text-[11px] uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#1A1A1A]"
              >
                {lang === 'bg' ? 'Чети истории' : 'Read stories'}
              </Link>
              <Link
                to="/write-for-us"
                className="inline-flex rounded-full border border-[#1A1A1A]/20 px-7 py-3 font-sans text-[11px] uppercase tracking-[0.2em] text-[#1A1A1A] transition-colors hover:border-[#0C2686] hover:text-[#0C2686]"
              >
                {lang === 'bg' ? 'Пишете за нас' : 'Write for Us'}
              </Link>
            </div>
          </main>
        )
      }}
    </JournalShell>
  )
}
