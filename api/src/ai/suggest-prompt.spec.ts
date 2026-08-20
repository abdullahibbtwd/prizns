import { buildSuggestPrompt, isThinDraft } from './suggest-prompt'

describe('suggest prompt', () => {
  it('marks a stub like "test" as too thin to invent a story', () => {
    expect(
      isThinDraft({ titleBg: 'test', subtitleBg: '', bodyText: '' }),
    ).toBe(true)
    expect(
      isThinDraft({
        titleBg: 'Belogradchik rocks at dusk',
        bodyText: 'The sandstone glowed after the storm.',
      }),
    ).toBe(false)
  })

  it('forbids invented regional copy when the draft is a stub', () => {
    const prompt = buildSuggestPrompt({
      langLabel: 'English',
      section: 'human-stories',
      titleBg: 'test',
      subtitleBg: '',
      bodyText: '',
      variation: 'seed-1',
    })
    expect(prompt).toContain('Do NOT invent villages')
    expect(prompt).toContain('Title: test')
    expect(prompt).not.toContain('generic "voices of the northwest"')
  })

  it('asks for concrete draft details when there is real text', () => {
    const prompt = buildSuggestPrompt({
      langLabel: 'Bulgarian',
      section: 'places',
      titleBg: 'Белоградчик',
      subtitleBg: '',
      locationBg: 'Белоградчик',
      categoryBg: 'Места',
      bodyText: 'Скалите над града светнаха след дъжда.',
      variation: 'seed-2',
    })
    expect(prompt).toContain('concrete detail from THIS draft')
    expect(prompt).toContain('Location: Белоградчик')
    expect(prompt).toContain('Скалите над града светнаха след дъжда.')
  })
})
