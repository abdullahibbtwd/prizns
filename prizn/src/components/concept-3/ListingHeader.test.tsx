import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ListingHeader } from './ListingHeader'

const navigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  )
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

describe('ListingHeader', () => {
  it('renders listing metadata', () => {
    render(
      <MemoryRouter>
        <ListingHeader
          lang="en"
          eyebrow="Section"
          title="Places"
          description="Stories from the region"
          countLabel="12 stories"
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Places' })).toBeInTheDocument()
    expect(screen.getByText('12 stories')).toBeInTheDocument()
  })

  it('navigates back when history is empty', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/places']}>
        <Routes>
          <Route
            path="/places"
            element={
              <ListingHeader
                lang="bg"
                eyebrow="S"
                title="T"
                description="D"
              />
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /назад|back/i }))
    expect(navigate).toHaveBeenCalledWith('/')
  })
})
