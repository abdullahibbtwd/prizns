import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderPage } from '@/test/render-page'
import {
  ArticleHeroGallery,
  articleHeroSlides,
} from './ArticleHeroGallery'

describe('articleHeroSlides', () => {
  it('puts the hero first and skips duplicate gallery urls', () => {
    expect(
      articleHeroSlides({
        image: 'https://cdn.example/hero.jpg',
        photoCreditBg: 'Снимка: личен архив',
        gallery: [
          { id: 'g1', url: 'https://cdn.example/hero.jpg', creditBg: null },
          { id: 'g2', url: 'https://cdn.example/two.jpg', creditBg: 'Photo 2' },
        ],
      }),
    ).toEqual([
      {
        id: 'hero',
        url: 'https://cdn.example/hero.jpg',
        creditBg: 'Снимка: личен архив',
      },
      { id: 'g2', url: 'https://cdn.example/two.jpg', creditBg: 'Photo 2' },
    ])
  })
})

describe('ArticleHeroGallery', () => {
  const slides = [
    { id: 'hero', url: 'https://cdn.example/one.jpg', creditBg: 'Credit 1' },
    { id: 'g2', url: 'https://cdn.example/two.jpg', creditBg: 'Credit 2' },
    { id: 'g3', url: 'https://cdn.example/three.jpg', creditBg: null },
  ]

  it('cycles with arrows and selects a thumbnail', async () => {
    const user = userEvent.setup()
    renderPage(<ArticleHeroGallery slides={slides} title="Story" />)

    const hero = screen.getByRole('img', { name: 'Story' })
    expect(hero).toHaveAttribute('src', 'https://cdn.example/one.jpg')
    expect(screen.getByText('Credit 1')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'nextPhoto' }))
    expect(screen.getByRole('img', { name: 'Story' })).toHaveAttribute(
      'src',
      'https://cdn.example/two.jpg',
    )
    expect(screen.getByText('Credit 2')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'photoOf' })[2]!)
    expect(screen.getByRole('img', { name: 'Story' })).toHaveAttribute(
      'src',
      'https://cdn.example/three.jpg',
    )
  })
})
