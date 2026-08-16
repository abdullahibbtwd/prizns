import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderPage } from '@/test/render-page'
import ArchivePage from './index'

vi.mock('@/components/concept-3/JournalShell', () => ({
  JournalShell: ({
    children,
  }: {
    children: (ctx: { lang: 'en' | 'bg' }) => React.ReactNode
  }) => <div>{children({ lang: 'en' })}</div>,
}))

vi.mock('@/lib/reader-auth', () => ({
  useReaderAuth: () => ({ reader: null, loading: false }),
}))

const askArchive = vi.fn()

vi.mock('@/lib/ai-api', () => ({
  askArchive: (...args: unknown[]) => askArchive(...args),
}))

vi.mock('@/hooks/useJournalLang', () => ({
  useJournalLang: () => ({ lang: 'en', setLang: vi.fn() }),
}))

describe('ArchivePage', () => {
  it('asks the archive and shows citations', async () => {
    const user = userEvent.setup()
    askArchive.mockResolvedValue({
      refused: false,
      answer: 'Kukeri are winter masquerades.',
      lang: 'en',
      citations: [
        {
          path: '/traditions/kukeri',
          title: 'Kukeri',
          titleBg: 'Кукери',
          score: 0.71,
        },
      ],
    })
    renderPage(<ArchivePage />)
    await user.type(
      screen.getByPlaceholderText(/Kukeri in the Vidin region/),
      'What are Kukeri?',
    )
    await user.click(screen.getByRole('button', { name: 'Ask' }))
    expect(await screen.findByText('Kukeri are winter masquerades.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kukeri' })).toHaveAttribute(
      'href',
      '/traditions/kukeri',
    )
  })

  it('shows a refusal when nothing matches', async () => {
    const user = userEvent.setup()
    askArchive.mockResolvedValue({
      refused: true,
      answer: null,
      lang: 'en',
      citations: [],
    })
    renderPage(<ArchivePage />)
    await user.type(
      screen.getByPlaceholderText(/Kukeri in the Vidin region/),
      'What is the capital of France?',
    )
    await user.click(screen.getByRole('button', { name: 'Ask' }))
    await waitFor(() => {
      expect(
        screen.getByText(/Nothing in the archive is close enough/),
      ).toBeInTheDocument()
    })
  })
})
