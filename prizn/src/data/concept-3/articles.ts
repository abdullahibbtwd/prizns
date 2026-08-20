/**
 * Mock long-form article data for future slug pages.
 *
 * Modeled after StoryReaderModal:
 * - category · read time · location
 * - centered headline + byline
 * - hero image + photo credit
 * - inline images in the body
 * - shared editorial style, different notes per piece
 *   (paragraphs, pull quotes, field notes, captions)
 *
 * Do not wire routes yet — this file is the content contract.
 */

export type {
  ArticleSection,
  ArticleBlock,
  JournalArticle,
} from '@/data/concept-3/articleTypes'

import type { JournalArticle } from '@/data/concept-3/articleTypes'
import {
  discoverArticles,
  voiceArticles,
} from '@/data/concept-3/articleExtras'
import {
  sportsArticles,
  eventsArticles,
  videoArticles,
  campaignArticles,
} from '@/data/concept-3/sectionHubArticles'

const featured: JournalArticle = {
  slug: 'along-the-walnut-paths',
  sourceId: 'featured',
  section: 'featured',
  path: '/stories/along-the-walnut-paths',
  category: 'Human Stories',
  categoryBg: 'Човешки истории',
  title: 'Along the Walnut Paths of Northwestern Bulgaria',
  titleBg: 'По ореховите пътеки на Северозапада',
  subtitle:
    'A silent walk through forgotten stone villages where old walnut trees guard the wisdom of generations.',
  subtitleBg:
    'Тиха разходка през забравени каменни села, където старите орехи пазят мъдростта на поколения.',
  readTime: '12 min read',
  readTimeBg: '12 мин четене',
  location: 'Belogradchik Region',
  locationBg: 'Белоградчик и околности',
  author: 'Albena Stoyanova',
  authorBg: 'Албена Стоянова',
  date: 'July 2026',
  dateBg: 'Юли 2026',
  image: '/village.jpg',
  photoCredit: 'Photography by PRIZNI Archive',
  photoCreditBg: 'Фотография: Архив PRIZNI',
  body: [
    {
      type: 'paragraph',
      text: 'There is a specific rhythm to dawn in the villages surrounding Belogradchik. Long before the sun reaches the red sandstone cliffs, a cool mist settles over the stone paths lined with ancient walnut trees.',
      textBg:
        'Има особен ритъм на зората в селата около Белоградчик. Още преди слънцето да стигне червените скали, хладна мъгла ляга върху каменните пътеки, оградени от вековни орехи.',
    },
    {
      type: 'paragraph',
      text: 'For over eighty years, Grandfather Ivan has walked these paths every morning. His hands, weathered like the bark of the trees he tends, carry the silent history of a region that the rest of the world often passes by.',
      textBg:
        'Вече над осемдесет години дядо Иван върви по тези пътеки всяка сутрин. Ръцете му, набраздени като кората на дърветата, които гледа, носят тихата история на регион, който светът често подминава.',
    },
    {
      type: 'pullquote',
      text: 'We do not own this land. We are merely its keepers for a short while. Every tree here was planted by someone who wanted to leave a shadow for those who came after.',
      textBg:
        'Ние не притежаваме тази земя. Само я пазим за кратко. Всяко дърво тук е посадено от някой, който е искал да остави сянка за следващите.',
      cite: 'Grandfather Ivan, Belogradchik Region',
      citeBg: 'Дядо Иван, Белоградчишко',
    },
    {
      type: 'note',
      label: 'Field note',
      labelBg: 'Бележка от терена',
      text: 'The oldest walnut along the upper path is called “the school tree” by locals — children once sat in its shade to learn letters.',
      textBg:
        'Най-старият орех по горната пътека местните наричат „училищното дърво“ — някога децата сядали в сянката му да учат букви.',
    },
    {
      type: 'paragraph',
      text: 'In this edition of The Living Journal, we invite you to slow down. To step off the asphalt roads into the narrow stone lanes where doors are rarely locked, and where every cup of coffee is accompanied by an unforgettable memory.',
      textBg:
        'В това издание на Живия журнал ви каним да забавите темпото. Да слезете от асфалта в тесните каменни улички, където вратите рядко се заключват и всяко кафе идва заедно с незабравим спомен.',
    },
    {
      type: 'caption',
      text: 'Stone lane outside Varbovo, photographed at 5:40 AM — before the first bus from Belogradchik.',
      textBg:
        'Каменна уличка край Върбово, заснета в 5:40 — преди първия автобус от Белоградчик.',
    },
  ],
  endLabel: 'End of Editorial Story',
  endLabelBg: 'Край на редакционния разказ',
}

