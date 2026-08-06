import type { ArticleSection, JournalArticle } from '@/data/concept-3/articleTypes'

interface SectionArticleSeed {
  slug: string
  sourceId: string
  section: ArticleSection
  category: string
  categoryBg: string
  title: string
  titleBg: string
  subtitle: string
  subtitleBg: string
  readTime: string
  readTimeBg: string
  location: string
  locationBg: string
  author: string
  authorBg: string
  date: string
  dateBg: string
  image: string
  lead: string
  leadBg: string
  note: string
  noteBg: string
  quote: string
  quoteBg: string
  cite: string
  citeBg: string
  endLabel: string
  endLabelBg: string
}

function buildArticle(seed: SectionArticleSeed): JournalArticle {
  return {
    slug: seed.slug,
    sourceId: seed.sourceId,
    section: seed.section,
    path: `/${seed.section}/${seed.slug}`,
    category: seed.category,
    categoryBg: seed.categoryBg,
    title: seed.title,
    titleBg: seed.titleBg,
    subtitle: seed.subtitle,
    subtitleBg: seed.subtitleBg,
    readTime: seed.readTime,
    readTimeBg: seed.readTimeBg,
    location: seed.location,
    locationBg: seed.locationBg,
    author: seed.author,
    authorBg: seed.authorBg,
    date: seed.date,
    dateBg: seed.dateBg,
    image: seed.image,
    photoCredit: 'Photography by PRIZNI Field Desk',
    photoCreditBg: 'Фотография: Теренен отдел PRIZNI',
    body: [
      {
        type: 'paragraph',
        text: seed.lead,
        textBg: seed.leadBg,
      },
      {
        type: 'note',
        label: 'Field note',
        labelBg: 'Теренна бележка',
        text: seed.note,
        textBg: seed.noteBg,
      },
      {
        type: 'pullquote',
        text: seed.quote,
        textBg: seed.quoteBg,
        cite: seed.cite,
        citeBg: seed.citeBg,
      },
      {
        type: 'paragraph',
        text: 'PRIZNI follows the Northwest at walking pace — listening for the detail that turns a headline into a memory worth keeping.',
        textBg:
          'PRIZNI следва Северозапада с крачка за разходка — вслушва се в детайла, който превръща заглавието в спомен, заслужаващ да бъде запазен.',
      },
      {
        type: 'caption',
        text: 'Opening frame from the field notebook.',
        textBg: 'Начален кадър от теренната тетрадка.',
      },
    ],
    endLabel: seed.endLabel,
    endLabelBg: seed.endLabelBg,
  }
}

