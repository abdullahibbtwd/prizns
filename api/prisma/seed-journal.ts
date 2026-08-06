/**
 * Seeds demo journal content (authors, media, published articles, series)
 * matching the concept-3 static fixtures so the public site can run from DB.
 */
import {
  ArticleSection,
  ArticleStatus,
  MediaKind,
  PrismaClient,
  TranslationStatus,
} from '@prisma/client';
import { buildArticlePath } from '../src/articles/section.util';

type SeedBlock =
  | { type: 'paragraph'; textBg: string; textEn: string }
  | {
      type: 'pullquote';
      textBg: string;
      textEn: string;
      citeBg: string;
      citeEn: string;
    }
  | {
      type: 'note';
      labelBg: string;
      labelEn: string;
      textBg: string;
      textEn: string;
    }
  | { type: 'caption'; textBg: string; textEn: string };

type SeedArticle = {
  slug: string;
  section: ArticleSection;
  categoryBg: string;
  categoryEn: string;
  titleBg: string;
  titleEn: string;
  subtitleBg: string;
  subtitleEn: string;
  readTimeBg: string;
  readTimeEn: string;
  locationBg: string;
  locationEn: string;
  dateBg: string;
  dateEn: string;
  authorSlug: string;
  imageKey: string;
  imageUrl: string;
  featured?: boolean;
  speakerBg?: string;
  speakerEn?: string;
  audioUrl?: string;
  audioDuration?: string;
  videoUrl?: string;
  body: SeedBlock[];
};

const AUTHORS = [
  {
    slug: 'albena-nikolova',
    nameBg: 'Албена Николова',
    nameEn: 'Albena Nikolova',
    roleBg: 'Главен редактор',
    roleEn: 'Editor-in-Chief',
    quoteBg:
      'Вярва, че всяко село пази история, която си струва да се разкаже.',
    quoteEn: 'Believes every village has a story worth preserving.',
    locationBg: 'Белоградчик / София',
    locationEn: 'Belogradchik / Sofia',
    bioBg:
      'Албена основава Живия журнал, за да забави темпото на регионалното разказване.',
    bioEn:
      'Albena founded The Living Journal to slow the pace of regional storytelling.',
    imageUrl: '/woman.jpg',
    aliases: ['Albena Stoyanova', 'Албена Стоянова'],
  },
  {
    slug: 'inna-gerova',
    nameBg: 'Инна Герова',
    nameEn: 'Inna Gerova',
    roleBg: 'Старши автор',
    roleEn: 'Senior Writer',
    quoteBg: 'Слуша тихите истини между планинските утрини.',
    quoteEn: 'Listens for the quieter truths between mountain mornings.',
    locationBg: 'Видин / Лом',
    locationEn: 'Vidin / Lom',
    bioBg: 'Инна пише от крайречни градове и музейни коридори.',
    bioEn: 'Inna writes from river towns and museum corridors.',
    imageUrl: '/heroimg.jpg',
    aliases: [] as string[],
  },
  {
    slug: 'angelika-petrova',
    nameBg: 'Ангелика Петрова',
    nameEn: 'Angelika Petrova',
    roleBg: 'Културен редактор',
    roleEn: 'Culture Editor',
    quoteBg:
      'Документира занаяти, преди ръцете, които ги знаят, да изчезнат.',
    quoteEn: 'Documents crafts before the hands that know them are gone.',
    locationBg: 'Чипровци',
    locationEn: 'Chiprovtsi',
    bioBg: 'Ангелика сяда при тъкачки, хлебари и пазители на празници.',
    bioEn: 'Angelika sits with weavers, bakers, and feast-keepers.',
    imageUrl: '/craftsman.jpg',
    aliases: [] as string[],
  },
  {
    slug: 'natalia-dimitrova',
    nameBg: 'Наталия Димитрова',
    nameEn: 'Natalia Dimitrova',
    roleBg: 'Фотограф',
    roleEn: 'Photographer',
    quoteBg: 'Търси светлината по каменните улички преди първия автобус.',
    quoteEn: 'Chases light in stone lanes before the first bus.',
    locationBg: 'Враца',
    locationEn: 'Vratsa',
    bioBg: 'Наталия снима Северозапада с търпение и топла светлина.',
    bioEn: 'Natalia photographs the Northwest with patience and warm light.',
    imageUrl: '/village.jpg',
    aliases: [] as string[],
  },
] as const;

function paragraphs(
  pairs: Array<[string, string]>,
): SeedBlock[] {
  return pairs.map(([textEn, textBg]) => ({
    type: 'paragraph' as const,
    textEn,
    textBg,
  }));
}

