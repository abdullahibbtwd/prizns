import { describe, expect, it } from 'vitest'
import {
  stripEmptyBodyBlocks,
  translationLooksReady,
  validateStoryForPublish,
} from './translation-quality'

describe('translationLooksReady', () => {
  it('rejects Cyrillic English copies', () => {
    expect(translationLooksReady('Одисея', 'Одисея')).toBe(false)
    expect(translationLooksReady('Одисея', 'Odyssey')).toBe(true)
  })
})

describe('validateStoryForPublish', () => {
  it('would catch the F-05 Dunav Ultra draft pattern', () => {
    const issues = validateStoryForPublish({
      titleBg: 'Dunav Ultra: Одисея 2026',
      titleEn: 'Dunav Ultra: Одисея 2026',
      translationStatus: 'READY',
      body: [
        { type: 'paragraph', textBg: 'asdf testtest content', textEn: 'asdf' },
        { type: 'collage', items: [] },
        { type: 'collage', items: [{ url: 'blob:http://localhost/x' }] },
      ],
    })
    expect(issues.map((i) => i.code)).toEqual(
      expect.arrayContaining([
        'translation_not_ready',
        'empty_collage',
        'gibberish',
      ]),
    )
  })

  it('strips empty collage blocks including blob uploads', () => {
    expect(
      stripEmptyBodyBlocks([
        { type: 'paragraph', textBg: 'ok', textEn: 'ok' },
        { type: 'collage', items: [] },
        { type: 'collage', items: [{ url: 'blob:http://localhost/x' }] },
      ]),
    ).toHaveLength(1)
  })
})
