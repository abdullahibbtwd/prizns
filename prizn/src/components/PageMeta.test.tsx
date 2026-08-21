import { render } from '@testing-library/react'
import { HelmetProvider } from 'react-helmet-async'
import { describe, expect, it } from 'vitest'
import { PageMeta } from './PageMeta'

describe('PageMeta', () => {
  it('sets title, description, and robots', () => {
    render(
      <HelmetProvider>
        <PageMeta
          title="Belogradchik"
          description="Cliffs of the northwest"
          path="/places/belogradchik"
          image="/hero.jpg"
          type="article"
          lang="en"
          noIndex
        />
      </HelmetProvider>,
    )

    expect(document.title).toBe('Belogradchik · Prizni')
    const desc = document.head.querySelector('meta[name="description"]')
    expect(desc?.getAttribute('content')).toBe('Cliffs of the northwest')
    const robots = document.head.querySelector('meta[name="robots"]')
    expect(robots?.getAttribute('content')).toBe('noindex,nofollow')
    const ogImage = document.head.querySelector('meta[property="og:image"]')
    expect(ogImage?.getAttribute('content')).toContain('/hero.jpg')
  })

  it('falls back to the default share image', () => {
    render(
      <HelmetProvider>
        <PageMeta title="Home" path="/" lang="bg" />
      </HelmetProvider>,
    )
    const ogImage = document.head.querySelector('meta[property="og:image"]')
    expect(ogImage?.getAttribute('content')).toContain('/og-default.png')
    expect(
      document.head.querySelector('meta[name="twitter:card"]')?.getAttribute('content'),
    ).toBe('summary_large_image')
  })
})