export const sportsArticles: JournalArticle[] = [
  buildArticle({
    slug: 'riverbank-runners-lom',
    sourceId: 'sp1',
    section: 'sports',
    category: 'Sports',
    categoryBg: 'Спорт',
    title: 'Riverbank Runners of Lom',
    titleBg: 'Бреговите бегачи на Лом',
    subtitle:
      'Before the town wakes, a quiet pack measures the Danube in footsteps and steam.',
    subtitleBg:
      'Преди градът да се събуди, тиха група мери Дунава със стъпки и пара.',
    readTime: '7 min read',
    readTimeBg: '7 мин четене',
    location: 'Lom',
    locationBg: 'Лом',
    author: 'Inna Gerova',
    authorBg: 'Инна Герова',
    date: 'Summer 2026',
    dateBg: 'Лято 2026',
    image: '/river.jpg',
    lead: 'They meet where the promenade softens into gravel. No numbers on chests — only a shared agreement with the river’s morning breath.',
    leadBg:
      'Срещат се там, където крайбрежната алея омеква в чакъл. Без номера на гърдите — само общо съгласие с утринния дъх на реката.',
    note: 'Training culture here is social as much as athletic: bread afterward counts as recovery.',
    noteBg:
      'Тук тренировъчната култура е толкова социална, колкото и спортна: хлябът след това се брои за възстановяване.',
    quote: 'We do not race the river. We borrow its pace.',
    quoteBg: 'Не се състезаваме с реката. Заемаме нейното темпо.',
    cite: 'Miro, long-time riverside runner',
    citeBg: 'Миро, отдавнашен брегови бегач',
    endLabel: 'End of Sports Story',
    endLabelBg: 'Край на спортния разказ',
  }),
  buildArticle({
    slug: 'belogradchik-rock-climbers',
    sourceId: 'sp2',
    section: 'sports',
    category: 'Sports',
    categoryBg: 'Спорт',
    title: 'Hands Against the Red Rocks',
    titleBg: 'Ръце срещу червените скали',
    subtitle:
      'Local climbers treat Belogradchik’s sandstone like a grammar — each route another sentence.',
    subtitleBg:
      'Местните катерачи приемат пясъчника на Белоградчик като граматика — всеки маршрут е ново изречение.',
    readTime: '8 min read',
    readTimeBg: '8 мин четене',
    location: 'Belogradchik',
    locationBg: 'Белоградчик',
    author: 'Natalia Dimitrova',
    authorBg: 'Наталия Димитрова',
    date: 'Summer 2026',
    dateBg: 'Лято 2026',
    image: '/mountains.jpg',
    lead: 'Chalk dust settles into the seams of sandstone. Below, tourists photograph silhouettes. Above, climbers negotiate silence with gravity.',
    leadBg:
      'Магнезият се утаява в пукнатините на пясъчника. Долу туристи снимат силуети. Горе катерачи преговарят с тишината и гравитацията.',
    note: 'Guides emphasize listening — wind shifts announce weather faster than apps.',
    noteBg:
      'Водачите настояват да слушаш — промените на вятъра известяват времето по-бързо от приложенията.',
    quote: 'The rock remembers every grip you rush.',
    quoteBg: 'Скалата помни всеки хват, който бързаш.',
    cite: 'Yana, local route setter',
    citeBg: 'Яна, местен прокарвач на маршрути',
    endLabel: 'End of Sports Story',
    endLabelBg: 'Край на спортния разказ',
  }),
  buildArticle({
    slug: 'vratsa-youth-football',
    sourceId: 'sp3',
    section: 'sports',
    category: 'Sports',
    categoryBg: 'Спорт',
    title: 'Saturday Pitch Above the Gorge',
    titleBg: 'Съботният терен над ждрелото',
    subtitle:
      'A youth match where grandparents still keep score on cigarette paper.',
    subtitleBg:
      'Младежки мач, в който баби и дядовци още водят резултата върху цигарена хартия.',
    readTime: '6 min read',
    readTimeBg: '6 мин четене',
    location: 'Vratsa',
    locationBg: 'Враца',
    author: 'Angelika Petrova',
    authorBg: 'Ангелика Петрова',
    date: 'Autumn 2026',
    dateBg: 'Есен 2026',
    image: '/forest.jpg',
    lead: 'The field sits between apartment blocks and the Balkan edge. Kickoff sounds like a school bell for the whole neighborhood.',
    leadBg:
      'Теренът е между блоковете и края на Балкана. Началният сигнал звучи като училищен звънец за целия квартал.',
    note: 'Club volunteers mend nets with fishing line — a Danube habit carried inland.',
    noteBg:
      'Доброволците в клуба кърпят мрежите с риболовен конец — дунавски навик, пренесен навътре.',
    quote: 'Winning is loud. Belonging is quieter — and lasts longer.',
    quoteBg: 'Победата е шумна. Принадлежността е по-тиха — и трае по-дълго.',
    cite: 'Coach Kiril',
    citeBg: 'Треньор Кирил',
    endLabel: 'End of Sports Story',
    endLabelBg: 'Край на спортния разказ',
  }),
  buildArticle({
    slug: 'danube-rowing-dawn',
    sourceId: 'sp4',
    section: 'sports',
    category: 'Sports',
    categoryBg: 'Спорт',
    title: 'Oars Before Opening Time',
    titleBg: 'Весла преди работно време',
    subtitle:
      'Amateur rowers share the water with fishermen — and a strict dawn etiquette.',
    subtitleBg:
      'Любители гребци делят водата с рибари — и строг утринен етикет.',
    readTime: '7 min read',
    readTimeBg: '7 мин четене',
    location: 'Vidin',
    locationBg: 'Видин',
    author: 'Albena Nikolova',
    authorBg: 'Албена Николова',
    date: 'Summer 2026',
    dateBg: 'Лято 2026',
    image: '/heroimg.jpg',
    lead: 'Boats slip out while cafe shutters are still locked. Each stroke leaves a short silver sentence on the Danube.',
    leadBg:
      'Лодките излизат, докато щорите на кафенетата са още заключени. Всеки гребен замах оставя кратко сребърно изречение върху Дунава.',
    note: 'Club membership here often begins with borrowing — oars, courage, coffee.',
    noteBg:
      'Членството в клуба често започва със заемане — на весла, кураж и кафе.',
    quote: 'The river does not care about your calendar. That is why we come.',
    quoteBg: 'Реката не се интересува от календара ти. Затова идваме.',
    cite: 'Elena, weekend rower',
    citeBg: 'Елена, греблачка в уикенда',
    endLabel: 'End of Sports Story',
    endLabelBg: 'Край на спортния разказ',
  }),
]

