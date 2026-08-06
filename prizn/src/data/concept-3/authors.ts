import type { JournalArticle } from '@/data/concept-3/articleTypes'
import { journalArticles } from '@/data/concept-3/articles'

export interface JournalAuthor {
  slug: string
  sourceId: string
  path: string
  name: string
  nameBg: string
  role: string
  roleBg: string
  quote: string
  quoteBg: string
  image: string
  location: string
  locationBg: string
  bio: string
  bioBg: string
  /** Extra bylines that should resolve to this author */
  aliases?: string[]
}

export const journalAuthors: JournalAuthor[] = [
  {
    slug: 'albena-nikolova',
    sourceId: 'a1',
    path: '/authors/albena-nikolova',
    name: 'Albena Nikolova',
    nameBg: 'Албена Николова',
    role: 'Editor-in-Chief',
    roleBg: 'Главен редактор',
    quote: 'Believes every village has a story worth preserving.',
    quoteBg:
      'Вярва, че всяко село пази история, която си струва да се разкаже.',
    image: '/woman.jpg',
    location: 'Belogradchik / Sofia',
    locationBg: 'Белоградчик / София',
    bio: 'Albena founded The Living Journal to slow the pace of regional storytelling. She walks Northwest roads with a notebook, listening for the quiet sentences that rarely make national news — and shaping them into long-form pieces that honor both place and people.',
    bioBg:
      'Албена основава Живия журнал, за да забави темпото на регионалното разказване. Върви по пътищата на Северозапада с тетрадка, вслушва се в тихите изречения, които рядко стигат до националните новини — и ги оформя в дълги текстове, които почитат мястото и хората.',
    aliases: ['Albena Stoyanova', 'Албена Стоянова'],
  },
  {
    slug: 'inna-gerova',
    sourceId: 'a2',
    path: '/authors/inna-gerova',
    name: 'Inna Gerova',
    nameBg: 'Инна Герова',
    role: 'Senior Writer',
    roleBg: 'Старши автор',
    quote: 'Listens for the quieter truths between mountain mornings.',
    quoteBg: 'Слуша тихите истини между планинските утрини.',
    image: '/heroimg.jpg',
    location: 'Vidin / Lom',
    locationBg: 'Видин / Лом',
    bio: 'Inna writes from river towns and museum corridors. Her reporting treats journals, bells, and borrowed oars as evidence — building portraits where weather and memory share equal weight.',
    bioBg:
      'Инна пише от крайречни градове и музейни коридори. Репортажите ѝ приемат дневници, камбани и заети весла като доказателства — портрети, в които времето и паметта тежат еднакво.',
  },
  {
    slug: 'angelika-petrova',
    sourceId: 'a3',
    path: '/authors/angelika-petrova',
    name: 'Angelika Petrova',
    nameBg: 'Ангелика Петрова',
    role: 'Culture Editor',
    roleBg: 'Културен редактор',
    quote: 'Documents crafts before the hands that know them are gone.',
    quoteBg:
      'Документира занаяти, преди ръцете, които ги знаят, да изчезнат.',
    image: '/craftsman.jpg',
    location: 'Chiprovtsi',
    locationBg: 'Чипровци',
    bio: 'Angelika sits with weavers, bakers, and feast-keepers until patterns become language. She edits culture stories with a loom-worker’s patience — measuring each line against what the hands themselves would recognize as true.',
    bioBg:
      'Ангелика сяда при тъкачки, хлебари и пазители на празници, докато мотивите станат език. Редактира културни истории с търпението на човек на стана — мерее всяко изречение спрямо онова, което самите ръце биха приели за вярно.',
  },
  {
    slug: 'natalia-dimitrova',
    sourceId: 'a4',
    path: '/authors/natalia-dimitrova',
    name: 'Natalia Dimitrova',
    nameBg: 'Наталия Димитрова',
    role: 'Photojournalist',
    roleBg: 'Фотожурналист',
    quote: 'Sees light as the first language of memory.',
    quoteBg: 'Вижда светлината като първия език на паметта.',
    image: '/village.jpg',
    location: 'Vratsa Balkan',
    locationBg: 'Врачански Балкан',
    bio: 'Natalia photographs the Northwest in hours when most cameras sleep — fog lifts, hives wake, chapels keep their doors half open. Her frames accompany text the way breath accompanies speech: never louder than the story, always necessary.',
    bioBg:
      'Наталия снима Северозапада в часове, когато повечето камери спят — мъглата се вдига, кошерите се събуждат, параклисите държат вратите полуотворени. Кадрите ѝ придружават текста както дъхът придружава речта: никога по-силно от историята, винаги необходими.',
  },
]

export function getAuthorBySlug(slug: string): JournalAuthor | undefined {
  return journalAuthors.find((author) => author.slug === slug)
}

export function getAuthorBySourceId(sourceId: string): JournalAuthor | undefined {
  return journalAuthors.find((author) => author.sourceId === sourceId)
}

export function getAuthorByName(name: string): JournalAuthor | undefined {
  const normalized = name.trim().toLowerCase()
  return journalAuthors.find((author) => {
    if (author.name.toLowerCase() === normalized) return true
    if (author.nameBg.toLowerCase() === normalized) return true
    return author.aliases?.some((alias) => alias.toLowerCase() === normalized)
  })
}

export function getAuthorForArticle(
  article: JournalArticle,
): JournalAuthor | undefined {
  if (article.authorSlug) {
    return getAuthorBySlug(article.authorSlug)
  }
  return getAuthorByName(article.author) ?? getAuthorByName(article.authorBg)
}

export function getArticlesByAuthor(author: JournalAuthor): JournalArticle[] {
  return journalArticles.filter((article) => {
    if (article.authorSlug === author.slug) return true
    if (article.author === author.name || article.authorBg === author.nameBg) {
      return true
    }
    return Boolean(
      author.aliases?.some(
        (alias) => alias === article.author || alias === article.authorBg,
      ),
    )
  })
}
