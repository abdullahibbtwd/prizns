import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EditorialHero } from './EditorialHero'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    h1: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <h1 {...props}>{children}</h1>
    ),
  },
}))

describe('EditorialHero', () => {
  it('renders localized hero copy', () => {
    render(<EditorialHero lang="en" />)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('scrolls to the featured story', async () => {
    const user = userEvent.setup()
    const target = document.createElement('div')
    target.id = 'featured-story'
    target.scrollIntoView = vi.fn()
    document.body.appendChild(target)

    render(<EditorialHero lang="bg" />)
    await user.click(screen.getByRole('button'))
    expect(target.scrollIntoView).toHaveBeenCalled()
  })
})
