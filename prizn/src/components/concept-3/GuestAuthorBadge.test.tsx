import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  GuestAuthorBadge,
  guestAuthorLabel,
  isGuestRoleText,
} from './GuestAuthorBadge'

describe('GuestAuthorBadge', () => {
  it('labels the pill in English and Bulgarian', () => {
    expect(guestAuthorLabel('en')).toBe('Guest author')
    expect(guestAuthorLabel('bg')).toBe('Гост автор')
  })

  it('renders the Bulgarian pill', () => {
    render(<GuestAuthorBadge lang="bg" />)
    expect(screen.getByText('Гост автор')).toBeInTheDocument()
  })

  it('recognises the default guest role so it is not shown twice', () => {
    expect(isGuestRoleText('Гост автор')).toBe(true)
    expect(isGuestRoleText(' Guest Author ')).toBe(true)
    expect(isGuestRoleText('Фотограф')).toBe(false)
    expect(isGuestRoleText(null)).toBe(false)
  })
})
