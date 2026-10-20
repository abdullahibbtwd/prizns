import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ListingDateInput } from './ListingDateInput'

describe('ListingDateInput', () => {
  it('shows a Bulgarian formatted date and opens a Bulgarian month grid', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <ListingDateInput
        lang="bg"
        name="dateFrom"
        label="От дата"
        value="2024-03-04"
        onChange={onChange}
      />,
    )

    expect(screen.getByRole('button', { name: 'От дата' })).toHaveTextContent(
      /4.*март.*2024/i,
    )

    await user.click(screen.getByRole('button', { name: 'От дата' }))
    expect(screen.getByText('март 2024')).toBeInTheDocument()
    expect(screen.getByText('пн')).toBeInTheDocument()
    expect(screen.getByText('нд')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '15' }))
    expect(onChange).toHaveBeenCalledWith('2024-03-15')
  })
})
