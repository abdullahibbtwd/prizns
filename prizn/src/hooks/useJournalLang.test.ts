import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useJournalLang } from './useJournalLang'

const changeLanguage = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'bg', changeLanguage },
  }),
}))

describe('useJournalLang', () => {
  it('persists the active language', () => {
    const { result } = renderHook(() => useJournalLang())
    expect(result.current.lang).toBe('bg')

    act(() => {
      result.current.setLang('en')
    })

    expect(changeLanguage).toHaveBeenCalledWith('en')
    expect(localStorage.getItem('prizni-lang')).toBe('bg')
  })
})
