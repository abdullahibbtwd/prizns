export type CmsStoryStatus = 'draft' | 'review' | 'scheduled' | 'published' | 'archived'

export interface CmsStory {
  id: string
  title: string
  subtitle: string
  author: string
  category: string
  language: 'EN' | 'BG' | 'EN/BG'
  views: number
  status: CmsStoryStatus
  image: string
  updatedAt: string
  series?: string
  sponsored?: boolean
}

export interface CmsAuthor {
  id: string
  name: string
  role: string
  location: string
  stories: number
  image: string
  expertise: string
}

export interface CmsSubmission {
  id: string
  name: string
  village: string
  email: string
  title: string
  category: string
  status: 'new' | 'review' | 'changes' | 'approved' | 'rejected'
  submittedAt: string
  image: string
}

export interface CmsDonation {
  id: string
  name: string
  amount: number
  campaign: string
  status: 'completed' | 'pending' | 'failed'
  createdAt: string
}

export interface CmsPartnership {
  id: string
  business: string
  contact: string
  type: string
  status: 'new' | 'contacted' | 'negotiating' | 'won' | 'lost'
  updatedAt: string
}

export const cmsStories: CmsStory[] = [
  {
    id: 's1',
    title: 'Along the Walnut Paths of Northwestern Bulgaria',
    subtitle: 'A silent walk through forgotten stone villages.',
    author: 'Albena Nikolova',
    category: 'Human Stories',
    language: 'EN/BG',
    views: 8420,
    status: 'published',
    image: '/village.jpg',
    updatedAt: '2026-08-04',
    series: "Grandmother's Story",
  },
  {
    id: 's2',
    title: 'The Walnut Keeper of Varbovo',
    subtitle: 'Every morning before dawn, Ana-Maria walks the same stone path.',
    author: 'Albena Nikolova',
    category: 'Human Stories',
    language: 'BG',
    views: 5210,
    status: 'published',
    image: '/woman.jpg',
    updatedAt: '2026-08-03',
  },
  {
    id: 's3',
    title: 'Hands Against the Red Rocks',
    subtitle: 'Local climbers treat Belogradchik sandstone like a grammar.',
    author: 'Natalia Dimitrova',
    category: 'Sports',
    language: 'EN',
    views: 2104,
    status: 'draft',
    image: '/mountains.jpg',
    updatedAt: '2026-08-05',
  },
  {
    id: 's4',
    title: 'Chiprovtsi Carpet Fair',
    subtitle: 'Looms in the square and patterns that travel farther than buses.',
    author: 'Angelika Petrova',
    category: 'Events',
    language: 'EN/BG',
    views: 0,
    status: 'scheduled',
    image: '/festival.jpg',
    updatedAt: '2026-08-05',
    sponsored: true,
  },
  {
    id: 's5',
    title: 'Kilim in Motion',
    subtitle: 'A short film where hands and thread keep the same tempo.',
    author: 'Natalia Dimitrova',
    category: 'Video',
    language: 'EN',
    views: 980,
    status: 'review',
    image: '/craftsman.jpg',
    updatedAt: '2026-08-02',
  },
  {
    id: 's6',
    title: 'Letters from the Danube Shore',
    subtitle: "A fisherman's handwritten journals from Vidin.",
    author: 'Inna Gerova',
    category: 'Human Stories',
    language: 'BG',
    views: 3902,
    status: 'published',
    image: '/river.jpg',
    updatedAt: '2026-07-28',
    series: "Grandmother's Story",
  },
]

export const cmsAuthors: CmsAuthor[] = [
  {
    id: 'a1',
    name: 'Albena Nikolova',
    role: 'Editor-in-Chief',
    location: 'Belogradchik / Sofia',
    stories: 18,
    image: '/woman.jpg',
    expertise: 'Long-form, villages',
  },
  {
    id: 'a2',
    name: 'Inna Gerova',
    role: 'Senior Writer',
    location: 'Vidin / Lom',
    stories: 14,
    image: '/heroimg.jpg',
    expertise: 'River towns, memory',
  },
  {
    id: 'a3',
    name: 'Angelika Petrova',
    role: 'Culture Editor',
    location: 'Chiprovtsi',
    stories: 11,
    image: '/craftsman.jpg',
    expertise: 'Crafts, traditions',
  },
  {
    id: 'a4',
    name: 'Natalia Dimitrova',
    role: 'Photojournalist',
    location: 'Vratsa Balkan',
    stories: 9,
    image: '/village.jpg',
    expertise: 'Photography, film',
  },
]

