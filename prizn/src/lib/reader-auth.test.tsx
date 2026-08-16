import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReaderAuthProvider, useReaderAuth } from './reader-auth'
import * as readerApi from '@/lib/reader-api'
import { ApiError } from '@/lib/api'

vi.mock('@/lib/reader-api', () => ({
  getReaderMe: vi.fn(),
  logoutReader: vi.fn(),
  refreshReaderSession: vi.fn(),
  requestMagicLink: vi.fn(),
  saveArticle: vi.fn(),
}))

vi.mock('@/lib/api', async () => {
  class MockApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  }
  return { ApiError: MockApiError, api: { get: vi.fn(), post: vi.fn() } }
})

function Probe() {
  const { reader, loading, openSignIn, closeSignIn, modalOpen, requestLink, logout } =
    useReaderAuth()
  if (loading) return <div>loading</div>
  return (
    <div>
      <span>{reader ? reader.email : 'anon'}</span>
      <span>{modalOpen ? 'modal-open' : 'modal-closed'}</span>
      <button type="button" onClick={() => openSignIn({ returnUrl: '/me' })}>
        open
      </button>
      <button type="button" onClick={closeSignIn}>
        close
      </button>
      <button
        type="button"
        onClick={() => void requestLink('r@x.com', 'en')}
      >
        request
      </button>
      <button type="button" onClick={() => void logout()}>
        logout
      </button>
    </div>
  )
}

describe('ReaderAuthProvider', () => {
  it('bootstraps a logged-in reader', async () => {
    vi.mocked(readerApi.getReaderMe).mockResolvedValue({
      reader: { id: 'r1', email: 'r@x.com', name: null, locale: 'en' },
    })

    render(
      <ReaderAuthProvider>
        <Probe />
      </ReaderAuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('r@x.com')).toBeInTheDocument()
    })
  })

  it('opens the modal and authenticates via magic link', async () => {
    vi.mocked(readerApi.getReaderMe).mockRejectedValue(new ApiError(401, 'no'))
    vi.mocked(readerApi.refreshReaderSession).mockRejectedValue(
      new ApiError(401, 'no'),
    )
    vi.mocked(readerApi.requestMagicLink).mockResolvedValue({
      ok: true,
      authenticated: true,
      reader: { id: 'r1', email: 'r@x.com', name: null, locale: 'en' },
      intent: { type: 'save', articleId: 'art-1' },
      returnUrl: '/stories/x',
    })
    vi.mocked(readerApi.saveArticle).mockResolvedValue({
      ok: true,
      saved: true,
      id: 's1',
    })
    vi.mocked(readerApi.logoutReader).mockResolvedValue({ ok: true })

    const user = userEvent.setup()
    render(
      <ReaderAuthProvider>
        <Probe />
      </ReaderAuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('anon')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'open' }))
    expect(screen.getByText('modal-open')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'close' }))
    expect(screen.getByText('modal-closed')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'open' }))
    await user.click(screen.getByRole('button', { name: 'request' }))
    await waitFor(() => {
      expect(screen.getByText('r@x.com')).toBeInTheDocument()
    })
    expect(readerApi.saveArticle).toHaveBeenCalledWith('art-1')

    await user.click(screen.getByRole('button', { name: 'logout' }))
    await waitFor(() => {
      expect(screen.getByText('anon')).toBeInTheDocument()
    })
  })
})
