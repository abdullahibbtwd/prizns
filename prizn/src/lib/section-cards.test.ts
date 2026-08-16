import { describe, expect, it } from 'vitest'
import { buildCmsArticle } from '@/test/factories'
import { toHumanStoryCard, toPlaceCard, toSectionCard, toTraditionCard } from './section-cards'

describe('section-cards', () => {
  it('maps place articles to listing cards', () => {
    const card = toPlaceCard(
      buildCmsArticle({
        section: 'places',
        titleBg: 'Belogradchik',
        body: [{ type: 'paragraph', textBg: 'Cliffs at sunset.' }],
      }),
    )

    expect(card).toMatchObject({
      id: 'test-story',
      nameBg: 'Belogradchik',
      detail: 'Cliffs at sunset.',
      actionBg: 'Открийте',
    })
  })

  it('maps tradition articles to listing cards', () => {
    const card = toTraditionCard(
      buildCmsArticle({
        section: 'traditions',
        titleBg: 'Kukeri',
        subtitleBg: 'Winter ritual',
      }),
    )

    expect(card.titleBg).toBe('Kukeri')
    expect(card.description).toBe('First paragraph.')
  })

  it('maps human story articles with series metadata', () => {
    const card = toHumanStoryCard(
      buildCmsArticle({
        section: 'human-stories',
        titleBg: 'Maria',
        series: {
          id: 'series-1',
          slug: 'voices-of-vidin',
          titleBg: 'Гласове',
          titleEn: 'Voices',
          episodeNumber: 2,
        },
      }),
    )

    expect(card.series).toEqual({
      id: 'series-1',
      slug: 'voices-of-vidin',
      title: 'Voices',
      titleBg: 'Гласове',
      episodeNumber: 2,
    })
  })

  it('routes articles to the correct card mapper', () => {
    expect(toSectionCard(buildCmsArticle({ section: 'places' })).section).toBe(
      'places',
    )
    expect(
      toSectionCard(buildCmsArticle({ section: 'traditions' })).section,
    ).toBe('traditions')
    expect(
      toSectionCard(buildCmsArticle({ section: 'human_stories' })).section,
    ).toBe('human-stories')
  })
})