export const cmsSubmissions: CmsSubmission[] = [
  {
    id: 'sub1',
    name: 'Elena Marinova',
    village: 'Varbovo',
    email: 'elena@example.com',
    title: 'My grandmother’s bread oven',
    category: 'Traditions',
    status: 'new',
    submittedAt: '2026-08-05',
    image: '/bread.jpg',
  },
  {
    id: 'sub2',
    name: 'Georgi Petrov',
    village: 'Lom',
    email: 'georgi@example.com',
    title: 'Night fishing with my uncle',
    category: 'Human Stories',
    status: 'review',
    submittedAt: '2026-08-04',
    image: '/river.jpg',
  },
  {
    id: 'sub3',
    name: 'Maria Ivanova',
    village: 'Chiprovtsi',
    email: 'maria@example.com',
    title: 'Learning the loom at sixteen',
    category: 'Culture',
    status: 'changes',
    submittedAt: '2026-08-01',
    image: '/craftsman.jpg',
  },
]

export const cmsDonations: CmsDonation[] = [
  { id: 'd1', name: 'Anonymous', amount: 25, campaign: 'Reading Rooms', status: 'completed', createdAt: '2026-08-05' },
  { id: 'd2', name: 'Stefan K.', amount: 50, campaign: 'Apprentice the Loom', status: 'completed', createdAt: '2026-08-04' },
  { id: 'd3', name: 'Nadia P.', amount: 10, campaign: 'General Support', status: 'pending', createdAt: '2026-08-04' },
  { id: 'd4', name: 'Museum Friends', amount: 200, campaign: 'Document Dialects', status: 'completed', createdAt: '2026-08-03' },
]

export const cmsPartnerships: CmsPartnership[] = [
  { id: 'p1', business: 'Vidin Tourism Board', contact: 'Irina D.', type: 'Tourism', status: 'negotiating', updatedAt: '2026-08-04' },
  { id: 'p2', business: 'Chiprovtsi Museum', contact: 'Petar M.', type: 'Media', status: 'contacted', updatedAt: '2026-08-03' },
  { id: 'p3', business: 'Northwest Winery Co-op', contact: 'Anna S.', type: 'Sponsored Stories', status: 'new', updatedAt: '2026-08-05' },
  { id: 'p4', business: 'Balkan Trails NGO', contact: 'Kiril T.', type: 'Campaigns', status: 'won', updatedAt: '2026-07-20' },
]

export const cmsPlaces = [
  { id: 'belogradchik', name: 'Belogradchik', stories: 12, image: '/mountains.jpg' },
  { id: 'vidin', name: 'Vidin', stories: 9, image: '/river.jpg' },
  { id: 'montana', name: 'Montana', stories: 6, image: '/bread.jpg' },
  { id: 'vratsa', name: 'Vratsa', stories: 11, image: '/forest.jpg' },
  { id: 'chiprovtsi', name: 'Chiprovtsi', stories: 14, image: '/craftsman.jpg' },
]

export const cmsTraditions = [
  { id: 't1', name: 'Christmas', articles: 4, image: '/church.jpg' },
  { id: 't2', name: 'Wedding', articles: 3, image: '/festival.jpg' },
  { id: 't3', name: 'Bread', articles: 5, image: '/bread.jpg' },
  { id: 't4', name: 'Harvest', articles: 6, image: '/village.jpg' },
  { id: 't5', name: 'Horse Festival', articles: 2, image: '/mountains.jpg' },
]

export const cmsSeries = [
  {
    id: 'ser1',
    title: "Grandmother's Story",
    episodes: [
      { id: 'e1', title: 'Episode 1 — The Oven', status: 'published' as const },
      { id: 'e2', title: 'Episode 2 — The Path', status: 'published' as const },
      { id: 'e3', title: 'Episode 3 — The Loom', status: 'scheduled' as const },
      { id: 'e4', title: 'Episode 4 — The River', status: 'draft' as const },
    ],
  },
]

export const cmsTasks = [
  'Review new Write for Us submissions',
  'Publish Episode 4 of Grandmother’s Story',
  'Approve pending donations',
  'Schedule Instagram posts for Walnut Paths',
]

export const cmsAiSuggestions = [
  '5 articles missing SEO meta descriptions',
  'Translate 3 Bulgarian drafts to English',
  'Generate Instagram posts for Chiprovtsi fair',
]

export const cmsMostRead = [
  { title: 'Ana-Maria — The Walnut Keeper', views: 4210 },
  { title: 'Belogradchik Night Paths', views: 3180 },
  { title: 'Walnut Harvest Along the Cliffs', views: 2904 },
]
