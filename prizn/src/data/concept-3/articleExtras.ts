import type { JournalArticle } from '@/data/concept-3/articleTypes'

/** Discover collection long-reads (same editorial layout, different notes). */
export const discoverArticles: JournalArticle[] = [
  {
    slug: 'spring-traditions',
    sourceId: 'spring-traditions',
    section: 'discover',
    path: '/discover/spring-traditions',
    category: 'Discover',
    categoryBg: 'Открийте',
    title: 'Spring Traditions',
    titleBg: 'Пролетни традиции',
    subtitle:
      'Awakening of the earth, ritual breads, and ancient rites of rebirth in mountain settlements.',
    subtitleBg:
      'Събуждане на земята, обредни хлябове и древни ритуали на прераждане в планинските селища.',
    readTime: '9 min read',
    readTimeBg: '9 мин четене',
    location: 'Mountain settlements',
    locationBg: 'Планински селища',
    author: 'Albena Nikolova',
    authorBg: 'Албена Николова',
    date: 'Spring Edition 2026',
    dateBg: 'Пролетно издание 2026',
    image: '/festival.jpg',
    photoCredit: 'Photography by PRIZNI Archive',
    photoCreditBg: 'Фотография: Архив PRIZNI',
    body: [
      {
        type: 'paragraph',
        text: 'Spring does not arrive politely in the Northwest. It arrives as yeast, green wreaths, and roads suddenly soft enough for gossip to travel faster than cars.',
        textBg:
          'Пролетта не идва учтиво в Северозапада. Идва като квас, зелени венци и пътища, внезапно меки достатъчно, че клюките да пътуват по-бързо от колите.',
      },
      {
        type: 'note',
        label: 'Collection note',
        labelBg: 'Бележка към колекцията',
        text: 'This cluster gathers six field pieces — bread days, first pasture blessing, and the quiet return of market songs.',
        textBg:
          'Тази колекция събира шест теренни текста — дни на хляба, първата благословия на пашата и тихото завръщане на пазарните песни.',
      },
      {
        type: 'pullquote',
        text: 'Winter teaches patience. Spring teaches appetite — for salt, for sun, for one another.',
        textBg:
          'Зимата учи на търпение. Пролетта учи на апетит — за сол, за слънце, един за друг.',
        cite: 'Editor’s frame for Spring Traditions',
        citeBg: 'Редакторска рамка за „Пролетни традиции“',
      },
      {
        type: 'paragraph',
        text: 'Walk any village square after the first warm Thursday and you will find flour on aprons and news exchanged like seed packets.',
        textBg:
          'Разходете се по който и да е селски площад след първия топъл четвъртък и ще видите брашно по престилки и новини, разменяни като пакетчета семена.',
      },
      {
        type: 'caption',
        text: 'Opening image for the collection — feast table before guests sit.',
        textBg:
          'Начална снимка на колекцията — празнична маса преди гостите да седнат.',
      },
    ],
    endLabel: 'End of Collection Intro',
    endLabelBg: 'Край на увода към колекцията',
  },
  {
    slug: 'mountain-villages',
    sourceId: 'mountain-villages',
    section: 'discover',
    path: '/discover/mountain-villages',
    category: 'Discover',
    categoryBg: 'Открийте',
    title: 'Mountain Villages',
    titleBg: 'Планински села',
    subtitle:
      'Stone roofs, silent valleys, and life tucked high above the clouds in Vratsa Balkan.',
    subtitleBg:
      'Каменни покриви, тихи долини и живот, сгушен високо над облаците във Врачанския Балкан.',
    readTime: '10 min read',
    readTimeBg: '10 мин четене',
    location: 'Vratsa Balkan',
    locationBg: 'Врачански Балкан',
    author: 'Natalia Dimitrova',
    authorBg: 'Наталия Димитрова',
    date: 'Summer Edition 2026',
    dateBg: 'Лятно издание 2026',
    image: '/mountains.jpg',
    photoCredit: 'Photography by Natalia Dimitrova',
    photoCreditBg: 'Фотография: Наталия Димитрова',
    body: [
      {
        type: 'paragraph',
        text: 'High villages keep time by chimney smoke. When it rises straight, the day will be honest. When it leans, bring a second sweater and fewer plans.',
        textBg:
          'Високите села мерят времето по дима от комини. Когато върви право — денят ще е честен. Когато се накланя — вземи втора жилетка и по-малко планове.',
      },
      {
        type: 'note',
        label: 'Collection note',
        labelBg: 'Бележка към колекцията',
        text: 'Eight stories map kitchens, goat paths, and the ethics of borrowing sugar across stone walls.',
        textBg:
          'Осем истории картографират кухни, кози пътеки и етиката на заемането на захар през каменни зидове.',
      },
      {
        type: 'pullquote',
        text: 'Altitude is not scenery. It is a grammar for how people care for each other.',
        textBg:
          'Надморската височина не е пейзаж. Тя е граматика за това как хората се грижат един за друг.',
        cite: 'Editor’s frame for Mountain Villages',
        citeBg: 'Редакторска рамка за „Планински села“',
      },
      {
        type: 'paragraph',
        text: 'Roofs grow moss like medals. Children learn slope before they learn streetlights. Guests are measured by whether they close the gate properly.',
        textBg:
          'Покривите растият мъх като медали. Децата учат наклон преди улични лампи. Гостите се мерят по това дали затварят портата както трябва.',
      },
      {
        type: 'caption',
        text: 'Stone roofs after rain — valley fog still below.',
        textBg: 'Каменни покриви след дъжд — долинната мъгла още е долу.',
      },
    ],
    endLabel: 'End of Collection Intro',
    endLabelBg: 'Край на увода към колекцията',
  },
  {
    slug: 'danube-stories',
    sourceId: 'danube-stories',
    section: 'discover',
    path: '/discover/danube-stories',
    category: 'Discover',
    categoryBg: 'Открийте',
    title: 'Danube Stories',
    titleBg: 'Дунавски истории',
    subtitle:
      'Old wooden boats, morning river mist, and fishermen tales from Vidin to Lom.',
    subtitleBg:
      'Стари дървени лодки, сутрешна речна мъгла и рибарски истории от Видин до Лом.',
    readTime: '8 min read',
    readTimeBg: '8 мин четене',
    location: 'Vidin to Lom',
    locationBg: 'От Видин до Лом',
    author: 'Inna Gerova',
    authorBg: 'Инна Герова',
    date: 'Summer Edition 2026',
    dateBg: 'Лятно издание 2026',
    image: '/river.jpg',
    photoCredit: 'Photography by PRIZNI Archive',
    photoCreditBg: 'Фотография: Архив PRIZNI',
    body: [
      {
        type: 'paragraph',
        text: 'The river refuses to be only a border. It remains a hallway of mist, boats, and stories that pretend they are only about fish.',
        textBg:
          'Реката отказва да бъде само граница. Остава коридор от мъгла, лодки и истории, които се преструват, че са само за риба.',
      },
      {
        type: 'note',
        label: 'Collection note',
        labelBg: 'Бележка към колекцията',
        text: 'Five pieces follow journals, ferry coffee, and the etiquette of borrowing oars.',
        textBg:
          'Пет текста следват дневници, кафе на ферибота и етикета при заемане на весла.',
      },
      {
        type: 'pullquote',
        text: 'If you listen only for big news, the Danube will sound empty. Listen for small weather instead.',
        textBg:
          'Ако слушаш само за големи новини, Дунавът ще звучи празен. Слушай по-скоро за малкото време.',
        cite: 'Editor’s frame for Danube Stories',
        citeBg: 'Редакторска рамка за „Дунавски истории“',
      },
      {
        type: 'paragraph',
        text: 'From Vidin’s early whistles to Lom’s late bells, the shoreline keeps a calendar written in footprints that wash away by noon.',
        textBg:
          'От ранните свирки на Видин до късните камбани на Лом брегът пази календар, написан със стъпки, които до обяд се отмиват.',
      },
      {
        type: 'caption',
        text: 'Morning mist near the ferry slip.',
        textBg: 'Сутрешна мъгла край фериботното пристанище.',
      },
    ],
    endLabel: 'End of Collection Intro',
    endLabelBg: 'Край на увода към колекцията',
  },
  {
    slug: 'crafts',
    sourceId: 'crafts',
    section: 'discover',
    path: '/discover/crafts',
    category: 'Discover',
    categoryBg: 'Открийте',
    title: 'Crafts & Mastery',
    titleBg: 'Занаяти & Майсторство',
    subtitle:
      'Hands that shape clay, weave sacred kilims, and preserve centuries of ancestral skill.',
    subtitleBg:
      'Ръце, които оформят глина, тъкат свещени килими и пазят векове наследствено умение.',
    readTime: '9 min read',
    readTimeBg: '9 мин четене',
    location: 'Workshops of the Northwest',
    locationBg: 'Работилници на Северозапада',
    author: 'Angelika Petrova',
    authorBg: 'Ангелика Петрова',
    date: 'Summer Edition 2026',
    dateBg: 'Лятно издание 2026',
    image: '/craftsman.jpg',
    photoCredit: 'Photography by Angelika Petrova',
    photoCreditBg: 'Фотография: Ангелика Петрова',
    body: [
      {
        type: 'paragraph',
        text: 'Mastery here is rarely loud. It is the patience of thumbs, the honesty of clay, and looms that outlive political seasons.',
        textBg:
          'Майсторството тук рядко е шумно. То е търпението на палците, честността на глината и станове, които надживяват политически сезони.',
      },
      {
        type: 'note',
        label: 'Collection note',
        labelBg: 'Бележка към колекцията',
        text: 'Seven essays sit with potters, weavers, and knife makers who still price work by daylight hours.',
        textBg:
          'Седем есета сядат при грънчари, тъкачи и ножари, които още ценят труда по часовете светлина.',
      },
      {
        type: 'pullquote',
        text: 'A craft dies when young hands are treated as decoration. Teach them to tire properly.',
        textBg:
          'Занаятът умира, когато младите ръце се третират като украса. Научете ги да се уморяват правилно.',
        cite: 'Editor’s frame for Crafts & Mastery',
        citeBg: 'Редакторска рамка за „Занаяти & Майсторство“',
      },
      {
        type: 'paragraph',
        text: 'In every workshop a radio murmurs and a saint’s card watches from a nail. Between them, skill stays almost shy.',
        textBg:
          'Във всяка работилница мърмори радио и картичка на светец гледа от пирон. Между тях умението остава почти срамежливо.',
      },
      {
        type: 'caption',
        text: 'Clay-stained hands between batches.',
        textBg: 'Ръце с глина между две партиди.',
      },
    ],
    endLabel: 'End of Collection Intro',
    endLabelBg: 'Край на увода към колекцията',
  },
  {
    slug: 'hidden-places',
    sourceId: 'hidden-places',
    section: 'discover',
    path: '/discover/hidden-places',
    category: 'Discover',
    categoryBg: 'Открийте',
    title: 'Hidden Places',
    titleBg: 'Скрити кътчета',
    subtitle:
      'Forgotten chapels, secret waterfalls, and quiet sanctuaries in the heart of nature.',
    subtitleBg:
      'Забравени параклиси, тайни водопади и тихи светилища в сърцето на природата.',
    readTime: '8 min read',
    readTimeBg: '8 мин четене',
    location: 'Off-map Northwest',
    locationBg: 'Извън картата на Северозапада',
    author: 'Natalia Dimitrova',
    authorBg: 'Наталия Димитрова',
    date: 'Summer Edition 2026',
    dateBg: 'Лятно издание 2026',
    image: '/church.jpg',
    photoCredit: 'Photography by Natalia Dimitrova',
    photoCreditBg: 'Фотография: Наталия Димитрова',
    body: [
      {
        type: 'paragraph',
        text: 'Some places refuse signage. They ask for a local uncle, a wrong turn forgiven, and the humility to leave no louder trace than footprints.',
        textBg:
          'Някои места отказват табели. Искат местен чичо, простена грешна отбивка и смирение да не оставиш по-силен след от стъпките си.',
      },
      {
        type: 'note',
        label: 'Collection note',
        labelBg: 'Бележка към колекцията',
        text: 'Nine short guides share coordinates only as stories — on purpose.',
        textBg:
          'Девет кратки гида споделят координати само като разкази — нарочно.',
      },
      {
        type: 'pullquote',
        text: 'Hidden does not mean abandoned. It means loved carefully.',
        textBg:
          'Скрито не означава изоставено. Означава обичано внимателно.',
        cite: 'Editor’s frame for Hidden Places',
        citeBg: 'Редакторска рамка за „Скрити кътчета“',
      },
      {
        type: 'paragraph',
        text: 'Chapels keep candles. Waterfalls keep jokes about tourists. Both keep a silence that improves whoever enters it slowly.',
        textBg:
          'Параклисите пазят свещи. Водопадите пазят шеги за туристи. И двете пазят тишина, която подобрява всеки, който влиза бавно.',
      },
      {
        type: 'caption',
        text: 'Chapel door ajar after liturgy.',
        textBg: 'Врата на параклис, леко отворена след литургия.',
      },
    ],
    endLabel: 'End of Collection Intro',
    endLabelBg: 'Край на увода към колекцията',
  },
]

