import type { CmsArticle } from '@/lib/cms-types'

export function buildCmsArticle(
  overrides: Partial<CmsArticle> = {},
): CmsArticle {
  return {
    id: 'art-1',
    slug: 'test-story',
    section: 'places',
    path: '/places/test-story',
    status: 'PUBLISHED',
    title: 'Place Story',
    titleBg: 'Място',
    subtitle: 'Subtitle',
    subtitleBg: 'Подзаглавие',
    category: 'Places',
    categoryBg: 'Места',
    readTime: '5 min',
    readTimeBg: '5 мин',
    location: 'Vidin',
    locationBg: 'Видин',
    date: '2026',
    dateBg: '2026',
    author: 'Author',
    authorBg: 'Автор',
    image: 'https://cdn.example/hero.jpg',
    photoCredit: '',
    photoCreditBg: '',
    endLabel: 'End',
    endLabelBg: 'Край',
    featured: false,
    translationStatus: 'READY',
    body: [{ type: 'paragraph', textBg: 'First paragraph.' }],
    sponsored: false,
    sourced: false,
    sponsorName: null,
    ...overrides,
  }
}