export const eventsArticles: JournalArticle[] = [
  buildArticle({
    slug: 'chiprovtsi-carpet-fair',
    sourceId: 'ev1',
    section: 'events',
    category: 'Events',
    categoryBg: 'Събития',
    title: 'Chiprovtsi Carpet Fair',
    titleBg: 'Панаир на чипровския килим',
    subtitle:
      'Looms in the square, coffee in copper pots, and patterns that travel farther than buses.',
    subtitleBg:
      'Станове на площада, кафе в медни джезвета и мотиви, които пътуват по-далеч от автобусите.',
    readTime: '5 min read',
    readTimeBg: '5 мин четене',
    location: 'Chiprovtsi',
    locationBg: 'Чипровци',
    author: 'Angelika Petrova',
    authorBg: 'Ангелика Петрова',
    date: '12–14 Sep 2026',
    dateBg: '12–14 сеп 2026',
    image: '/festival.jpg',
    lead: 'The fair begins with the sound of stretched warps — a low music that gathers people before any speech does.',
    leadBg:
      'Панаирът започва със звука на опънати нишки — ниска музика, която събира хората преди всяка реч.',
    note: 'Evening program pairs young weavers with elders for live pattern storytelling.',
    noteBg:
      'Вечерната програма събира млади тъкачки със старшите за живо разказване на мотиви.',
    quote: 'A fair is not shopping. It is proof that the craft still has witnesses.',
    quoteBg: 'Панаирът не е пазаруване. Той е доказателство, че занаятът все още има свидетели.',
    cite: 'Festival note',
    citeBg: 'Бележка към фестивала',
    endLabel: 'End of Event Note',
    endLabelBg: 'Край на бележката за събитието',
  }),
  buildArticle({
    slug: 'belogradchik-night-paths',
    sourceId: 'ev2',
    section: 'events',
    category: 'Events',
    categoryBg: 'Събития',
    title: 'Night Paths Under the Rocks',
    titleBg: 'Нощни пътеки под скалите',
    subtitle:
      'Guided dusk walks where lanterns teach the sandstone new outlines.',
    subtitleBg:
      'Водени вечерни разходки, в които фенерите чертаят нови очертания на пясъчника.',
    readTime: '4 min read',
    readTimeBg: '4 мин четене',
    location: 'Belogradchik',
    locationBg: 'Белоградчик',
    author: 'Natalia Dimitrova',
    authorBg: 'Наталия Димитрова',
    date: 'Every Fri · Aug 2026',
    dateBg: 'Всеки петък · авг 2026',
    image: '/mountains.jpg',
    lead: 'After ticket desks close, the rocks become quieter characters. Guides speak softer; footsteps answer.',
    leadBg:
      'След като касите затворят, скалите стават по-тихи герои. Водачите говорят по-меко; стъпките отговарят.',
    note: 'Limited groups keep the path breathable — book early in peak weeks.',
    noteBg:
      'Ограничените групи пазят пътеката проходима — резервирайте рано в пиковите седмици.',
    quote: 'At night the rocks stop posing. They simply stand.',
    quoteBg: 'Нощем скалите спират да позират. Просто стоят.',
    cite: 'Guide Dimitar',
    citeBg: 'Водач Димитър',
    endLabel: 'End of Event Note',
    endLabelBg: 'Край на бележката за събитието',
  }),
  buildArticle({
    slug: 'vidin-river-market-sunday',
    sourceId: 'ev3',
    section: 'events',
    category: 'Events',
    categoryBg: 'Събития',
    title: 'Sunday River Market',
    titleBg: 'Неделният речен пазар',
    subtitle:
      'Honey, salt fish, and gossip timed to the ferry schedule.',
    subtitleBg:
      'Мед, осолена риба и клюки, подредени по разписанието на ферибота.',
    readTime: '5 min read',
    readTimeBg: '5 мин четене',
    location: 'Vidin',
    locationBg: 'Видин',
    author: 'Inna Gerova',
    authorBg: 'Инна Герова',
    date: 'Sundays · Year-round',
    dateBg: 'Недели · Целогодишно',
    image: '/river.jpg',
    lead: 'Tables appear near the water like temporary architecture. By noon they vanish, leaving only paper bags and stories.',
    leadBg:
      'Масите се появяват край водата като временна архитектура. До обяд изчезват — остават само торби и истории.',
    note: 'Writers from PRIZNI return here when a region needs to be heard in many accents at once.',
    noteBg:
      'Писателите на PRIZNI се връщат тук, когато регионът трябва да се чуе в много акценти едновременно.',
    quote: 'Markets are newspapers you can smell.',
    quoteBg: 'Пазарите са вестници, които можеш да помиришеш.',
    cite: 'Field desk',
    citeBg: 'Теренен отдел',
    endLabel: 'End of Event Note',
    endLabelBg: 'Край на бележката за събитието',
  }),
  buildArticle({
    slug: 'vratsa-heritage-weekend',
    sourceId: 'ev4',
    section: 'events',
    category: 'Events',
    categoryBg: 'Събития',
    title: 'Heritage Open Weekend',
    titleBg: 'Уикенд на отвореното наследство',
    subtitle:
      'Courtyards unlock; choirs rehearse on stairwells; museums refuse to whisper.',
    subtitleBg:
      'Дворове се отключват; хорове репетират по стълби; музеите отказват да шепнат.',
    readTime: '6 min read',
    readTimeBg: '6 мин четене',
    location: 'Vratsa',
    locationBg: 'Враца',
    author: 'Albena Nikolova',
    authorBg: 'Албена Николова',
    date: '3–4 Oct 2026',
    dateBg: '3–4 окт 2026',
    image: '/church.jpg',
    lead: 'The weekend treats the city as an open drawer — linens, letters, and brass instruments all within reach.',
    leadBg:
      'Уикендът приема града като отворено чекмедже — покривки, писма и медни инструменти на една ръка разстояние.',
    note: 'Partner institutions open after hours on Saturday for candlelit room talks.',
    noteBg:
      'Партньорските институции отварят след работно време в събота за разговори при свещи.',
    quote: 'Heritage is heavy. Weekends like this help us carry it together.',
    quoteBg: 'Наследството е тежко. Уикенди като този ни помагат да го носим заедно.',
    cite: 'Municipal culture note',
    citeBg: 'Бележка на общинската култура',
    endLabel: 'End of Event Note',
    endLabelBg: 'Край на бележката за събитието',
  }),
]