/** Voices — same page style, with speaker + optional audio fields. */
export const voiceArticles: JournalArticle[] = [
  {
    slug: 'last-weaver-chiprovtsi',
    sourceId: 'v1',
    section: 'voices',
    path: '/voices/last-weaver-chiprovtsi',
    category: 'Voices',
    categoryBg: 'Гласове',
    title: 'The Last Weaver of Chiprovtsi',
    titleBg: 'Гласът на последната тъкачка',
    subtitle:
      'When I sit at the loom, time disappears. My hands remember patterns my eyes cannot see.',
    subtitleBg:
      'Когато седна на стана, времето изчезва. Ръцете ми помнят мотиви, които очите вече не виждат.',
    readTime: '6 min listen',
    readTimeBg: '6 мин слушане',
    location: 'Chiprovtsi',
    locationBg: 'Чипровци',
    author: 'PRIZNI Audio Desk',
    authorBg: 'Аудио редакция PRIZNI',
    speaker: 'Baba Stefka (84 yrs)',
    speakerBg: 'Баба Стефка (84 г.)',
    date: 'Field recording 2026',
    dateBg: 'Полеви запис 2026',
    image: '/woman.jpg',
    photoCredit: 'Photography by PRIZNI Archive',
    photoCreditBg: 'Фотография: Архив PRIZNI',
    audioUrl: 'https://actions.google.com/sounds/v1/ambiences/forest_wind.ogg',
    audioDuration: '6 min',
    body: [
      {
        type: 'paragraph',
        text: 'We record in the room where the loom has always lived. Outside, a dog answers another dog. Inside, Stefka’s hands begin before her sentences do.',
        textBg:
          'Записваме в стаята, където станът винаги е живял. Навън куче отговаря на друго куче. Вътре ръцете на Стефка започват преди изреченията ѝ.',
      },
      {
        type: 'note',
        label: 'Audio note',
        labelBg: 'Аудио бележка',
        text: 'Wind against the window sash is left in the mix — Stefka said silence without weather feels fake.',
        textBg:
          'Вятърът в касата на прозореца е оставен в микса — Стефка каза, че тишина без време изглежда фалшива.',
      },
      {
        type: 'pullquote',
        text: 'When I sit at the loom, time disappears. My hands remember patterns my eyes cannot see.',
        textBg:
          'Когато седна на стана, времето изчезва. Ръцете ми помнят мотиви, които очите вече не виждат.',
        cite: 'Baba Stefka',
        citeBg: 'Баба Стефка',
      },
      {
        type: 'paragraph',
        text: 'Between takes she offers rose jam. Between knots she offers the names of women who taught her — some living, some already woven into unfinished borders.',
        textBg:
          'Между дублите ни предлага сладко от рози. Между възлите ни предлага имената на жените, които са я учили — някои живи, някои вече втъкани в недовършени рамки.',
      },
      {
        type: 'caption',
        text: 'Recording day — loom slackened only for tea.',
        textBg: 'Ден на записа — станът отпуснат само за чай.',
      },
    ],
    endLabel: 'End of Audio Story',
    endLabelBg: 'Край на аудио разказа',
  },
  {
    slug: 'danube-mist-fishermen',
    sourceId: 'v2',
    section: 'voices',
    path: '/voices/danube-mist-fishermen',
    category: 'Voices',
    categoryBg: 'Гласове',
    title: 'Danube Mist & Fishermen Secrets',
    titleBg: 'Легендите за Дунавските мъгли',
    subtitle:
      'The river changes every morning. If you listen carefully at 5 AM, it tells you what the day holds.',
    subtitleBg:
      'Реката се променя всяка сутрин. Ако слушаш внимателно в 5 часа, тя казва какво носи денят.',
    readTime: '8 min listen',
    readTimeBg: '8 мин слушане',
    location: 'Vidin shoreline',
    locationBg: 'Брегът на Видин',
    author: 'PRIZNI Audio Desk',
    authorBg: 'Аудио редакция PRIZNI',
    speaker: 'Dimitar the Fisherman',
    speakerBg: 'Димитър Рибаря',
    date: 'Field recording 2026',
    dateBg: 'Полеви запис 2026',
    image: '/river.jpg',
    photoCredit: 'Photography by PRIZNI Archive',
    photoCreditBg: 'Фотография: Архив PRIZNI',
    audioUrl:
      'https://actions.google.com/sounds/v1/ambiences/outdoor_water_stream.ogg',
    audioDuration: '8 min',
    body: [
      {
        type: 'paragraph',
        text: 'Dimitar speaks as if the microphone is another boat — useful, slightly suspicious, better kept dry.',
        textBg:
          'Димитър говори сякаш микрофонът е още една лодка — полезна, леко подозрителна, по-добре да се държи суха.',
      },
      {
        type: 'pullquote',
        text: 'The river changes every morning. If you listen carefully at 5 AM, it tells you what the day holds.',
        textBg:
          'Реката се променя всяка сутрин. Ако слушаш внимателно в 5 часа, тя казва какво носи денят.',
        cite: 'Dimitar',
        citeBg: 'Димитър',
      },
      {
        type: 'note',
        label: 'Audio note',
        labelBg: 'Аудио бележка',
        text: 'Hull knocks and thermos lids stay in the recording — the score of a working morning.',
        textBg:
          'Ударите в корпуса и капаците на термоса остават в записа — партитурата на работна сутрин.',
      },
      {
        type: 'paragraph',
        text: 'He refuses to name favorite fishing holes. He gladly names favorite mists — the kind that smell of iron and wet rope.',
        textBg:
          'Отказва да назове любими риболовни места. С радост наименува любими мъгли — онези, които миришат на желязо и мокро въже.',
      },
      {
        type: 'caption',
        text: 'Mic clipped inside the jacket, tip pointed toward the water.',
        textBg: 'Микрофонът закачен в якето, насочен към водата.',
      },
    ],
    endLabel: 'End of Audio Story',
    endLabelBg: 'Край на аудио разказа',
  },
  {
    slug: 'stone-silence-belogradchik',
    sourceId: 'v3',
    section: 'voices',
    path: '/voices/stone-silence-belogradchik',
    category: 'Voices',
    categoryBg: 'Гласове',
    title: 'Stone & Silence in Belogradchik',
    titleBg: 'Камък и тишина в Белоградчик',
    subtitle:
      'Every stone here has a name given by people who lived hundreds of years ago.',
    subtitleBg:
      'Всеки камък тук има име, дадено от хора, живели преди стотици години.',
    readTime: '5 min listen',
    readTimeBg: '5 мин слушане',
    location: 'Belogradchik Rocks',
    locationBg: 'Белоградчишки скали',
    author: 'PRIZNI Audio Desk',
    authorBg: 'Аудио редакция PRIZNI',
    speaker: 'Petar the Historian',
    speakerBg: 'Петър Архивиста',
    date: 'Field recording 2026',
    dateBg: 'Полеви запис 2026',
    image: '/mountains.jpg',
    photoCredit: 'Photography by PRIZNI Archive',
    photoCreditBg: 'Фотография: Архив PRIZNI',
    audioUrl: 'https://actions.google.com/sounds/v1/ambiences/heavy_wind.ogg',
    audioDuration: '5 min',
    body: [
      {
        type: 'paragraph',
        text: 'Petar walks as if footnotes were underfoot. Each pause is a citation. Each gust of wind is a rival narrator.',
        textBg:
          'Петър върви сякаш бележките под линия са под стъпалата му. Всяка пауза е цитат. Всеки порив вятър е съперник-разказвач.',
      },
      {
        type: 'pullquote',
        text: 'Every stone here has a name given by people who lived hundreds of years ago.',
        textBg:
          'Всеки камък тук има име, дадено от хора, живели преди стотици години.',
        cite: 'Petar',
        citeBg: 'Петър',
      },
      {
        type: 'note',
        label: 'Audio note',
        labelBg: 'Аудио бележка',
        text: 'We stop recording near the fortress walls when tour groups pass — Petar wants “clean century,” not selfie chatter.',
        textBg:
          'Спираме записа край крепостните стени, когато минават групи — Петър иска „чист век“, не бърборене от селфита.',
      },
      {
        type: 'paragraph',
        text: 'He ends on a stone called The Monk and refuses to explain the name. “Some silences are the point,” he says, and lights a cigarette the wind immediately steals.',
        textBg:
          'Приключва при скала, наречена Монахът, и отказва да обясни името. „Някои тишини са смисълът“, казва и запалва цигара, която вятърът веднага открадва.',
      },
      {
        type: 'caption',
        text: 'Take 4 — wind reduced by standing in the lee of The Monk.',
        textBg: 'Дубъл 4 — вятърът намален в подветрената страна на Монаха.',
      },
    ],
    endLabel: 'End of Audio Story',
    endLabelBg: 'Край на аудио разказа',
  },
  {
    slug: 'sunday-bells-lom',
    sourceId: 'v4',
    section: 'voices',
    path: '/voices/sunday-bells-lom',
    category: 'Voices',
    categoryBg: 'Гласове',
    title: 'Sunday Bells of Lom',
    titleBg: 'Неделните камбани на Лом',
    subtitle:
      'When the bells ring, the river seems to pause for a moment and listen with us.',
    subtitleBg:
      'Когато камбаните бият, реката сякаш спира за миг и слуша заедно с нас.',
    readTime: '4 min listen',
    readTimeBg: '4 мин слушане',
    location: 'Lom',
    locationBg: 'Лом',
    author: 'PRIZNI Audio Desk',
    authorBg: 'Аудио редакция PRIZNI',
    speaker: 'Father Nikolay',
    speakerBg: 'Отец Николай',
    date: 'Field recording 2026',
    dateBg: 'Полеви запис 2026',
    image: '/church.jpg',
    photoCredit: 'Photography by PRIZNI Archive',
    photoCreditBg: 'Фотография: Архив PRIZNI',
    audioUrl:
      'https://actions.google.com/sounds/v1/ambiences/quiet_city_park.ogg',
    audioDuration: '4 min',
    body: [
      {
        type: 'paragraph',
        text: 'Father Nikolay times his sentences between peals. The town answers with open windows and dogs that know not to bark over bells.',
        textBg:
          'Отец Николай мерее изреченията между ударите. Градът отговаря с отворени прозорци и кучета, които знаят да не лаят над камбаните.',
      },
      {
        type: 'pullquote',
        text: 'When the bells ring, the river seems to pause for a moment and listen with us.',
        textBg:
          'Когато камбаните бият, реката сякаш спира за миг и слуша заедно с нас.',
        cite: 'Father Nikolay',
        citeBg: 'Отец Николай',
      },
      {
        type: 'note',
        label: 'Audio note',
        labelBg: 'Аудио бележка',
        text: 'Stereo capture from the churchyard — left channel river, right channel square.',
        textBg:
          'Стерео запис от двора — ляв канал река, десен канал площад.',
      },
      {
        type: 'paragraph',
        text: 'After liturgy he pours coffee into plastic cups and refuses grand theories. “Sunday is for ringing and returning,” he says.',
        textBg:
          'След литургията сипва кафе в пластмасови чаши и отказва големи теории. „Неделята е за биене и връщане“, казва.',
      },
      {
        type: 'caption',
        text: 'Bell rope frayed at the height of a boy’s reach.',
        textBg: 'Въжето на камбаната протрито на височината на детска ръка.',
      },
    ],
    endLabel: 'End of Audio Story',
    endLabelBg: 'Край на аудио разказа',
  },
  {
    slug: 'kilim-patterns-spoken-aloud',
    sourceId: 'v5',
    section: 'voices',
    path: '/voices/kilim-patterns-spoken-aloud',
    category: 'Voices',
    categoryBg: 'Гласове',
    title: 'Kilim Patterns Spoken Aloud',
    titleBg: 'Килимени мотиви на глас',
    subtitle:
      'My grandmother never drew patterns. She sang them, and the loom answered.',
    subtitleBg:
      'Баба ми никога не е рисувала мотиви. Пеела ги е — и станът е отговарял.',
    readTime: '7 min listen',
    readTimeBg: '7 мин слушане',
    location: 'Chiprovtsi workshop',
    locationBg: 'Работилница в Чипровци',
    author: 'PRIZNI Audio Desk',
    authorBg: 'Аудио редакция PRIZNI',
    speaker: 'Elena the Weaver',
    speakerBg: 'Елена Тъкачката',
    date: 'Field recording 2026',
    dateBg: 'Полеви запис 2026',
    image: '/craftsman.jpg',
    photoCredit: 'Photography by Angelika Petrova',
    photoCreditBg: 'Фотография: Ангелика Петрова',
    audioUrl:
      'https://actions.google.com/sounds/v1/ambiences/warbler_in_forest.ogg',
    audioDuration: '7 min',
    body: [
      {
        type: 'paragraph',
        text: 'Elena sings half-remembered counting songs while the beater packs yarn. Melody and meter share one workshop.',
        textBg:
          'Елена пее наполовина спомнети броеници, докато бърдото притъпква преждата. Мелодия и метър делят една работилница.',
      },
      {
        type: 'pullquote',
        text: 'My grandmother never drew patterns. She sang them, and the loom answered.',
        textBg:
          'Баба ми никога не е рисувала мотиви. Пеела ги е — и станът е отговарял.',
        cite: 'Elena',
        citeBg: 'Елена',
      },
      {
        type: 'note',
        label: 'Audio note',
        labelBg: 'Аудио бележка',
        text: 'Room tone includes distant schoolyard — Elena asked us not to gate it out. “Children are also a pattern.”',
        textBg:
          'Фоновият тон включва далечен училищен двор — Елена помоли да не го махаме. „Децата също са мотив.“',
      },
      {
        type: 'paragraph',
        text: 'She ends by teaching us one refrain and laughing when we fail the rhythm. “Good,” she says. “Now your hands will stay humble.”',
        textBg:
          'Завършва, като ни учи на един припев, и се смее, когато ритъмът ни се счупва. „Добре“, казва. „Сега ръцете ви ще останат смирени.“',
      },
      {
        type: 'caption',
        text: 'Humming while measuring warp — phone recording banned, tape only.',
        textBg:
          'Тананикане при мерене на основата — телефонен запис забранен, само лента.',
      },
    ],
    endLabel: 'End of Audio Story',
    endLabelBg: 'Край на аудио разказа',
  },
]