const humanStories: JournalArticle[] = [
  {
    slug: 'walnut-keeper-varbovo',
    sourceId: 'hs1',
    section: 'human-stories',
    path: '/stories/walnut-keeper-varbovo',
    category: 'Human Stories',
    categoryBg: 'Човешки истории',
    title: 'The Walnut Keeper of Varbovo',
    titleBg: 'Пазителят на орехите във Върбово',
    subtitle:
      'Every morning before dawn, Ana-Maria walks the same stone path her grandmother once did.',
    subtitleBg:
      'Всяка сутрин преди зори Ана-Мария върви по същата каменна пътека, по която е вървяла баба ѝ.',
    readTime: '8 min read',
    readTimeBg: '8 мин четене',
    location: 'Varbovo',
    locationBg: 'с. Върбово',
    author: 'Albena Nikolova',
    authorBg: 'Албена Николова',
    date: 'June 2026',
    dateBg: 'Юни 2026',
    image: '/woman.jpg',
    photoCredit: 'Photography by Natalia Dimitrova',
    photoCreditBg: 'Фотография: Наталия Димитрова',
    body: [
      {
        type: 'paragraph',
        text: 'Ana-Maria leaves the house while the village is still blue with night. A cloth bag of old newspapers, a small knife, and the soft click of the garden gate — this is how every day begins in Varbovo.',
        textBg:
          'Ана-Мария тръгва от къщата, докато селото още е синьо от нощта. Торба със стари вестници, малък нож и мекото щракване на градинската порта — така започва всеки ден във Върбово.',
      },
      {
        type: 'note',
        label: 'Family note',
        labelBg: 'Семейна бележка',
        text: 'Her grandmother marked each walnut tree with a colored thread. Red meant early fruit. Green meant timber. Blue meant “leave for the birds.”',
        textBg:
          'Баба ѝ белязала всяко орехово дърво с цветен конец. Червеното означавало ранен плод. Зеленото — дървесина. Синьото — „остави за птиците“.',
      },
      {
        type: 'pullquote',
        text: 'If you rush the trees, they punish you with empty shells. If you wait, they feed half the village.',
        textBg:
          'Ако притискаш дърветата, те те наказват с празни черупки. Ако почакаш — нахранват половин село.',
        cite: 'Ana-Maria, Varbovo',
        citeBg: 'Ана-Мария, Върбово',
      },
      {
        type: 'paragraph',
        text: 'By mid-morning the stone path is warm underfoot. Neighbors leave empty baskets at her gate without asking — they know she will fill them when the nuts are ready, never before.',
        textBg:
          'По средата на сутринта каменната пътека вече топли стъпалата. Съседите оставят празни кошници пред портата без да питат — знаят, че тя ще ги напълни, когато орехите са готови, никога преди това.',
      },
      {
        type: 'caption',
        text: 'Ana-Maria’s blue threads still hang on three trees behind the old school.',
        textBg:
          'Сините конци на Ана-Мария още висят на три дървета зад старото училище.',
      },
    ],
    endLabel: 'End of Editorial Story',
    endLabelBg: 'Край на редакционния разказ',
  },
  {
    slug: 'letters-from-the-danube-shore',
    sourceId: 'hs2',
    section: 'human-stories',
    path: '/stories/letters-from-the-danube-shore',
    category: 'Human Stories',
    categoryBg: 'Човешки истории',
    title: 'Letters from the Danube Shore',
    titleBg: 'Писма от брега на Дунава',
    subtitle:
      "A fisherman's handwritten journals reveal fifty years of river weather, loss, and quiet joy.",
    subtitleBg:
      'Ръкописните дневници на един рибар разкриват петдесет години речно време, загуба и тиха радост.',
    readTime: '11 min read',
    readTimeBg: '11 мин четене',
    location: 'Vidin',
    locationBg: 'Видин',
    author: 'Inna Gerova',
    authorBg: 'Инна Герова',
    date: 'May 2026',
    dateBg: 'Май 2026',
    image: '/river.jpg',
    photoCredit: 'Photography by PRIZNI Archive',
    photoCreditBg: 'Фотография: Архив PRIZNI',
    body: [
      {
        type: 'paragraph',
        text: 'The notebooks smell of diesel and dried mint. Stacked in a tin box under the bed, they hold fifty years of the Danube written in pencil that sometimes fades into the grain of the paper.',
        textBg:
          'Тетрадките миришат на нафта и сушена мента. Наредени в тенекиена кутия под леглото, те пазят петдесет години Дунав, записани с молив, който понякога избледнява в зърното на хартията.',
      },
      {
        type: 'pullquote',
        text: 'Tuesday. Fog to the Romanian bank. No carp. Good coffee. That is enough.',
        textBg:
          'Вторник. Мъгла до румънския бряг. Няма шаран. Добро кафе. Достатъчно е.',
        cite: 'From the 1978 journal',
        citeBg: 'От дневника от 1978',
      },
      {
        type: 'note',
        label: 'Archive note',
        labelBg: 'Архивна бележка',
        text: 'He never wrote names of living people — only boats, weather, and the dead. Privacy, he said, was the river’s first lesson.',
        textBg:
          'Никога не е писал имена на живи хора — само лодки, време и мъртвите. Поверителността, казваше, е първият урок на реката.',
      },
      {
        type: 'paragraph',
        text: 'We read three winters aloud in his kitchen. Between entries he would stop, listen to a ship horn far away, then continue as if the notebook and the water still shared one language.',
        textBg:
          'Прочетохме три зими на глас в кухнята му. Между записите спираше, слушаше далечен корабен сигнал и после продължаваше сякаш тетрадката и водата още говорят на един език.',
      },
      {
        type: 'caption',
        text: 'Journal page dated 12 March 1983 — “ice broken near the customs house.”',
        textBg:
          'Страница от дневника, 12 март 1983 — „ледът се пукна край митницата“.',
      },
    ],
    endLabel: 'End of Editorial Story',
    endLabelBg: 'Край на редакционния разказ',
  },
  {
    slug: 'the-carpet-that-remembered',
    sourceId: 'hs3',
    section: 'human-stories',
    path: '/stories/the-carpet-that-remembered',
    category: 'Human Stories',
    categoryBg: 'Човешки истории',
    title: 'The Carpet That Remembered',
    titleBg: 'Килимът, който помнеше',
    subtitle:
      'Between every knot of a Chiprovtsi kilim lives a silence older than the village itself.',
    subtitleBg:
      'Между всеки възел на чипровския килим живее тишина, по-стара от самото село.',
    readTime: '9 min read',
    readTimeBg: '9 мин четене',
    location: 'Chiprovtsi',
    locationBg: 'Чипровци',
    author: 'Angelika Petrova',
    authorBg: 'Ангелика Петрова',
    date: 'April 2026',
    dateBg: 'Април 2026',
    image: '/festival.jpg',
    photoCredit: 'Photography by Angelika Petrova',
    photoCreditBg: 'Фотография: Ангелика Петрова',
    body: [
      {
        type: 'paragraph',
        text: 'The loom leans against the north wall where light rarely reaches. That is intentional. Colors keep their honesty in shadow, the weavers say, the way secrets keep their shape in low voices.',
        textBg:
          'Станът е облегнат на северната стена, където рядко стига светлина. Нарочно е. Цветовете запазват честността си в сянката, казват тъкачките, както тайните запазват формата си в тих глас.',
      },
      {
        type: 'note',
        label: 'Craft note',
        labelBg: 'Занаятчийска бележка',
        text: 'A “memory border” is woven only once in a lifetime — usually after a wedding or a burial. No two borders repeat the same geometry.',
        textBg:
          '„Рамка на паметта“ се тъче само веднъж в живота — обикновено след сватба или погребение. Никои две рамки не повтарят една и съща геометрия.',
      },
      {
        type: 'pullquote',
        text: 'I do not invent patterns. I remember them with my hands until they agree to stay.',
        textBg:
          'Аз не измислям мотиви. Помня ги с ръцете си, докато се съгласят да останат.',
        cite: 'Baba Stefka, Chiprovtsi',
        citeBg: 'Баба Стефка, Чипровци',
      },
      {
        type: 'paragraph',
        text: 'By evening the kilim holds the room’s temperature. Guests stop speaking when they enter — not from etiquette, but because the geometry asks for quiet the way a church asks for lowered eyes.',
        textBg:
          'Привечер килимът държи температурата на стаята. Гостите спират да говорят — не от етикет, а защото геометрията иска тишина така, както църквата иска снижени очи.',
      },
      {
        type: 'caption',
        text: 'Detail of a memory border begun in 1961, unfinished until 1994.',
        textBg:
          'Детайл от рамка на паметта, започната през 1961, довършена едва през 1994.',
      },
    ],
    endLabel: 'End of Editorial Story',
    endLabelBg: 'Край на редакционния разказ',
  },
  {
    slug: 'beekeeper-of-the-balkan-edge',
    sourceId: 'hs4',
    section: 'human-stories',
    path: '/stories/beekeeper-of-the-balkan-edge',
    category: 'Human Stories',
    categoryBg: 'Човешки истории',
    title: 'Beekeeper of the Balkan Edge',
    titleBg: 'Пчеларят от края на Балкана',
    subtitle:
      'In wooden hives above the gorge, Georgi measures seasons by the taste of honey, not by calendars.',
    subtitleBg:
      'В дървени кошери над ждрелото Георги мери сезоните по вкуса на меда, не по календара.',
    readTime: '7 min read',
    readTimeBg: '7 мин четене',
    location: 'Vratsa',
    locationBg: 'Враца',
    author: 'Natalia Dimitrova',
    authorBg: 'Наталия Димитрова',
    date: 'August 2026',
    dateBg: 'Август 2026',
    image: '/forest.jpg',
    photoCredit: 'Photography by Natalia Dimitrova',
    photoCreditBg: 'Фотография: Наталия Димитрова',
    body: [
      {
        type: 'paragraph',
        text: 'Georgi climbs before the mist lifts. The path to the hives is a ribbon of chalk dust and thyme. Below him the gorge holds last night’s cold like a borrowed coat.',
        textBg:
          'Георги се качва преди мъглата да се вдигне. Пътеката към кошерите е лента от тебеширен прах и мащерка. Под него ждрелото държи нощния студ като заета дреха.',
      },
      {
        type: 'pullquote',
        text: 'June honey tastes of cliff flowers. September honey tastes of patience.',
        textBg:
          'Юнският мед вкуси на скални цветя. Септемврийският вкуси на търпение.',
        cite: 'Georgi, above Vratsa Pass',
        citeBg: 'Георги, над Врачанския проход',
      },
      {
        type: 'note',
        label: 'Season note',
        labelBg: 'Сезонна бележка',
        text: 'He never harvests after the first mountain fog of autumn — “the bees need a sweet room for winter thoughts.”',
        textBg:
          'Никога не бере след първата есенна планинска мъгла — „пчелите имат нужда от сладка стая за зимни мисли“.',
      },
      {
        type: 'paragraph',
        text: 'Visitors ask for jars. He sells only what fits in two palms. The rest stays for the colony, for neighbors, and for the empty hours when the gorge swallows every human sound.',
        textBg:
          'Гостите искат буркани. Той продава само колкото се побира в две шепи. Останалото е за рояка, за съседите и за празните часове, когато ждрелото гълта всеки човешки звук.',
      },
      {
        type: 'caption',
        text: 'Hive lids weighted with river stones painted with house numbers from his childhood street.',
        textBg:
          'Капаците на кошерите притиснати с речни камъни, изписани с номера от улицата на детството му.',
      },
    ],
    endLabel: 'End of Editorial Story',
    endLabelBg: 'Край на редакционния разказ',
  },
  {
    slug: 'museum-at-dawn',
    sourceId: 'hs5',
    section: 'human-stories',
    path: '/stories/museum-at-dawn',
    category: 'Human Stories',
    categoryBg: 'Човешки истории',
    title: 'The Woman Who Opens the Museum at Dawn',
    titleBg: 'Жената, която отваря музея на разсъмване',
    subtitle:
      'Before visitors arrive, Elena dusts the glass cases and speaks softly to objects nobody else hears.',
    subtitleBg:
      'Преди да дойдат посетителите Елена бърше витрините и тихо говори на предмети, които никой друг не чува.',
    readTime: '10 min read',
    readTimeBg: '10 мин четене',
    location: 'Lom',
    locationBg: 'Лом',
    author: 'Inna Gerova',
    authorBg: 'Инна Герова',
    date: 'March 2026',
    dateBg: 'Март 2026',
    image: '/church.jpg',
    photoCredit: 'Photography by PRIZNI Archive',
    photoCreditBg: 'Фотография: Архив PRIZNI',
    body: [
      {
        type: 'paragraph',
        text: 'Elena’s keys are older than some of the labels. She arrives while the river fog still presses against the museum windows, unlocking rooms in an order that has not changed since 1987.',
        textBg:
          'Ключовете на Елена са по-стари от някои етикети. Идва, докато речната мъгла още притиска прозорците на музея, и отключва стаите в ред, непроменен от 1987.',
      },
      {
        type: 'note',
        label: 'Curator note',
        labelBg: 'Кураторска бележка',
        text: 'Case 14 holds a child’s shoe found in the Danube mud. Elena refuses brighter lighting — “memory should not be interrogated with white LEDs.”',
        textBg:
          'Витрина 14 пази детска обувка, намерена в дунавската кал. Елена отказва по-ярко осветление — „паметта не бива да се разпитва с бели LED-и“.',
      },
      {
        type: 'pullquote',
        text: 'Objects are shy. If you shout their history, they become souvenirs. If you wait, they become neighbors.',
        textBg:
          'Предметите са срамежливи. Ако крещиш историята им, стават сувенири. Ако почакаш — стават съседи.',
        cite: 'Elena, municipal museum of Lom',
        citeBg: 'Елена, общински музей — Лом',
      },
      {
        type: 'paragraph',
        text: 'By nine o’clock she has already walked every corridor twice. School groups will come loud and beloved. Until then the museum belongs to dust motes, floorboards, and the private conversations of glass.',
        textBg:
          'До девет часа вече е обиколила всеки коридор два пъти. Училищните групи ще дойдат шумни и обичани. Дотогава музеят принадлежи на прашинките, дъските на пода и личните разговори на стъклото.',
      },
      {
        type: 'caption',
        text: 'Morning light on Case 14 — shutter speed chosen to keep the fog outside soft.',
        textBg:
          'Сутрешна светлина върху витрина 14 — скорост, избрана да запази меката мъгла навън.',
      },
    ],
    endLabel: 'End of Editorial Story',
    endLabelBg: 'Край на редакционния разказ',
  },
  {
    slug: 'shepherd-songs-belogradchik',
    sourceId: 'hs6',
    section: 'human-stories',
    path: '/stories/shepherd-songs-belogradchik',
    category: 'Human Stories',
    categoryBg: 'Човешки истории',
    title: 'Shepherd Songs Above Belogradchik',
    titleBg: 'Овчарски песни над Белоградчик',
    subtitle:
      'At dusk the rocks hold the echo of a melody older than the fortress below them.',
    subtitleBg:
      'Привечер скалите пазят ехото на мелодия, по-стара от крепостта под тях.',
    readTime: '8 min read',
    readTimeBg: '8 мин четене',
    location: 'Belogradchik',
    locationBg: 'Белоградчик',
    author: 'Albena Nikolova',
    authorBg: 'Албена Николова',
    date: 'July 2026',
    dateBg: 'Юли 2026',
    image: '/mountains.jpg',
    photoCredit: 'Photography by Natalia Dimitrova',
    photoCreditBg: 'Фотография: Наталия Димитрова',
    body: [
      {
        type: 'paragraph',
        text: 'The first notes arrive without ceremony. A single voice from the ridge — thin, certain — and then the rocks answer as if they have been rehearsing since the Ottoman maps were still wet ink.',
        textBg:
          'Първите ноти идват без церемония. Един глас от билото — тънък, сигурен — и после скалите отговарят сякаш репетират от времето, в което османските карти още са били мокро мастило.',
      },
      {
        type: 'pullquote',
        text: 'I do not sing for tourists. I sing so the sheep know the evening still belongs to us.',
        textBg:
          'Не пея за туристи. Пея, за да знаят овцете, че вечерта още е наша.',
        cite: 'Stoyan, shepherd above the rocks',
        citeBg: 'Стоян, овчар над скалите',
      },
      {
        type: 'note',
        label: 'Sound note',
        labelBg: 'Звукова бележка',
        text: 'The echo returns one beat late from the western stone called “The Monk.” Locals time their verses to that delay.',
        textBg:
          'Ехото се връща с една доля закъснение от западната скала, наречена „Монахът“. Местните мереят куплетите по това закъснение.',
      },
      {
        type: 'paragraph',
        text: 'When the song ends, no applause follows — only bells, wind, and a town below turning on its first evening lamps like small cautious stars.',
        textBg:
          'Когато песента свършва, няма аплодисменти — само звънци, вятър и градът долу, който пали първите вечерни лампи като малки предпазливи звезди.',
      },
      {
        type: 'caption',
        text: 'Recorded facing west, 7:52 PM — wind noise left unedited on purpose.',
        textBg:
          'Запис на запад, 19:52 — шумът от вятъра нарочно е оставен.',
      },
    ],
    endLabel: 'End of Editorial Story',
    endLabelBg: 'Край на редакционния разказ',
  },
]

