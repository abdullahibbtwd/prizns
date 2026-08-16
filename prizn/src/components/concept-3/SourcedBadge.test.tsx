import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SourcedBadge, sourcedLabel } from './SourcedBadge'

describe('SourcedBadge', () => {
  it('labels the pill in English and Bulgarian', () => {
    expect(sourcedLabel('en')).toBe('Sourced')
    expect(sourcedLabel('bg')).toBe('Проверена')
  })

  it('renders the English sourced pill', () => {
    render(<SourcedBadge lang="en" />)
    expect(screen.getByText('Sourced')).toBeInTheDocument()
  })
})
