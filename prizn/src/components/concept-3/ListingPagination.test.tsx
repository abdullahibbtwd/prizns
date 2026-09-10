import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ListingPagination } from './ListingPagination'

describe('ListingPagination', () => {
  it('does not render when there is only one page', () => {
    const { container } = render(
      <ListingPagination lang="en" page={1} totalPages={1} onPage={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('calls onPage for next, previous, and numbered buttons', async () => {
    const user = userEvent.setup()
    const onPage = vi.fn()
    render(
      <ListingPagination lang="en" page={2} totalPages={4} onPage={onPage} />,
    )

    expect(screen.getByLabelText('Pagination')).toBeInTheDocument()
    expect(screen.getByText('Page 2 of 4')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Previous' }))
    expect(onPage).toHaveBeenCalledWith(1)

    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(onPage).toHaveBeenCalledWith(3)

    await user.click(screen.getByRole('button', { name: '4' }))
    expect(onPage).toHaveBeenCalledWith(4)
  })
})
