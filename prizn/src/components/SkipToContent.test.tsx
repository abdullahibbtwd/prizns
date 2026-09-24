import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SkipToContent } from './SkipToContent'
import { JournalShell } from './concept-3/JournalShell'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'bg', changeLanguage: vi.fn() },
  }),
}))

vi.mock('@/hooks/useJournalLang', () => ({
  useJournalLang: () => ({ lang: 'bg', setLang: vi.fn() }),
}))

vi.mock('@/components/concept-3/MinimalNav', () => ({
  MinimalNav: () => <div data-testid="nav" />,
}))

vi.mock('@/components/concept-3/JournalFooter', () => ({
  JournalFooter: () => null,
}))

describe('SkipToContent', () => {
  it('is the first link and targets main content', () => {
    render(
      <JournalShell>
        {() => <p>Body</p>}
      </JournalShell>,
    )
    const skip = screen.getByRole('link', { name: 'skipToContent' })
    expect(skip).toHaveAttribute('href', '#main-content')
    expect(document.getElementById('main-content')).toBeTruthy()
    expect(document.body.querySelector('a')).toBe(skip)
  })
})
