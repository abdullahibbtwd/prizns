import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  EpisodeBadge,
  episodeLabel,
} from './EpisodeBadge'
import {
  SponsoredBadge,
  sponsoredLabel,
} from './SponsoredBadge'
import { ViewAllLink } from './ViewAllLink'
import { MemoryRouter } from 'react-router-dom'

describe('sponsoredLabel', () => {
  it('localizes with and without sponsor name', () => {
    expect(sponsoredLabel('bg')).toBe('Спонсорирано')
    expect(sponsoredLabel('en', 'Acme')).toBe('Sponsored by Acme')
  })
})

describe('SponsoredBadge', () => {
  it('renders the localized label', () => {
    render(<SponsoredBadge lang="en" sponsorName="Partner" tone="onLight" />)
    expect(screen.getByText('Sponsored by Partner')).toBeInTheDocument()
  })
})

describe('episodeLabel', () => {
  it('formats episode copy in both languages', () => {
    const series = { title: 'Voices', titleBg: 'Гласове', episodeNumber: 3 }
    expect(episodeLabel('en', series)).toBe('Episode 3 of Voices')
    expect(episodeLabel('bg', series)).toContain('Епизод 3')
  })
})

describe('EpisodeBadge', () => {
  it('renders series metadata', () => {
    render(
      <EpisodeBadge
        lang="en"
        series={{ title: 'Voices', titleBg: 'Гласове', episodeNumber: 2 }}
      />,
    )
    expect(screen.getByText('Episode 2 of Voices')).toBeInTheDocument()
  })
})

describe('ViewAllLink', () => {
  it('links to the listing page', () => {
    render(
      <MemoryRouter>
        <ViewAllLink to="/places" lang="bg" />
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: /вижте всички/i })
    expect(link).toHaveAttribute('href', '/places')
  })
})
