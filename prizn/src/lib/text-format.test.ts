import { describe, expect, it } from 'vitest'
import { joinMetaParts, truncateAtWord } from './text-format'

describe('joinMetaParts', () => {
  it('joins non-empty parts with a middle dot', () => {
    expect(joinMetaParts('12 May', 'Vidin')).toBe('12 May · Vidin')
  })

  it('skips empty parts so no trailing separator remains', () => {
    expect(joinMetaParts('12 May', '')).toBe('12 May')
    expect(joinMetaParts('', 'Vidin')).toBe('Vidin')
    expect(joinMetaParts(' ', null, undefined)).toBe('')
  })
})

describe('truncateAtWord', () => {
  it('returns short text unchanged', () => {
    expect(truncateAtWord('Short line', 40)).toBe('Short line')
  })

  it('cuts on a word boundary and appends an ellipsis', () => {
    const text = 'The quiet roads of Northwestern Bulgaria stretch for miles'
    expect(truncateAtWord(text, 28)).toBe('The quiet roads of…')
  })
})
