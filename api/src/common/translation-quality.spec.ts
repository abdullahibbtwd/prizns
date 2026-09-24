import {
  stripEmptyBodyBlocks,
  translationLooksReady,
  validateStoryForPublish,
} from './translation-quality'

describe('translationLooksReady', () => {
  it('rejects Cyrillic copies marked as English', () => {
    expect(translationLooksReady('Здравей свят', 'Здравей свят')).toBe(false)
    expect(translationLooksReady('Здравей свят', 'Hello world')).toBe(true)
    expect(translationLooksReady('Здравей', '')).toBe(false)
  })
})

describe('validateStoryForPublish', () => {
  it('flags READY status when English is still Cyrillic', () => {
    const issues = validateStoryForPublish({
      titleBg: 'Одисея 2026',
      titleEn: 'Одисея 2026',
      translationStatus: 'READY',
      body: [{ type: 'paragraph', textBg: 'Текст', textEn: 'Текст' }],
    })
    expect(issues.some((i) => i.code === 'translation_not_ready')).toBe(true)
  })

  it('flags empty collage and gibberish', () => {
    const issues = validateStoryForPublish({
      titleBg: 'Dunav Ultra: Одисея 2026',
      titleEn: 'Dunav Ultra: Odyssey 2026',
      translationStatus: 'READY',
      body: [
        { type: 'paragraph', textBg: 'asdf testtest', textEn: 'asdf testtest' },
        { type: 'collage', items: [] },
      ],
    })
    expect(issues.map((i) => i.code).sort()).toEqual(
      expect.arrayContaining(['empty_collage', 'gibberish']),
    )
  })

  it('strips empty body blocks including blob collage uploads', () => {
    expect(
      stripEmptyBodyBlocks([
        { type: 'paragraph', textBg: 'ok', textEn: 'ok' },
        { type: 'paragraph', textBg: '', textEn: '' },
        { type: 'collage', items: [{ url: '', mediaId: '' }] },
        { type: 'collage', items: [{ url: 'blob:http://localhost/x' }] },
      ]),
    ).toEqual([{ type: 'paragraph', textBg: 'ok', textEn: 'ok' }])
  })
})
