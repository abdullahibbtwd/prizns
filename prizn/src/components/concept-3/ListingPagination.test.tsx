import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ListingPagination, pageWindow } from './ListingPagination'

describe('pageWindow', () => {
  it('returns all pages when total fits', () => {
    expect(pageWindow(1, 4)).toEqual([1, 2, 3, 4])
  })

  it('slides the window around the current page', () => {
    expect(pageWindow(1, 53)).toEqual([1, 2, 3, 4, 5])
    expect(pageWindow(10, 53)).toEqual([8, 9, 10, 11, 12])
    expect(pageWindow(53, 53)).toEqual([49, 50, 51, 52, 53])
  })
})

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

  it('exposes first and last page controls for long lists', async () => {
    const user = userEvent.setup()
    const onPage = vi.fn()
    render(
      <ListingPagination lang="en" page={10} totalPages={53} onPage={onPage} />,
    )

    await user.click(screen.getByRole('button', { name: 'First' }))
    expect(onPage).toHaveBeenCalledWith(1)

    await user.click(screen.getByRole('button', { name: 'Last' }))
    expect(onPage).toHaveBeenCalledWith(53)

    expect(screen.getByRole('button', { name: '53' })).toBeInTheDocument()
  })
})
