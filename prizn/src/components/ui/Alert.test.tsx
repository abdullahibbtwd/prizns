import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Alert } from './Alert'

describe('Alert', () => {
  it('renders an inline error with a dismiss button', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Alert
        open
        mode="inline"
        variant="error"
        title="Failed"
        message="Could not save"
        duration={0}
        onClose={onClose}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Could not save')
    await user.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('auto-dismisses toasts', async () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    render(
      <Alert open message="Saved" variant="success" duration={1000} onClose={onClose} />,
    )
    await vi.advanceTimersByTimeAsync(1100)
    expect(onClose).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('renders nothing when closed', () => {
    render(<Alert open={false} message="Hidden" mode="inline" />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