export const videoArticles: JournalArticle[] = [
  buildArticle({
    slug: 'kilim-in-motion',
    sourceId: 'vd1',
    section: 'video',
    category: 'Video',
    categoryBg: 'Видео',
    title: 'Kilim in Motion',
    titleBg: 'Килим в движение',
    subtitle:
      'A short film where hands, thread, and window light keep the same tempo.',
    subtitleBg:
      'Къс филм, в който ръце, нишка и светлина от прозореца държат едно темпо.',
    readTime: '12 min watch',
    readTimeBg: '12 мин гледане',
    location: 'Chiprovtsi',
    locationBg: 'Чипровци',
    author: 'Natalia Dimitrova',
    authorBg: 'Наталия Димитрова',
    date: 'Film Desk 2026',
    dateBg: 'Филмов отдел 2026',
    image: '/craftsman.jpg',
    lead: 'The camera stays close enough to hear the comb strike the weave — a metronome older than electricity.',
    leadBg:
      'Камерата стои достатъчно близо, за да се чуе ударът на гребена в тъканта — метроном, по-стар от електричеството.',
    note: 'Shot on location over three mornings; no studio lights, only north windows.',
    noteBg:
      'Снимано на място в три утра; без студийни светлини — само северни прозорци.',
    quote: 'If you watch patiently, the pattern finishes itself.',
    quoteBg: 'Ако гледаш търпеливо, мотивът сам се довършва.',
    cite: 'Director’s note',
    citeBg: 'Бележка на режисьора',
    endLabel: 'End of Video Note',
    endLabelBg: 'Край на видео бележката',
  }),
  buildArticle({
    slug: 'fog-over-the-pass',
    sourceId: 'vd2',
    section: 'video',
    category: 'Video',
    categoryBg: 'Видео',
    title: 'Fog Over the Pass',
    titleBg: 'Мъгла над прохода',
    subtitle:
      'Time-lapse and footsteps through Vratsa Balkan when the road disappears.',
    subtitleBg:
      'Таймлапс и стъпки през Врачанския Балкан, когато пътят изчезва.',
    readTime: '8 min watch',
    readTimeBg: '8 мин гледане',
    location: 'Vratsa Balkan',
    locationBg: 'Врачански Балкан',
    author: 'Inna Gerova',
    authorBg: 'Инна Герова',
    date: 'Film Desk 2026',
    dateBg: 'Филмов отдел 2026',
    image: '/mountains.jpg',
    lead: 'Fog turns landmarks into suggestions. Drivers become listeners. The film keeps both in frame.',
    leadBg:
      'Мъглата превръща ориентирите в предположения. Шофьорите стават слушатели. Филмът държи и двете в кадър.',
    note: 'Field audio includes sheep bells recorded off-frame — left deliberately soft.',
    noteBg:
      'Теренното аудио включва овчи звънци извън кадъра — нарочно оставени меки.',
    quote: 'Visibility is a kind of hospitality. Fog temporarily withdraws it.',
    quoteBg: 'Видимостта е вид гостоприемство. Мъглата временно го оттегля.',
    cite: 'Camera notes',
    citeBg: 'Бележки към камерата',
    endLabel: 'End of Video Note',
    endLabelBg: 'Край на видео бележката',
  }),
  buildArticle({
    slug: 'bread-before-dawn',
    sourceId: 'vd3',
    section: 'video',
    category: 'Video',
    categoryBg: 'Видео',
    title: 'Bread Before Dawn',
    titleBg: 'Хляб преди зори',
    subtitle:
      'A bakery portrait from dough to street window, told without narration.',
    subtitleBg:
      'Портрет на пекарна от тесто до витрина — разказан без глас зад кадър.',
    readTime: '9 min watch',
    readTimeBg: '9 мин гледане',
    location: 'Montana',
    locationBg: 'Монтана',
    author: 'Angelika Petrova',
    authorBg: 'Ангелика Петрова',
    date: 'Film Desk 2026',
    dateBg: 'Филмов отдел 2026',
    image: '/bread.jpg',
    lead: 'Flour settles like early snow. The oven door becomes a horizon every few minutes.',
    leadBg:
      'Брашното ляга като ранен сняг. Вратата на фурната става хоризонт през няколко минути.',
    note: 'Released with optional captions in BG/EN describing ambient sound cues.',
    noteBg:
      'Публикувано с опционални надписи BG/EN, описващи звуковите маркери.',
    quote: 'Work begins when the town is still a rumor.',
    quoteBg: 'Работата започва, когато градът е още слух.',
    cite: 'Film desk',
    citeBg: 'Филмов отдел',
    endLabel: 'End of Video Note',
    endLabelBg: 'Край на видео бележката',
  }),
  buildArticle({
    slug: 'danube-ferry-crossing',
    sourceId: 'vd4',
    section: 'video',
    category: 'Video',
    categoryBg: 'Видео',
    title: 'Crossing With the Ferry',
    titleBg: 'Преминаване с ферибота',
    subtitle:
      'One slow traverse — engines, gulls, and people practicing patience.',
    subtitleBg:
      'Едно бавно преминаване — двигатели, чайки и хора, които упражняват търпение.',
    readTime: '6 min watch',
    readTimeBg: '6 мин гледане',
    location: 'Danube',
    locationBg: 'Дунав',
    author: 'Albena Nikolova',
    authorBg: 'Албена Николова',
    date: 'Film Desk 2026',
    dateBg: 'Филмов отдел 2026',
    image: '/river.jpg',
    lead: 'The ferry is a floating waiting room. Conversations start unfinished and stay that way — on purpose.',
    leadBg:
      'Фериботът е плаваща чакалня. Разговорите започват незавършени и остават такива — нарочно.',
    note: 'Shot handheld to keep the pitch of the deck honest.',
    noteBg: 'Снимано от ръка, за да остане честна люлката на палубата.',
    quote: 'Between two banks, everyone becomes a guest.',
    quoteBg: 'Между два бряга всеки става гост.',
    cite: 'Editor’s frame',
    citeBg: 'Редакторска рамка',
    endLabel: 'End of Video Note',
    endLabelBg: 'Край на видео бележката',
  }),
]

