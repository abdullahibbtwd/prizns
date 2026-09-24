import { renderHook, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useJournalLang } from './useJournalLang'

const changeLanguage = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'bg', changeLanguage },
    t: (key: string) => key,
  }),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter initialEntries={['/stories']}>{children}</MemoryRouter>
}

describe('useJournalLang', () => {
  it('derives language from the URL and navigates on switch', () => {
    const { result } = renderHook(() => useJournalLang(), { wrapper })
    expect(result.current.lang).toBe('bg')

    act(() => {
      result.current.setLang('en')
    })

    expect(changeLanguage).toHaveBeenCalledWith('en')
    expect(localStorage.getItem('prizni-lang')).toBe('en')
  })
})
