import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Logo } from './Logo'

describe('Logo', () => {
  it('renders the brand image and slogan by default', () => {
    render(<Logo />)
    expect(screen.getByAltText('Prizni')).toHaveAttribute('src', '/prizni.svg')
    expect(screen.getByText(/Неразказаните истории/)).toBeInTheDocument()
  })

  it('hides the slogan when requested', () => {
    render(<Logo showSlogan={false} />)
    expect(screen.queryByText(/Неразказаните истории/)).not.toBeInTheDocument()
  })
})
