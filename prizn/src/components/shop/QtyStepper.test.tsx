import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { QtyStepper } from './QtyStepper'

describe('QtyStepper', () => {
  it('renders the current quantity', () => {
    render(<QtyStepper value={2} max={5} onChange={() => {}} />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('increments and decrements within bounds', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<QtyStepper value={2} min={1} max={3} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: '+' }))
    expect(onChange).toHaveBeenCalledWith(3)

    await user.click(screen.getByRole('button', { name: '−' }))
    expect(onChange).toHaveBeenLastCalledWith(1)
  })

  it('disables controls at min and max', () => {
    render(<QtyStepper value={1} min={1} max={1} onChange={() => {}} disabled />)

    expect(screen.getByRole('button', { name: '+' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '−' })).toBeDisabled()
  })
})