const places: JournalArticle[] = [
  {
    slug: 'belogradchik',
    sourceId: 'belogradchik',
    section: 'places',
    path: '/places/belogradchik',
    category: 'Places',
    categoryBg: 'Места',
    title: 'Belogradchik',
    titleBg: 'Белоградчик',
    subtitle: 'Where red monoliths touch the sky',
    subtitleBg: 'Където червените скали докосват небето',
    readTime: '5 min read',
    readTimeBg: '5 мин четене',
    location: 'Belogradchik',
    locationBg: 'Белоградчик',
    author: 'Albena Nikolova',
    authorBg: 'Албена Николова',
    date: 'Summer 2026',
    dateBg: 'Лято 2026',
    image: '/mountains.jpg',
    photoCredit: 'Photography by PRIZNI Archive',
    photoCreditBg: 'Фотография: Архив PRIZNI',
    body: [
      {
        type: 'paragraph',
        text: 'Formed over 200 million years ago, the Belogradchik Rocks stand as silent sentinels over fortresses, orchards, and the slow gossip of cafés below.',
        textBg:
          'Образувани преди повече от 200 милиона години, Белоградчишките скали стоят като тихи стражи над крепости, градини и бавните приказки на кафенетата долу.',
      },
      {
        type: 'note',
        label: 'Place note',
        labelBg: 'Бележка за мястото',
        text: 'Locals name stones the way other towns name streets — The Rider, The Schoolgirl, The Monastery.',
        textBg:
          'Местните наименуват камъните както другаде се наименуват улици — Конникът, Ученичката, Манастирът.',
      },
      {
        type: 'pullquote',
        text: 'Tourists photograph the rocks. We photograph the shadows between them — that is where the day actually happens.',
        textBg:
          'Туристите снимат скалите. Ние снимаме сенките между тях — там се случва истинският ден.',
        cite: 'Local guide, fortress path',
        citeBg: 'Местен водач, пътека към крепостта',
      },
      {
        type: 'paragraph',
        text: 'At noon the sandstone turns almost soft to the eye. By evening it recovers its severity, and the town remembers it lives beneath something older than language.',
        textBg:
          'По обяд пясъчникът изглежда почти мек. Привечер възвръща строгостта си и градът си спомня, че живее под нещо по-старо от езика.',
      },
      {
        type: 'caption',
        text: 'Western face at golden hour — climb recommended before 8 AM in July.',
        textBg:
          'Западната страна в златния час — изкачване се препоръчва преди 8 сутринта през юли.',
      },
    ],
    endLabel: 'End of Place Portrait',
    endLabelBg: 'Край на портрета на мястото',
  },
  {
    slug: 'varshets',
    sourceId: 'varshets',
    section: 'places',
    path: '/places/varshets',
    category: 'Places',
    categoryBg: 'Места',
    title: 'Varshets',
    titleBg: 'Вършец',
    subtitle: 'The town of health and mineral springs',
    subtitleBg: 'Градът на здравето и минералните извори',
    readTime: '4 min read',
    readTimeBg: '4 мин четене',
    location: 'Varshets',
    locationBg: 'Вършец',
    author: 'Inna Gerova',
    authorBg: 'Инна Герова',
    date: 'Summer 2026',
    dateBg: 'Лято 2026',
    image: '/forest.jpg',
    photoCredit: 'Photography by PRIZNI Archive',
    photoCreditBg: 'Фотография: Архив PRIZNI',
    body: [
      {
        type: 'paragraph',
        text: 'Nestled at the foot of Mount Todorini Kukli, Varshets moves at the pace of mineral water — unhurried, mineral, convinced that healing is a kind of listening.',
        textBg:
          'Сгушен в полите на Тодорини кукли, Вършец се движи с темпото на минералната вода — бавно, минерално, убеден, че лечението е вид слушане.',
      },
      {
        type: 'note',
        label: 'Spring note',
        labelBg: 'Бележка от извора',
        text: 'The oldest drinking fountain still carries a brass cup on a chain. Nobody steals it. That is the town’s quiet boast.',
        textBg:
          'Най-старият чешма още държи месингова чаша на верижка. Никой не я краде. Това е тихата гордост на града.',
      },
      {
        type: 'pullquote',
        text: 'People come for joints and leave with slower mornings. That is the real cure.',
        textBg:
          'Идват заради ставите и си тръгват с по-бавни сутрини. Това е истинското лечение.',
        cite: 'Spa attendant, central park',
        citeBg: 'Бански служител, централен парк',
      },
      {
        type: 'paragraph',
        text: 'The beech alley holds coolness even in August. Couples walk without phones. The water keeps whispering under iron grates like a secret that refuses to age.',
        textBg:
          'Буковата алея държи хлад дори през август. Двойки вървят без телефони. Водата шепне под железните решетки като тайна, която отказва да остарее.',
      },
      {
        type: 'caption',
        text: 'Beech alley, 6:10 AM — steam rising from the open spring house.',
        textBg:
          'Букова алея, 6:10 — пара над откритата сграда на извора.',
      },
    ],
    endLabel: 'End of Place Portrait',
    endLabelBg: 'Край на портрета на мястото',
  },
  {
    slug: 'chiprovtsi',
    sourceId: 'chiprovtsi',
    section: 'places',
    path: '/places/chiprovtsi',
    category: 'Places',
    categoryBg: 'Места',
    title: 'Chiprovtsi',
    titleBg: 'Чипровци',
    subtitle: 'Sanctuary of sacred woven kilims',
    subtitleBg: 'Светилището на чипровския килим',
    readTime: '6 min read',
    readTimeBg: '6 мин четене',
    location: 'Chiprovtsi',
    locationBg: 'Чипровци',
    author: 'Angelika Petrova',
    authorBg: 'Ангелика Петрова',
    date: 'Summer 2026',
    dateBg: 'Лято 2026',
    image: '/craftsman.jpg',
    photoCredit: 'Photography by Angelika Petrova',
    photoCreditBg: 'Фотография: Ангелика Петрова',
    body: [
      {
        type: 'paragraph',
        text: 'Chiprovtsi holds its history in tensioned warp threads. UNESCO plaques sit politely near doorways, but the real authority still belongs to looms and low voices.',
        textBg:
          'Чипровци държи историята си в опънати нишки на основата. Табелите на ЮНЕСКО стоят учтиво край вратите, но истинската власт още принадлежи на становете и тихите гласове.',
      },
      {
        type: 'pullquote',
        text: 'A town that weaves cannot forget easily. Pattern is a form of stubborn memory.',
        textBg:
          'Град, който тъче, не забравя лесно. Мотивът е форма на упорита памет.',
        cite: 'Museum volunteer',
        citeBg: 'Доброволец в музея',
      },
      {
        type: 'note',
        label: 'Town note',
        labelBg: 'Градска бележка',
        text: 'On market days the smell of wool oil mixes with roasted peppers — the scent locals use to mark “home” when they return from Sofia.',
        textBg:
          'В пазарни дни миризмата на вълнено масло се смесва с печени чушки — ароматът, с който местните познават „вкъщи“, когато се връщат от София.',
      },
      {
        type: 'paragraph',
        text: 'Walk the upper street at dusk and windows glow amber above unfinished carpets. Children learn geometry before they learn capitals.',
        textBg:
          'Разходете се по горната улица привечер и прозорците светят кехлибарено над недовършени килими. Децата учат геометрия преди главните градове.',
      },
      {
        type: 'caption',
        text: 'Workshop interior with afternoon warp light.',
        textBg: 'Интериор на работилница с следобедна светлина по основата.',
      },
    ],
    endLabel: 'End of Place Portrait',
    endLabelBg: 'Край на портрета на мястото',
  },
  {
    slug: 'vratsa-pass',
    sourceId: 'vratsa-pass',
    section: 'places',
    path: '/places/vratsa-pass',
    category: 'Places',
    categoryBg: 'Места',
    title: 'Vratsa Pass',
    titleBg: 'Врачански Балкан',
    subtitle: 'Dramatic gorge and ancient trails',
    subtitleBg: 'Величествено ждрело и древни пътеки',
    readTime: '7 min read',
    readTimeBg: '7 мин четене',
    location: 'Vratsa Balkan',
    locationBg: 'Врачански Балкан',
    author: 'Natalia Dimitrova',
    authorBg: 'Наталия Димитрова',
    date: 'Summer 2026',
    dateBg: 'Лято 2026',
    image: '/village.jpg',
    photoCredit: 'Photography by Natalia Dimitrova',
    photoCreditBg: 'Фотография: Наталия Димитрова',
    body: [
      {
        type: 'paragraph',
        text: 'Sheer three-hundred-meter cliffs frame the entrance to the Balkan like an unfinished cathedral. Wind writes one sentence all day and erases it by night.',
        textBg:
          'Тристаметрови отвесни скали оформят входа към Балкана като недостроен събор. Вятърът пише едно изречение цял ден и го заличава през нощта.',
      },
      {
        type: 'note',
        label: 'Trail note',
        labelBg: 'Бележка от пътеката',
        text: 'Shepherds still use the upper contour path when fog fills the gorge — “better wet boots than wrong gods below.”',
        textBg:
          'Овчарите още ползват горния контур, когато мъглата пълни ждрелото — „по-добре мокри обувки, отколкото грешни богове долу“.',
      },
      {
        type: 'pullquote',
        text: 'The gorge does not welcome you. It simply allows you — and that is enough honor.',
        textBg:
          'Ждрелото не те посреща. Просто ти позволява — и това е достатъчна чест.',
        cite: 'Mountaineer from Vratsa',
        citeBg: 'Планинар от Враца',
      },
      {
        type: 'paragraph',
        text: 'At the narrowest bend, phone signal dies and conversation improves. Birds keep the only schedule that still matters.',
        textBg:
          'В най-тесния завой телефонният сигнал умира и разговорите се подобряват. Птиците пазят единствения график, който още има значение.',
      },
      {
        type: 'caption',
        text: 'Looking south from the rope bridge platform after rain.',
        textBg: 'Поглед на юг от площадката при въжения мост след дъжд.',
      },
    ],
    endLabel: 'End of Place Portrait',
    endLabelBg: 'Край на портрета на мястото',
  },
]