export const campaignArticles: JournalArticle[] = [
  buildArticle({
    slug: 'save-the-village-reading-rooms',
    sourceId: 'cp1',
    section: 'campaigns',
    category: 'Campaigns',
    categoryBg: 'Кампании',
    title: 'Save the Village Reading Rooms',
    titleBg: 'Спасете селските читалища',
    subtitle:
      'A fund for roofs, shelves, and the quiet electricity of borrowed books.',
    subtitleBg:
      'Фонд за покриви, лавици и тихата електрификация на заетите книги.',
    readTime: '6 min read',
    readTimeBg: '6 мин четене',
    location: 'Northwest',
    locationBg: 'Северозапад',
    author: 'Albena Nikolova',
    authorBg: 'Албена Николова',
    date: 'Active · 2026',
    dateBg: 'Активна · 2026',
    image: '/meseum.jpg',
    lead: 'Reading rooms still hold choirs, clubs, and winter films. Many also hold rain where the roof thins.',
    leadBg:
      'Читалищата още държат хорове, клубове и зимни филми. Много от тях държат и дъжд там, където покривът оредява.',
    note: 'Donations map to named rooms — progress updates published monthly in the journal.',
    noteBg:
      'Даренията се свързват с конкретни зали — месечни новини в журнала.',
    quote: 'A roof is infrastructure for memory.',
    quoteBg: 'Покривът е инфраструктура за памет.',
    cite: 'Campaign charter',
    citeBg: 'Харта на кампанията',
    endLabel: 'End of Campaign Note',
    endLabelBg: 'Край на бележката за кампанията',
  }),
  buildArticle({
    slug: 'apprentice-the-loom',
    sourceId: 'cp2',
    section: 'campaigns',
    category: 'Campaigns',
    categoryBg: 'Кампании',
    title: 'Apprentice the Loom',
    titleBg: 'Чиракуване на стана',
    subtitle:
      'Scholarships pairing young weavers with living masters in Chiprovtsi.',
    subtitleBg:
      'Стипендии, които събират млади тъкачи с живи майстори в Чипровци.',
    readTime: '5 min read',
    readTimeBg: '5 мин четене',
    location: 'Chiprovtsi',
    locationBg: 'Чипровци',
    author: 'Angelika Petrova',
    authorBg: 'Ангелика Петрова',
    date: 'Open applications',
    dateBg: 'Отворени кандидатствания',
    image: '/craftsman.jpg',
    lead: 'Skill rarely disappears overnight. It thins when fewer hands return to the same chair each week.',
    leadBg:
      'Умението рядко изчезва за една нощ. Оредява, когато по-малко ръце се връщат към същия стол всяка седмица.',
    note: 'Each grant covers tools, travel, and a documented year of making.',
    noteBg:
      'Всяка стипендия покрива инструменти, пътуване и документирана година на правене.',
    quote: 'Inheritance needs an address — and a timetable.',
    quoteBg: 'Наследството има нужда от адрес — и от разписание.',
    cite: 'Program note',
    citeBg: 'Бележка към програмата',
    endLabel: 'End of Campaign Note',
    endLabelBg: 'Край на бележката за кампанията',
  }),
  buildArticle({
    slug: 'restore-the-path-markers',
    sourceId: 'cp3',
    section: 'campaigns',
    category: 'Campaigns',
    categoryBg: 'Кампании',
    title: 'Restore the Path Markers',
    titleBg: 'Възстановете маркировката на пътеките',
    subtitle:
      'Stone and paint signs for trails that still remember feet better than maps.',
    subtitleBg:
      'Каменни и боядисани знаци за пътеки, които още помнят стъпките по-добре от картите.',
    readTime: '4 min read',
    readTimeBg: '4 мин четене',
    location: 'Vratsa Balkan',
    locationBg: 'Врачански Балкан',
    author: 'Natalia Dimitrova',
    authorBg: 'Наталия Димитрова',
    date: 'Volunteer days monthly',
    dateBg: 'Месечни доброволчески дни',
    image: '/forest.jpg',
    lead: 'Markers fail quietly — lichen first, then confusion. Restoring them is hospitality written outdoors.',
    leadBg:
      'Маркировките се повреждат тихо — първо лишей, после объркване. Възстановяването им е гостоприемство, написано навън.',
    note: 'PRIZNI partners with local hiking clubs for weekend paint crews.',
    noteBg:
      'PRIZNI партнира с местни туристически клубове за уикендни екипи с боя.',
    quote: 'A good path does not shout. It simply continues.',
    quoteBg: 'Добрата пътека не вика. Просто продължава.',
    cite: 'Trail desk',
    citeBg: 'Отдел пътеки',
    endLabel: 'End of Campaign Note',
    endLabelBg: 'Край на бележката за кампанията',
  }),
  buildArticle({
    slug: 'document-the-dialects',
    sourceId: 'cp4',
    section: 'campaigns',
    category: 'Campaigns',
    categoryBg: 'Кампании',
    title: 'Document the Dialects',
    titleBg: 'Документирайте диалектите',
    subtitle:
      'Recording elders before verbs go quiet — an archive you can still hear.',
    subtitleBg:
      'Запис на възрастните преди глаголите да утихнат — архив, който още може да се чуе.',
    readTime: '7 min read',
    readTimeBg: '7 мин четене',
    location: 'Northwest villages',
    locationBg: 'Села в Северозапада',
    author: 'Inna Gerova',
    authorBg: 'Инна Герова',
    date: 'Ongoing field season',
    dateBg: 'Текущ теренен сезон',
    image: '/woman.jpg',
    lead: 'Dialect is geography spoken aloud. This campaign funds microphones, travel, and careful transcription.',
    leadBg:
      'Диалектът е география, изговорена на глас. Кампанията финансира микрофони, пътуване и внимателна транскрипция.',
    note: 'Clips appear first in Voices; full transcripts enter a public archive yearly.',
    noteBg:
      'Откъси излизат първо в „Гласове“; пълните транскрипции влизат в публичен архив всяка година.',
    quote: 'When a word vanishes, a whole weather disappears with it.',
    quoteBg: 'Когато една дума изчезне, с нея изчезва цяло време.',
    cite: 'Language desk',
    citeBg: 'Езиков отдел',
    endLabel: 'End of Campaign Note',
    endLabelBg: 'Край на бележката за кампанията',
  }),
]
