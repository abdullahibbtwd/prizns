import { JournalShell } from '@/components/concept-3/JournalShell'
import { PageMeta } from '@/components/PageMeta'
import { Link } from '@/components/LocaleLink'

type ManifestoBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'statement'; lines: string[] }

const manifesto: Record<
  'bg' | 'en',
  { eyebrow: string; title: string; description: string; blocks: ManifestoBlock[] }
> = {
  bg: {
    eyebrow: 'Манифест',
    title: 'Защо Prizni',
    description:
      'Всички сме чували историите за бедния Северозапад. Ние имаме и друга гледна точка – и ви разказваме историите, които я доказват.',
    blocks: [
      {
        kind: 'paragraph',
        text: 'Всички сме чували историите за бедния Северозапад. Онази територия в горния ляв ъгъл на географската карта на България, която статистиките сочат като „най-бедния регион в Европейския съюз“. Медиите разгласяват тези истории, оставяйки чувство на недоимък и безнадеждност у местните. Ежедневното заливане с лоши новини влияе пагубно на самосъзнанието на хората и ги обезверява. Те са принудени да насърчават децата си да търсят спасение в големите градове или чужбина, а някои заедно с тях изоставят своя „северозападнал“ роден край. Това обезлюдяване обаче води единствено до задълбочаване на проблемите в региона.',
      },
      {
        kind: 'statement',
        lines: [
          'Положението в Северозапада наистина е трудно в много отношения.',
          'Но това е едната гледна точка.',
          'Ние имаме и друга.',
          'И ви разказваме историите, които я доказват.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Това са човешки истории за непримирим дух, постижения и преодолени препятствия, дейни хора на изкуството и културата, сърцати предприемачи, спортни легенди и герои от миналото. Истории за добри примери и каузи, благотворителни инициативи, социално отговорни бизнеси, силни традиции, древни обичаи и поверия, типични гозби, дивни местности и лековити билки, историческо наследство и културни средища – все богатства, които разкриват, че в Северозапада се крият много възможности. Само трябва да погледнем отвъд трудностите и да ги видим. С историите, които споделяме, искаме да върнем нагласата на хората, че от тях зависи така желаната промяна в Северозапада и да вдъхновим стъпките им в тази посока.',
      },
      {
        kind: 'statement',
        lines: [
          'Хората могат да постигнат много, стига да повярват, че е възможно.',
          'Някой трябва да им го каже.',
          'Ние избрахме да бъдем този някой.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Ще продължаваме да намираме доброто и да показваме различната гледна точка всеки ден, докато разбием негативната представа за Северозапада. Защото доброто там наистина съществува. И има крещяща нужда да бъде споделено. За да могат децата ни да разказват една по-различна история за Северозападна България и да се гордеят със своя произход и богатствата на родния си край.',
      },
    ],
  },
  en: {
    eyebrow: 'Manifesto',
    title: 'Why Prizni',
    description:
      'We have all heard the stories about the poor Northwest. We have another point of view – and we tell the stories that prove it.',
    blocks: [
      {
        kind: 'paragraph',
        text: 'We have all heard the stories about the poor Northwest. That territory in the upper left corner of the map of Bulgaria, which statistics point to as “the poorest region in the European Union”. The media spread these stories, leaving locals with a sense of scarcity and hopelessness. The daily flood of bad news takes a heavy toll on people’s self-image and robs them of faith. They feel compelled to encourage their children to seek salvation in the big cities or abroad, and some leave their “north-western-fallen” homeland along with them. Yet this depopulation only deepens the region’s problems.',
      },
      {
        kind: 'statement',
        lines: [
          'The situation in the Northwest is truly difficult in many ways.',
          'But that is only one point of view.',
          'We have another.',
          'And we tell you the stories that prove it.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'These are human stories of unyielding spirit, achievements and obstacles overcome, active people in art and culture, big-hearted entrepreneurs, sports legends and heroes of the past. Stories of good examples and causes, charitable initiatives, socially responsible businesses, strong traditions, ancient customs and beliefs, typical dishes, wondrous places and healing herbs, historical heritage and cultural centres – all riches that reveal how many opportunities the Northwest holds. We only need to look beyond the difficulties to see them. With the stories we share, we want to restore people’s belief that the change they long for in the Northwest depends on them, and to inspire their steps in that direction.',
      },
      {
        kind: 'statement',
        lines: [
          'People can achieve a great deal, as long as they believe it is possible.',
          'Someone has to tell them.',
          'We chose to be that someone.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'We will keep finding the good and showing a different point of view every day, until we break the negative image of the Northwest. Because the good there truly exists. And it urgently needs to be shared. So that our children can tell a different story about Northwestern Bulgaria and be proud of their origins and the riches of their homeland.',
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
              description={copy.description}
              path="/why-prizni"
            />
            <p className="text-center font-sans text-[11px] uppercase tracking-[0.22em] text-[#0C2686]">
              {copy.eyebrow}
            </p>
            <h1 className="mt-4 text-center font-heading text-4xl font-normal text-[#1A1A1A] md:text-6xl">
              {copy.title}
            </h1>

            <div className="mt-12 space-y-8 border-t border-[#EAE6DF] pt-12 font-sans text-base leading-relaxed text-[#1A1A1A]/85 md:text-lg md:leading-8">
              {copy.blocks.map((block, idx) =>
                block.kind === 'paragraph' ? (
                  <p key={idx}>{block.text}</p>
                ) : (
                  <div key={idx} className="space-y-1 font-medium text-[#1A1A1A]">
                    {block.lines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                ),
              )}
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