const ARTICLES: SeedArticle[] = [
  {
    slug: 'along-the-walnut-paths',
    section: 'featured',
    categoryBg: 'Човешки истории',
    categoryEn: 'Human Stories',
    titleBg: 'По ореховите пътеки на Северозапада',
    titleEn: 'Along the Walnut Paths of Northwestern Bulgaria',
    subtitleBg:
      'Тиха разходка през забравени каменни села, където старите орехи пазят мъдростта на поколения.',
    subtitleEn:
      'A silent walk through forgotten stone villages where old walnut trees guard the wisdom of generations.',
    readTimeBg: '12 мин четене',
    readTimeEn: '12 min read',
    locationBg: 'Белоградчик и околности',
    locationEn: 'Belogradchik Region',
    dateBg: 'Юли 2026',
    dateEn: 'July 2026',
    authorSlug: 'albena-nikolova',
    imageKey: 'seed/village',
    imageUrl: '/village.jpg',
    featured: true,
    body: [
      ...paragraphs([
        [
          'There is a specific rhythm to dawn in the villages surrounding Belogradchik. Long before the sun reaches the red sandstone cliffs, a cool mist settles over the stone paths lined with ancient walnut trees.',
          'Има особен ритъм на зората в селата около Белоградчик. Още преди слънцето да стигне червените скали, хладна мъгла ляга върху каменните пътеки, оградени от вековни орехи.',
        ],
        [
          'For over eighty years, Grandfather Ivan has walked these paths every morning. His hands, weathered like the bark of the trees he tends, carry the silent history of a region that the rest of the world often passes by.',
          'Вече над осемдесет години дядо Иван върви по тези пътеки всяка сутрин. Ръцете му, набраздени като кората на дърветата, които гледа, носят тихата история на регион, който светът често подминава.',
        ],
      ]),
      {
        type: 'pullquote',
        textEn:
          'We do not own this land. We are merely its keepers for a short while.',
        textBg:
          'Ние не притежаваме тази земя. Само я пазим за кратко.',
        citeEn: 'Grandfather Ivan, Belogradchik Region',
        citeBg: 'Дядо Иван, Белоградчишко',
      },
      ...paragraphs([
        [
          'In this edition of The Living Journal, we invite you to slow down and step into the narrow stone lanes where doors are rarely locked.',
          'В това издание на Живия журнал ви каним да забавите темпото и да влезете в тесните каменни улички, където вратите рядко се заключват.',
        ],
      ]),
    ],
  },
  {
    slug: 'walnut-keeper-varbovo',
    section: 'human_stories',
    categoryBg: 'Човешки истории',
    categoryEn: 'Human Stories',
    titleBg: 'Пазителят на орехите във Върбово',
    titleEn: 'The Walnut Keeper of Varbovo',
    subtitleBg: 'Дядо Иван все още обхожда пътеките призори.',
    subtitleEn: 'Grandfather Ivan still walks the paths at dawn.',
    readTimeBg: '8 мин четене',
    readTimeEn: '8 min read',
    locationBg: 'Върбово',
    locationEn: 'Varbovo',
    dateBg: 'Юни 2026',
    dateEn: 'June 2026',
    authorSlug: 'albena-nikolova',
    imageKey: 'seed/village-2',
    imageUrl: '/village.jpg',
    body: paragraphs([
      [
        'Every morning before the bus from Belogradchik arrives, Ivan checks the school tree.',
        'Всяка сутрин преди автобуса от Белоградчик Иван проверява училищното дърво.',
      ],
      [
        'He knows which nuts fall for children and which stay for winter jam.',
        'Знае кои орехи са за децата и кои остават за зимното сладко.',
      ],
    ]),
  },
  {
    slug: 'letters-from-the-danube-shore',
    section: 'human_stories',
    categoryBg: 'Човешки истории',
    categoryEn: 'Human Stories',
    titleBg: 'Писма от брега на Дунава',
    titleEn: 'Letters from the Danube Shore',
    subtitleBg: 'Дневници, камбани и заети весла в Лом.',
    subtitleEn: 'Journals, bells, and borrowed oars in Lom.',
    readTimeBg: '10 мин четене',
    readTimeEn: '10 min read',
    locationBg: 'Лом',
    locationEn: 'Lom',
    dateBg: 'Май 2026',
    dateEn: 'May 2026',
    authorSlug: 'inna-gerova',
    imageKey: 'seed/river',
    imageUrl: '/river.jpg',
    body: paragraphs([
      [
        'The river changes every morning. If you listen carefully at 5 AM, it tells you what the day holds.',
        'Реката се променя всяка сутрин. Ако слушаш внимателно в 5 ч., тя ти казва какво носи денят.',
      ],
    ]),
  },
  {
    slug: 'the-carpet-that-remembered',
    section: 'human_stories',
    categoryBg: 'Човешки истории',
    categoryEn: 'Human Stories',
    titleBg: 'Килимът, който помнеше',
    titleEn: 'The Carpet That Remembered',
    subtitleBg: 'Мотиви, изтъкани преди очите да забравят.',
    subtitleEn: 'Patterns woven before the eyes forget.',
    readTimeBg: '9 мин четене',
    readTimeEn: '9 min read',
    locationBg: 'Чипровци',
    locationEn: 'Chiprovtsi',
    dateBg: 'Април 2026',
    dateEn: 'April 2026',
    authorSlug: 'angelika-petrova',
    imageKey: 'seed/craftsman',
    imageUrl: '/craftsman.jpg',
    body: paragraphs([
      [
        'When Stefka sits at the loom, time disappears. Her hands remember patterns her eyes cannot see.',
        'Когато Стефка сяда на стана, времето изчезва. Ръцете ѝ помнят мотиви, които очите ѝ вече не виждат.',
      ],
    ]),
  },
  {
    slug: 'beekeeper-of-the-balkan-edge',
    section: 'human_stories',
    categoryBg: 'Човешки истории',
    categoryEn: 'Human Stories',
    titleBg: 'Пчеларят от края на Балкана',
    titleEn: 'Beekeeper of the Balkan Edge',
    subtitleBg: 'Кошери над облаците край Враца.',
    subtitleEn: 'Hives above the clouds near Vratsa.',
    readTimeBg: '7 мин четене',
    readTimeEn: '7 min read',
    locationBg: 'Врачански Балкан',
    locationEn: 'Vratsa Balkan',
    dateBg: 'Март 2026',
    dateEn: 'March 2026',
    authorSlug: 'natalia-dimitrova',
    imageKey: 'seed/mountains',
    imageUrl: '/mountains.jpg',
    body: paragraphs([
      [
        'He counts seasons by the color of the honey, not by the calendar on the wall.',
        'Брои сезоните по цвета на меда, не по календара на стената.',
      ],
    ]),
  },
  {
    slug: 'belogradchik',
    section: 'places',
    categoryBg: 'Места',
    categoryEn: 'Places',
    titleBg: 'Белоградчик',
    titleEn: 'Belogradchik',
    subtitleBg: 'Където червените монолити докосват небето',
    subtitleEn: 'Where red monoliths touch the sky',
    readTimeBg: '6 мин',
    readTimeEn: '6 min',
    locationBg: 'Белоградчик',
    locationEn: 'Belogradchik',
    dateBg: '2026',
    dateEn: '2026',
    authorSlug: 'albena-nikolova',
    imageKey: 'seed/mountains-place',
    imageUrl: '/mountains.jpg',
    body: paragraphs([
      [
        'The fortress looks over a sea of stone figures shaped by wind and story.',
        'Крепостта гледа към море от каменни фигури, оформени от вятър и предания.',
      ],
    ]),
  },
  {
    slug: 'varshets',
    section: 'places',
    categoryBg: 'Места',
    categoryEn: 'Places',
    titleBg: 'Вършец',
    titleEn: 'Varshets',
    subtitleBg: 'Минерални води и тихи алеи',
    subtitleEn: 'Mineral waters and quiet avenues',
    readTimeBg: '5 мин',
    readTimeEn: '5 min',
    locationBg: 'Вършец',
    locationEn: 'Varshets',
    dateBg: '2026',
    dateEn: '2026',
    authorSlug: 'inna-gerova',
    imageKey: 'seed/park',
    imageUrl: '/heroimg.jpg',
    body: paragraphs([
      [
        'Steam rises from the park baths before the first guests arrive.',
        'Парата се вдига от парковите бани преди първите гости.',
      ],
    ]),
  },
  {
    slug: 'chiprovtsi',
    section: 'places',
    categoryBg: 'Места',
    categoryEn: 'Places',
    titleBg: 'Чипровци',
    titleEn: 'Chiprovtsi',
    subtitleBg: 'Градът на килимите и среброто',
    subtitleEn: 'Town of carpets and silver',
    readTimeBg: '7 мин',
    readTimeEn: '7 min',
    locationBg: 'Чипровци',
    locationEn: 'Chiprovtsi',
    dateBg: '2026',
    dateEn: '2026',
    authorSlug: 'angelika-petrova',
    imageKey: 'seed/crafts-place',
    imageUrl: '/craftsman.jpg',
    body: paragraphs([
      [
        'Looms still click behind courtyard gates after the tourist buses leave.',
        'Становете все още чукат зад дворните порти след като автобусите си тръгнат.',
      ],
    ]),
  },
  {
    slug: 'traditional-bread',
    section: 'traditions',
    categoryBg: 'Традиции',
    categoryEn: 'Traditions',
    titleBg: 'Обредният хляб',
    titleEn: 'Ritual Bread',
    subtitleBg: 'Квас, слънце и плетеници от брашно',
    subtitleEn: 'Yeast, sun, and flour braids',
    readTimeBg: '6 мин четене',
    readTimeEn: '6 min read',
    locationBg: 'Северозапад',
    locationEn: 'Northwest',
    dateBg: '2026',
    dateEn: '2026',
    authorSlug: 'angelika-petrova',
    imageKey: 'seed/bread',
    imageUrl: '/bread.jpg',
    body: paragraphs([
      [
        'Spring arrives as yeast, green wreaths, and news exchanged like seed packets.',
        'Пролетта идва като квас, зелени венци и новини, разменяни като пакетчета семена.',
      ],
    ]),
  },
  {
    slug: 'wedding-customs',
    section: 'traditions',
    categoryBg: 'Традиции',
    categoryEn: 'Traditions',
    titleBg: 'Сватбени обичаи',
    titleEn: 'Wedding Customs',
    subtitleBg: 'Песни, венци и дълги трапези',
    subtitleEn: 'Songs, wreaths, and long tables',
    readTimeBg: '8 мин четене',
    readTimeEn: '8 min read',
    locationBg: 'Северозапад',
    locationEn: 'Northwest',
    dateBg: '2026',
    dateEn: '2026',
    authorSlug: 'albena-nikolova',
    imageKey: 'seed/festival',
    imageUrl: '/festival.jpg',
    body: paragraphs([
      [
        'The feast begins before the guests sit — with salt, bread, and a blessing.',
        'Трапезата започва преди гостите да седнат — със сол, хляб и благословия.',
      ],
    ]),
  },
  {
    slug: 'chiprovtsi-kilims',
    section: 'traditions',
    categoryBg: 'Традиции',
    categoryEn: 'Traditions',
    titleBg: 'Чипровските килими',
    titleEn: 'Chiprovtsi Kilims',
    subtitleBg: 'Жива нишка на наследството',
    subtitleEn: 'A living thread of heritage',
    readTimeBg: '7 мин четене',
    readTimeEn: '7 min read',
    locationBg: 'Чипровци',
    locationEn: 'Chiprovtsi',
    dateBg: '2026',
    dateEn: '2026',
    authorSlug: 'angelika-petrova',
    imageKey: 'seed/kilims',
    imageUrl: '/craftsman.jpg',
    body: paragraphs([
      [
        'Each motif is a sentence the village still knows how to speak.',
        'Всеки мотив е изречение, което селото все още умее да произнася.',
      ],
    ]),
  },
  {
    slug: 'spring-traditions',
    section: 'discover',
    categoryBg: 'Открийте',
    categoryEn: 'Discover',
    titleBg: 'Пролетни традиции',
    titleEn: 'Spring Traditions',
    subtitleBg:
      'Събуждане на земята, обредни хлябове и древни ритуали на прераждане.',
    subtitleEn:
      'Awakening of the earth, ritual breads, and ancient rites of rebirth.',
    readTimeBg: '9 мин четене',
    readTimeEn: '9 min read',
    locationBg: 'Планински селища',
    locationEn: 'Mountain settlements',
    dateBg: 'Пролетно издание 2026',
    dateEn: 'Spring Edition 2026',
    authorSlug: 'albena-nikolova',
    imageKey: 'seed/festival-discover',
    imageUrl: '/festival.jpg',
    body: paragraphs([
      [
        'This cluster gathers field pieces — bread days, first pasture blessing, and market songs.',
        'Тази колекция събира теренни текстове — дни на хляба, първата благословия на пашата и пазарни песни.',
      ],
    ]),
  },
  {
    slug: 'mountain-villages',
    section: 'discover',
    categoryBg: 'Открийте',
    categoryEn: 'Discover',
    titleBg: 'Планински села',
    titleEn: 'Mountain Villages',
    subtitleBg: 'Каменни покриви и тихи долини във Врачанския Балкан.',
    subtitleEn: 'Stone roofs and silent valleys in Vratsa Balkan.',
    readTimeBg: '8 мин четене',
    readTimeEn: '8 min read',
    locationBg: 'Врачански Балкан',
    locationEn: 'Vratsa Balkan',
    dateBg: '2026',
    dateEn: '2026',
    authorSlug: 'natalia-dimitrova',
    imageKey: 'seed/mountains-discover',
    imageUrl: '/mountains.jpg',
    body: paragraphs([
      [
        'Life tucked high above the clouds — stone roofs, silent valleys.',
        'Живот високо над облаците — каменни покриви, тихи долини.',
      ],
    ]),
  },
  {
    slug: 'danube-stories',
    section: 'discover',
    categoryBg: 'Открийте',
    categoryEn: 'Discover',
    titleBg: 'Дунавски истории',
    titleEn: 'Danube Stories',
    subtitleBg: 'Лодки, мъгла и рибарски легенди от Видин до Лом.',
    subtitleEn: 'Boats, mist, and fishermen tales from Vidin to Lom.',
    readTimeBg: '8 мин четене',
    readTimeEn: '8 min read',
    locationBg: 'Дунав',
    locationEn: 'Danube',
    dateBg: '2026',
    dateEn: '2026',
    authorSlug: 'inna-gerova',
    imageKey: 'seed/river-discover',
    imageUrl: '/river.jpg',
    body: paragraphs([
      [
        'Old wooden boats and morning river mist from Vidin to Lom.',
        'Стари дървени лодки и утринна речна мъгла от Видин до Лом.',
      ],
    ]),
  },
  {
    slug: 'the-last-weaver',
    section: 'voices',
    categoryBg: 'Гласове',
    categoryEn: 'Voices',
    titleBg: 'Гласът на последната тъкачка',
    titleEn: 'The Last Weaver of Chiprovtsi',
    subtitleBg:
      'Когато сядам на стана, времето изчезва. Ръцете ми помнят мотиви, които очите не виждат.',
    subtitleEn:
      'When I sit at the loom, time disappears. My hands remember patterns my eyes cannot see.',
    readTimeBg: '6 мин',
    readTimeEn: '6 min',
    locationBg: 'Чипровци',
    locationEn: 'Chiprovtsi',
    dateBg: '2026',
    dateEn: '2026',
    authorSlug: 'angelika-petrova',
    imageKey: 'seed/voice-weaver',
    imageUrl: '/woman.jpg',
    speakerBg: 'Баба Стефка (84 г.)',
    speakerEn: 'Baba Stefka (84 yrs)',
    audioUrl: 'https://actions.google.com/sounds/v1/ambiences/forest_wind.ogg',
    audioDuration: '6 min',
    body: paragraphs([
      [
        'When I sit at the loom, time disappears. My hands remember patterns my eyes cannot see.',
        'Когато сядам на стана, времето изчезва. Ръцете ми помнят мотиви, които очите не виждат.',
      ],
    ]),
  },
  {
    slug: 'danube-mist-fishermen',
    section: 'voices',
    categoryBg: 'Гласове',
    categoryEn: 'Voices',
    titleBg: 'Легендите за Дунавските мъгли',
    titleEn: 'Danube Mist & Fishermen Secrets',
    subtitleBg:
      'Реката се променя всяка сутрин. Ако слушаш внимателно в 5 ч., тя ти казва какво носи денят.',
    subtitleEn:
      'The river changes every morning. If you listen carefully at 5 AM, it tells you what the day holds.',
    readTimeBg: '8 мин',
    readTimeEn: '8 min',
    locationBg: 'Лом',
    locationEn: 'Lom',
    dateBg: '2026',
    dateEn: '2026',
    authorSlug: 'inna-gerova',
    imageKey: 'seed/voice-river',
    imageUrl: '/river.jpg',
    speakerBg: 'Димитър Рибаря',
    speakerEn: 'Dimitar the Fisherman',
    audioUrl:
      'https://actions.google.com/sounds/v1/ambiences/outdoor_water_stream.ogg',
    audioDuration: '8 min',
    body: paragraphs([
      [
        'The river changes every morning. Listen carefully at 5 AM.',
        'Реката се променя всяка сутрин. Слушай внимателно в 5 ч.',
      ],
    ]),
  },
  {
    slug: 'stone-silence-belogradchik',
    section: 'voices',
    categoryBg: 'Гласове',
    categoryEn: 'Voices',
    titleBg: 'Камък и тишина в Белоградчик',
    titleEn: 'Stone & Silence in Belogradchik',
    subtitleBg:
      'Всеки камък тук има име, дадено от хора, живели преди стотици години.',
    subtitleEn:
      'Every stone here has a name given by people who lived hundreds of years ago.',
    readTimeBg: '5 мин',
    readTimeEn: '5 min',
    locationBg: 'Белоградчик',
    locationEn: 'Belogradchik',
    dateBg: '2026',
    dateEn: '2026',
    authorSlug: 'natalia-dimitrova',
    imageKey: 'seed/voice-stone',
    imageUrl: '/mountains.jpg',
    speakerBg: 'Петър Архивиста',
    speakerEn: 'Petar the Historian',
    audioUrl: 'https://actions.google.com/sounds/v1/ambiences/heavy_wind.ogg',
    audioDuration: '5 min',
    body: paragraphs([
      [
        'Every stone here has a name given by people who lived hundreds of years ago.',
        'Всеки камък тук има име, дадено от хора, живели преди стотици години.',
      ],
    ]),
  },
  {
    slug: 'sunday-match-vratsa',
    section: 'sports',
    categoryBg: 'Спорт',
    categoryEn: 'Sports',
    titleBg: 'Неделният мач във Враца',
    titleEn: 'Sunday Match in Vratsa',
    subtitleBg: 'Общински терен, железни фенове и чай след края.',
    subtitleEn: 'Municipal pitch, iron fans, and tea after the whistle.',
    readTimeBg: '5 мин',
    readTimeEn: '5 min',
    locationBg: 'Враца',
    locationEn: 'Vratsa',
    dateBg: '2026',
    dateEn: '2026',
    authorSlug: 'natalia-dimitrova',
    imageKey: 'seed/sports',
    imageUrl: '/heroimg.jpg',
    body: paragraphs([
      [
        'The stands fill before the kickoff — cousins, coaches, and thermoses.',
        'Трибуните се пълнят преди началото — братовчеди, треньори и термоси.',
      ],
    ]),
  },
  {
    slug: 'chiprovtsi-carpet-festival',
    section: 'events',
    categoryBg: 'Събития',
    categoryEn: 'Events',
    titleBg: 'Фестивал на килима в Чипровци',
    titleEn: 'Chiprovtsi Carpet Festival',
    subtitleBg: 'Дворни демонстрации и вечерна музика.',
    subtitleEn: 'Courtyard demos and evening music.',
    readTimeBg: '4 мин',
    readTimeEn: '4 min',
    locationBg: 'Чипровци',
    locationEn: 'Chiprovtsi',
    dateBg: 'Август 2026',
    dateEn: 'August 2026',
    authorSlug: 'angelika-petrova',
    imageKey: 'seed/events',
    imageUrl: '/festival.jpg',
    body: paragraphs([
      [
        'Looms move into the square and the whole town keeps time with the beaters.',
        'Становете излизат на площада и целият град държи ритъма с бухалките.',
      ],
    ]),
  },
  {
    slug: 'dawn-over-belogradchik',
    section: 'video',
    categoryBg: 'Видео',
    categoryEn: 'Video',
    titleBg: 'Зора над Белоградчик',
    titleEn: 'Dawn over Belogradchik',
    subtitleBg: 'Кратък филм за мъглата и червения камък.',
    subtitleEn: 'A short film on mist and red stone.',
    readTimeBg: '3 мин',
    readTimeEn: '3 min',
    locationBg: 'Белоградчик',
    locationEn: 'Belogradchik',
    dateBg: '2026',
    dateEn: '2026',
    authorSlug: 'natalia-dimitrova',
    imageKey: 'seed/video',
    imageUrl: '/mountains.jpg',
    audioDuration: '3 min',
    videoUrl: 'https://www.youtube.com/watch?v=LXb3EKWsInQ',
    body: paragraphs([
      [
        'Four minutes of quiet light before the fortress opens.',
        'Четири минути тиха светлина преди крепостта да отвори.',
      ],
    ]),
  },
  {
    slug: 'kilim-in-motion',
    section: 'video',
    categoryBg: 'Видео',
    categoryEn: 'Video',
    titleBg: 'Килим в движение',
    titleEn: 'Kilim in Motion',
    subtitleBg:
      'Къс филм, в който ръце, нишка и светлина от прозореца държат едно темпо.',
    subtitleEn:
      'A short film where hands, thread, and window light keep the same tempo.',
    readTimeBg: '12 мин гледане',
    readTimeEn: '12 min watch',
    locationBg: 'Чипровци',
    locationEn: 'Chiprovtsi',
    dateBg: '2026',
    dateEn: '2026',
    authorSlug: 'natalia-dimitrova',
    imageKey: 'seed/video-kilim',
    imageUrl: '/craftsman.jpg',
    audioDuration: '12 min',
    videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    body: paragraphs([
      [
        'The camera stays close enough to hear the comb strike the weave.',
        'Камерата стои достатъчно близо, за да се чуе ударът на гребена в тъканта.',
      ],
    ]),
  },
  {
    slug: 'danube-crossing',
    section: 'video',
    categoryBg: 'Видео',
    categoryEn: 'Video',
    titleBg: 'Пресичане на Дунава',
    titleEn: 'Danube Crossing',
    subtitleBg: 'Лодки в утринна мъгла между два бряга.',
    subtitleEn: 'Boats in morning mist between two shores.',
    readTimeBg: '6 мин',
    readTimeEn: '6 min',
    locationBg: 'Видин',
    locationEn: 'Vidin',
    dateBg: '2026',
    dateEn: '2026',
    authorSlug: 'inna-gerova',
    imageKey: 'seed/video-danube',
    imageUrl: '/river.jpg',
    audioDuration: '6 min',
    videoUrl: 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
    body: paragraphs([
      [
        'Fog takes the far bank before the first oar dips.',
        'Мъглата взема отсрещния бряг преди първото гребло да се потопи.',
      ],
    ]),
  },
  {
    slug: 'keep-the-looms-alive',
    section: 'campaigns',
    categoryBg: 'Кампании',
    categoryEn: 'Campaigns',
    titleBg: 'Запазете становете живи',
    titleEn: 'Keep the Looms Alive',
    subtitleBg: 'Подкрепа за млади тъкачки в Чипровци.',
    subtitleEn: 'Support for young weavers in Chiprovtsi.',
    readTimeBg: '4 мин',
    readTimeEn: '4 min',
    locationBg: 'Чипровци',
    locationEn: 'Chiprovtsi',
    dateBg: '2026',
    dateEn: '2026',
    authorSlug: 'albena-nikolova',
    imageKey: 'seed/campaign',
    imageUrl: '/craftsman.jpg',
    body: paragraphs([
      [
        'A community fund for apprenticeships at the loom.',
        'Общностен фонд за чиракуване на стана.',
      ],
    ]),
  },
];