const traditions: JournalArticle[] = [
  {
    slug: 'traditional-bread',
    sourceId: 't1',
    section: 'traditions',
    path: '/traditions/traditional-bread',
    category: 'Traditions',
    categoryBg: 'Традиции',
    title: 'Traditional Bread',
    titleBg: 'Хляб & Квас',
    subtitle: 'The sacred hearth ritual',
    subtitleBg: 'Свещеният ритуал на огнището',
    readTime: '6 min read',
    readTimeBg: '6 мин четене',
    location: 'Northwest villages',
    locationBg: 'Села в Северозапада',
    author: 'Angelika Petrova',
    authorBg: 'Ангелика Петрова',
    date: 'Autumn 2026',
    dateBg: 'Есен 2026',
    image: '/bread.jpg',
    photoCredit: 'Photography by PRIZNI Archive',
    photoCreditBg: 'Фотография: Архив PRIZNI',
    body: [
      {
        type: 'paragraph',
        text: 'Baking sourdough in stone ovens is less a recipe than a conversation with heat. Three generations pass the same clay jar of starter like a quiet inheritance.',
        textBg:
          'Печенето на квасен хляб в каменна пещ е по-скоро разговор с жарта, отколкото рецепта. Три поколения предават същия глинен буркан със закваска като тихо наследство.',
      },
      {
        type: 'note',
        label: 'Kitchen note',
        labelBg: 'Кухненска бележка',
        text: 'Never thank the starter out loud on baking day — “praise makes it lazy,” say the eldest bakers.',
        textBg:
          'Никога не хвали закваската на глас в деня на печене — „похвалата я прави мързелива“, казват най-възрастните.',
      },
      {
        type: 'pullquote',
        text: 'Bread that rises too fast has nothing to tell you. Wait for the slow crumb.',
        textBg:
          'Хляб, който втасва твърде бързо, няма какво да ти каже. Изчакай бавната средина.',
        cite: 'Baba Radka, village oven',
        citeBg: 'Баба Радка, селска пещ',
      },
      {
        type: 'paragraph',
        text: 'When the loaf leaves the peel, neighbors appear without invitation. Steam becomes an announcement more reliable than any church bell.',
        textBg:
          'Когато хлябът напусне лопатата, съседите се появяват без покана. Парата става известне, по-надеждно от всяка камбана.',
      },
      {
        type: 'caption',
        text: 'Scoring pattern used for feast days — three lines for guests, one for the house.',
        textBg:
          'Нарязване за празнични дни — три линии за гостите, една за къщата.',
      },
    ],
    endLabel: 'End of Tradition Story',
    endLabelBg: 'Край на разказа за традицията',
  },
  {
    slug: 'wedding-customs',
    sourceId: 't2',
    section: 'traditions',
    path: '/traditions/wedding-customs',
    category: 'Traditions',
    categoryBg: 'Традиции',
    title: 'Wedding Customs',
    titleBg: 'Сватбени обичаи',
    subtitle: 'Rituals of union on the Danubian plain',
    subtitleBg: 'Ритуали на съюза в Дунавската равнина',
    readTime: '7 min read',
    readTimeBg: '7 мин четене',
    location: 'Danubian plain',
    locationBg: 'Дунавска равнина',
    author: 'Inna Gerova',
    authorBg: 'Инна Герова',
    date: 'Spring 2026',
    dateBg: 'Пролет 2026',
    image: '/festival.jpg',
    photoCredit: 'Photography by PRIZNI Archive',
    photoCreditBg: 'Фотография: Архив PRIZNI',
    body: [
      {
        type: 'paragraph',
        text: 'Uneven brass rhythms announce a wedding long before the cars arrive. On the plain, love is public music first and private vow second.',
        textBg:
          'Неравноделните медни ритми съобщават за сватба много преди колите. В равнината любовта е първо публична музика и едва после частен обет.',
      },
      {
        type: 'pullquote',
        text: 'If the bread breaks clean, the house will argue gently. If it crumbles, buy extra wine.',
        textBg:
          'Ако хлябът се счупи чисто, къщата ще спори меко. Ако се рони — купете още вино.',
        cite: 'Wedding auntie, riverside village',
        citeBg: 'Сватбена леля, крайдунавско село',
      },
      {
        type: 'note',
        label: 'Ritual note',
        labelBg: 'Ритуална бележка',
        text: 'The mother-in-law still hides a silver coin in the bride’s right shoe — practical luck for markets and hard winters.',
        textBg:
          'Свекървата още слага сребърна монета в дясната обувка на булката — практичен късмет за пазари и тежки зими.',
      },
      {
        type: 'paragraph',
        text: 'By midnight the brass band knows everyone’s secrets. Dancers shed jackets. Dust rises like soft gold under borrowed light.',
        textBg:
          'Към полунощ духовата музика знае тайните на всички. Танцьорите събличат якета. Прахът се вдига като меко злато под заета светлина.',
      },
      {
        type: 'caption',
        text: 'Bride’s coin ritual photographed with consent, 11:20 PM.',
        textBg:
          'Ритуалът с монетата — със съгласие, 23:20.',
      },
    ],
    endLabel: 'End of Tradition Story',
    endLabelBg: 'Край на разказа за традицията',
  },
  {
    slug: 'harvest',
    sourceId: 't3',
    section: 'traditions',
    path: '/traditions/harvest',
    category: 'Traditions',
    categoryBg: 'Традиции',
    title: 'Harvest',
    titleBg: 'Жътва в Равнината',
    subtitle: 'Golden fields of summer',
    subtitleBg: 'Златни полета на лятото',
    readTime: '5 min read',
    readTimeBg: '5 мин четене',
    location: 'Fertile plain',
    locationBg: 'Плодородната равнина',
    author: 'Albena Nikolova',
    authorBg: 'Албена Николова',
    date: 'August 2026',
    dateBg: 'Август 2026',
    image: '/river.jpg',
    photoCredit: 'Photography by PRIZNI Archive',
    photoCreditBg: 'Фотография: Архив PRIZNI',
    body: [
      {
        type: 'paragraph',
        text: 'Community harvest still gathers cousins who argue about weather and forgive each other over salted tomatoes.',
        textBg:
          'Общата жътва още събира братовчеди, които спорят за времето и се сдобряват над осолени домати.',
      },
      {
        type: 'note',
        label: 'Field note',
        labelBg: 'Полска бележка',
        text: 'The first cut wheat is never sold — it becomes home bread and gifts for those who cannot stand long in the sun.',
        textBg:
          'Първата отрязана пшеница никога не се продава — става домашен хляб и дар за онези, които не могат дълго да стоят на слънце.',
      },
      {
        type: 'pullquote',
        text: 'Machines take the weight. People still take the meaning.',
        textBg:
          'Машините взимат тежестта. Хората още взимат смисъла.',
        cite: 'Combine driver, third generation',
        citeBg: 'Комбайнер, трето поколение',
      },
      {
        type: 'paragraph',
        text: 'When the light turns copper, work slows into storytelling. Children chase grasshoppers. Elders count years by how the straw smelled.',
        textBg:
          'Когато светлината стане медна, работата се забавя до разкази. Деца гонят скакалци. Възрастните броят годините по миризмата на сламата.',
      },
      {
        type: 'caption',
        text: 'Last wagon leaving the field — sunflower horizon behind.',
        textBg:
          'Последната каруца напуска нивата — слънчогледов хоризонт отзад.',
      },
    ],
    endLabel: 'End of Tradition Story',
    endLabelBg: 'Край на разказа за традицията',
  },
  {
    slug: 'chiprovtsi-kilims',
    sourceId: 't4',
    section: 'traditions',
    path: '/traditions/chiprovtsi-kilims',
    category: 'Traditions',
    categoryBg: 'Традиции',
    title: 'Chiprovtsi Kilims',
    titleBg: 'Чипровски килими',
    subtitle: 'Sacred woven geometry',
    subtitleBg: 'Свещена тъкана геометрия',
    readTime: '8 min read',
    readTimeBg: '8 мин четене',
    location: 'Chiprovtsi',
    locationBg: 'Чипровци',
    author: 'Angelika Petrova',
    authorBg: 'Ангелика Петрова',
    date: 'May 2026',
    dateBg: 'Май 2026',
    image: '/craftsman.jpg',
    photoCredit: 'Photography by Angelika Petrova',
    photoCreditBg: 'Фотография: Ангелика Петрова',
    body: [
      {
        type: 'paragraph',
        text: 'Every knot carries prayer, memory, and mountain silence. UNESCO recognition framed the craft; the craft still frames the people.',
        textBg:
          'Всеки възел носи молитва, памет и планинска тишина. Признанието на ЮНЕСКО е рамкирало занаята; занаятът още рамкира хората.',
      },
      {
        type: 'pullquote',
        text: 'Geometry is our alphabet when words feel too modern.',
        textBg:
          'Геометрията е нашата азбука, когато думите звучат твърде съвременно.',
        cite: 'Master weaver',
        citeBg: 'Майстор тъкач',
      },
      {
        type: 'note',
        label: 'Pattern note',
        labelBg: 'Бележка за мотива',
        text: 'The “makaz” motif is never gifted to strangers on first meeting — trust must be woven first.',
        textBg:
          'Мотивът „маказ“ никога не се подарява на непознати при първа среща — доверието се тъче първо.',
      },
      {
        type: 'paragraph',
        text: 'Workshops smell of wool and rain-damp wood. Apprentices count quietly. The oldest looms refuse electric light after dusk.',
        textBg:
          'Работилниците миришат на вълна и влажно от дъжд дърво. Чираците броят тихо. Най-старите станове отказват електрическа светлина след здрач.',
      },
      {
        type: 'caption',
        text: 'Makaz detail under north window light.',
        textBg: 'Детайл „маказ“ при северна светлина.',
      },
    ],
    endLabel: 'End of Tradition Story',
    endLabelBg: 'Край на разказа за традицията',
  },
  {
    slug: 'herb-gathering',
    sourceId: 't5',
    section: 'traditions',
    path: '/traditions/herb-gathering',
    category: 'Traditions',
    categoryBg: 'Традиции',
    title: 'Herb Gathering',
    titleBg: 'Бране на билки',
    subtitle: 'Mountain pharmacy at dawn',
    subtitleBg: 'Планинска аптека на зори',
    readTime: '5 min read',
    readTimeBg: '5 мин четене',
    location: 'Balkan slopes',
    locationBg: 'Склоновете на Балкана',
    author: 'Natalia Dimitrova',
    authorBg: 'Наталия Димитрова',
    date: 'June 2026',
    dateBg: 'Юни 2026',
    image: '/forest.jpg',
    photoCredit: 'Photography by Natalia Dimitrova',
    photoCreditBg: 'Фотография: Наталия Димитрова',
    body: [
      {
        type: 'paragraph',
        text: 'Dawn rituals of collecting thyme, linden, and wild roses still keep certain slopes mapped better than any official trail.',
        textBg:
          'Зорните ритуали по бране на мащерка, липа и шипка още пазят някои склонове по-добре картографирани от всяка официална пътека.',
      },
      {
        type: 'note',
        label: 'Gathering note',
        labelBg: 'Бележка от брането',
        text: 'Never take the first plant you see. Leave it as a thank-you so the slope keeps opening.',
        textBg:
          'Никога не взимай първото растение, което видиш. Остави го като благодаря, за да продължи склонът да се отваря.',
      },
      {
        type: 'pullquote',
        text: 'Pharmacy is not a building. It is a morning with a cloth bag and clean hands.',
        textBg:
          'Аптеката не е сграда. Тя е сутрин с платнена торба и чисти ръце.',
        cite: 'Herbalist from Varshets',
        citeBg: 'Билкарица от Вършец',
      },
      {
        type: 'paragraph',
        text: 'Bundles hang from kitchen beams like green calendars. Winters are measured in jars of tea already promised to neighbors.',
        textBg:
          'Връзките висят на кухненски греди като зелени календари. Зимите се мерят в буркани чай, вече обещани на съседи.',
      },
      {
        type: 'caption',
        text: 'Thyme bundles drying above a wood stove.',
        textBg: 'Връзки мащерка сушат се над печка на дърва.',
      },
    ],
    endLabel: 'End of Tradition Story',
    endLabelBg: 'Край на разказа за традицията',
  },
  {
    slug: 'st-georges-day',
    sourceId: 't6',
    section: 'traditions',
    path: '/traditions/st-georges-day',
    category: 'Traditions',
    categoryBg: 'Традиции',
    title: "St. George's Day",
    titleBg: 'Гергьовден',
    subtitle: "Spring's first feast",
    subtitleBg: 'Първият пролетен празник',
    readTime: '6 min read',
    readTimeBg: '6 мин четене',
    location: 'Northwest pastures',
    locationBg: 'Пасища в Северозапада',
    author: 'Albena Nikolova',
    authorBg: 'Албена Николова',
    date: 'May 2026',
    dateBg: 'Май 2026',
    image: '/mountains.jpg',
    photoCredit: 'Photography by PRIZNI Archive',
    photoCreditBg: 'Фотография: Архив PRIZNI',
    body: [
      {
        type: 'paragraph',
        text: 'Lamb, fresh milk, and green wreaths mark the turning of the pastoral year. The feast smells of smoke and new grass.',
        textBg:
          'Агне, прясно мляко и зелени венци бележат обръщането на пастирската година. Празникът мирише на дим и нова трева.',
      },
      {
        type: 'pullquote',
        text: 'St. George does not ask for perfection. He asks that the flock and the table both feel watched over.',
        textBg:
          'Свети Георги не иска съвършенство. Иска стадото и трапезата да се чувстват пазени.',
        cite: 'Village priest',
        citeBg: 'Селски свещеник',
      },
      {
        type: 'note',
        label: 'Feast note',
        labelBg: 'Празнична бележка',
        text: 'Wreaths of nettle and geranium hang on doors until the first thunderstorm “carries envy away.”',
        textBg:
          'Венци от коприва и здравец стоят на вратите до първата буря, която „отнася завистта“.',
      },
      {
        type: 'paragraph',
        text: 'Children race with paper icons. Elders toast quietly. Somewhere a radio plays both folk and football without conflict.',
        textBg:
          'Деца се надбягват с хартиени икони. Възрастните вдигат чаши тихо. Някъде радио пуска и народна, и футбол без конфликт.',
      },
      {
        type: 'caption',
        text: 'Wreath on a blue gate — morning of May 6.',
        textBg: 'Венец на синя порта — сутринта на 6 май.',
      },
    ],
    endLabel: 'End of Tradition Story',
    endLabelBg: 'Край на разказа за традицията',
  },
]

/** All mock articles ready for future `/section/slug` pages. */
export const journalArticles: JournalArticle[] = [
  featured,
  ...humanStories,
  ...places,
  ...traditions,
  ...discoverArticles,
  ...voiceArticles,
  ...sportsArticles,
  ...eventsArticles,
  ...videoArticles,
  ...campaignArticles,
]

export function getArticleBySlug(slug: string): JournalArticle | undefined {
  return journalArticles.find((article) => article.slug === slug)
}

export function getArticleByPath(path: string): JournalArticle | undefined {
  return journalArticles.find((article) => article.path === path)
}

export function getArticlesBySection(
  section: JournalArticle['section'],
): JournalArticle[] {
  return journalArticles.filter((article) => article.section === section)
}

export function getArticleBySourceId(
  sourceId: string,
): JournalArticle | undefined {
  return journalArticles.find((article) => article.sourceId === sourceId)
}
