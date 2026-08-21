import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { NewsletterSection } from './NewsletterSection'
import { AuthorsSection } from './AuthorsSection'

const subscribeNewsletter = vi.fn()
const usePublicAuthors = vi.fn()

vi.mock('@/lib/newsletter-api', () => ({
  subscribeNewsletter: (...args: unknown[]) => subscribeNewsletter(...args),
}))

vi.mock('@/lib/public-content', async () => {
  const actual = await vi.importActual<typeof import('@/lib/public-content')>(
    '@/lib/public-content',
  )
  return {
    ...actual,
    usePublicAuthors: (...args: unknown[]) => usePublicAuthors(...args),
  }
})

describe('NewsletterSection', () => {
  it('subscribes an email address', async () => {
    subscribeNewsletter.mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(<NewsletterSection lang="en" />)
    await user.type(screen.getByRole('textbox'), 'reader@example.com')
    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(subscribeNewsletter).toHaveBeenCalledWith(
        'reader@example.com',
        'website',
      )
    })
  })
})

describe('AuthorsSection', () => {
  it('renders author cards from the API', () => {
    usePublicAuthors.mockReturnValue({
      data: [
        {
          slug: 'maria',
          name: 'Maria',
          nameBg: 'Мария',
          role: 'Editor',
          roleBg: 'Редактор',
          image: 'https://cdn.example/maria.jpg',
          storyCount: 4,
          quote: 'Stories find us.',
          quoteBg: 'Историите ни намират.',
        },
      ],
    })

    render(
      <MemoryRouter>
        <AuthorsSection lang="en" />
      </MemoryRouter>,
    )
    expect(screen.getByText('Maria')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'The Prizni Team' })).toBeInTheDocument()
    expect(screen.getByText(/4 stories/)).toBeInTheDocument()
  })
})