async function upsertMedia(
  prisma: PrismaClient,
  key: string,
  url: string,
  kind: MediaKind = MediaKind.IMAGE,
) {
  return prisma.mediaAsset.upsert({
    where: { key },
    update: { url, mimeType: kind === MediaKind.AUDIO ? 'audio/ogg' : 'image/jpeg', kind },
    create: {
      key,
      url,
      mimeType: kind === MediaKind.AUDIO ? 'audio/ogg' : 'image/jpeg',
      kind,
      originalName: key.split('/').pop() ?? key,
      creditBg: 'Архив ПРИЗНИ',
      creditEn: 'PRIZNI Archive',
    },
  });
}

export async function seedJournalContent(prisma: PrismaClient) {
  const authorIds = new Map<string, string>();

  for (const author of AUTHORS) {
    const row = await prisma.author.upsert({
      where: { slug: author.slug },
      update: {
        nameBg: author.nameBg,
        nameEn: author.nameEn,
        roleBg: author.roleBg,
        roleEn: author.roleEn,
        quoteBg: author.quoteBg,
        quoteEn: author.quoteEn,
        locationBg: author.locationBg,
        locationEn: author.locationEn,
        bioBg: author.bioBg,
        bioEn: author.bioEn,
        imageUrl: author.imageUrl,
        aliases: [...author.aliases],
        isActive: true,
        translationStatus: TranslationStatus.READY,
        translationError: null,
      },
      create: {
        slug: author.slug,
        nameBg: author.nameBg,
        nameEn: author.nameEn,
        roleBg: author.roleBg,
        roleEn: author.roleEn,
        quoteBg: author.quoteBg,
        quoteEn: author.quoteEn,
        locationBg: author.locationBg,
        locationEn: author.locationEn,
        bioBg: author.bioBg,
        bioEn: author.bioEn,
        imageUrl: author.imageUrl,
        aliases: [...author.aliases],
        isActive: true,
        translationStatus: TranslationStatus.READY,
      },
    });
    authorIds.set(author.slug, row.id);
  }

  console.log(`Seeded ${AUTHORS.length} journal authors`);

  const articleIds = new Map<string, string>();

  for (const article of ARTICLES) {
    const hero = await upsertMedia(prisma, article.imageKey, article.imageUrl);
    let audioMediaId: string | undefined;
    if (article.audioUrl) {
      const audio = await upsertMedia(
        prisma,
        `seed/audio/${article.slug}`,
        article.audioUrl,
        MediaKind.AUDIO,
      );
      audioMediaId = audio.id;
    }

    const authorId = authorIds.get(article.authorSlug);
    const path = buildArticlePath(article.section, article.slug);

    const row = await prisma.article.upsert({
      where: {
        section_slug: { section: article.section, slug: article.slug },
      },
      update: {
        path,
        status: ArticleStatus.PUBLISHED,
        publishedAt: new Date('2026-06-01T12:00:00.000Z'),
        categoryBg: article.categoryBg,
        categoryEn: article.categoryEn,
        titleBg: article.titleBg,
        titleEn: article.titleEn,
        subtitleBg: article.subtitleBg,
        subtitleEn: article.subtitleEn,
        readTimeBg: article.readTimeBg,
        readTimeEn: article.readTimeEn,
        locationBg: article.locationBg,
        locationEn: article.locationEn,
        dateBg: article.dateBg,
        dateEn: article.dateEn,
        photoCreditBg: 'Фотография: Архив ПРИЗНИ',
        photoCreditEn: 'Photography by PRIZNI Archive',
        endLabelBg: 'Край',
        endLabelEn: 'End',
        speakerBg: article.speakerBg ?? null,
        speakerEn: article.speakerEn ?? null,
        audioDuration: article.audioDuration ?? null,
        videoUrl: article.videoUrl ?? null,
        body: article.body,
        featured: article.featured ?? false,
        sponsored: false,
        authorId: authorId ?? null,
        heroMediaId: hero.id,
        audioMediaId: audioMediaId ?? null,
        translationStatus: TranslationStatus.READY,
        translationError: null,
      },
      create: {
        section: article.section,
        slug: article.slug,
        path,
        status: ArticleStatus.PUBLISHED,
        publishedAt: new Date('2026-06-01T12:00:00.000Z'),
        categoryBg: article.categoryBg,
        categoryEn: article.categoryEn,
        titleBg: article.titleBg,
        titleEn: article.titleEn,
        subtitleBg: article.subtitleBg,
        subtitleEn: article.subtitleEn,
        readTimeBg: article.readTimeBg,
        readTimeEn: article.readTimeEn,
        locationBg: article.locationBg,
        locationEn: article.locationEn,
        dateBg: article.dateBg,
        dateEn: article.dateEn,
        photoCreditBg: 'Фотография: Архив ПРИЗНИ',
        photoCreditEn: 'Photography by PRIZNI Archive',
        endLabelBg: 'Край',
        endLabelEn: 'End',
        speakerBg: article.speakerBg ?? null,
        speakerEn: article.speakerEn ?? null,
        audioDuration: article.audioDuration ?? null,
        videoUrl: article.videoUrl ?? null,
        body: article.body,
        featured: article.featured ?? false,
        sponsored: false,
        authorId: authorId ?? null,
        heroMediaId: hero.id,
        audioMediaId: audioMediaId ?? null,
        translationStatus: TranslationStatus.READY,
      },
    });

    articleIds.set(article.slug, row.id);
  }

  console.log(`Seeded ${ARTICLES.length} published articles`);

  const walnutCover = await upsertMedia(
    prisma,
    'seed/series/walnut',
    '/village.jpg',
  );
  const danubeCover = await upsertMedia(
    prisma,
    'seed/series/danube',
    '/river.jpg',
  );

  const walnut = await prisma.series.upsert({
    where: { slug: 'the-walnut-paths' },
    update: {
      titleBg: 'Ореховите пътеки',
      titleEn: 'The Walnut Paths',
      descriptionBg:
        'Многоепизоден разказ за селата около Белоградчик и хората, които пазят орехите.',
      descriptionEn:
        'A multi-episode narrative about villages near Belogradchik and the people who keep the walnut paths.',
      status: 'ACTIVE',
      coverMediaId: walnutCover.id,
      translationStatus: TranslationStatus.READY,
      translationError: null,
    },
    create: {
      slug: 'the-walnut-paths',
      titleBg: 'Ореховите пътеки',
      titleEn: 'The Walnut Paths',
      descriptionBg:
        'Многоепизоден разказ за селата около Белоградчик и хората, които пазят орехите.',
      descriptionEn:
        'A multi-episode narrative about villages near Belogradchik and the people who keep the walnut paths.',
      status: 'ACTIVE',
      coverMediaId: walnutCover.id,
      translationStatus: TranslationStatus.READY,
    },
  });

  const danube = await prisma.series.upsert({
    where: { slug: 'the-danube-journey' },
    update: {
      titleBg: 'Пътят по Дунава',
      titleEn: 'The Danube Journey',
      descriptionBg: 'Речни портрети от Видин до Лом.',
      descriptionEn: 'River portraits from Vidin to Lom.',
      status: 'ACTIVE',
      coverMediaId: danubeCover.id,
      translationStatus: TranslationStatus.READY,
      translationError: null,
    },
    create: {
      slug: 'the-danube-journey',
      titleBg: 'Пътят по Дунава',
      titleEn: 'The Danube Journey',
      descriptionBg: 'Речни портрети от Видин до Лом.',
      descriptionEn: 'River portraits from Vidin to Lom.',
      status: 'ACTIVE',
      coverMediaId: danubeCover.id,
      translationStatus: TranslationStatus.READY,
    },
  });

  const walnutEpisodeSlugs = [
    'along-the-walnut-paths',
    'walnut-keeper-varbovo',
    'beekeeper-of-the-balkan-edge',
  ];
  const danubeEpisodeSlugs = [
    'letters-from-the-danube-shore',
    'danube-mist-fishermen',
  ];

  for (const [seriesId, slugs] of [
    [walnut.id, walnutEpisodeSlugs] as const,
    [danube.id, danubeEpisodeSlugs] as const,
  ]) {
    await prisma.seriesEpisode.deleteMany({ where: { seriesId } });
    const data = slugs
      .map((slug, index) => {
        const articleId = articleIds.get(slug);
        if (!articleId) return null;
        return { seriesId, articleId, sortOrder: index };
      })
      .filter(Boolean) as Array<{
      seriesId: string;
      articleId: string;
      sortOrder: number;
    }>;
    if (data.length) {
      await prisma.seriesEpisode.createMany({ data });
    }
  }

  console.log('Seeded series: the-walnut-paths, the-danube-journey');
}
