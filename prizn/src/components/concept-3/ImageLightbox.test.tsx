import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderPage } from '@/test/render-page'
import { ImageLightbox } from './ImageLightbox'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

const slides = [
  { url: 'https://cdn.example/one.jpg', alt: 'First', caption: 'Archive 1' },
  { url: 'https://cdn.example/two.jpg', alt: 'Second', caption: 'Archive 2' },
]

describe('ImageLightbox', () => {
  it('opens a photo and advances to the next one', async () => {
    const user = userEvent.setup()
    const onIndexChange = vi.fn()
    const onClose = vi.fn()

    renderPage(
      <ImageLightbox
        open
        slides={slides}
        index={0}
        onIndexChange={onIndexChange}
        onClose={onClose}
      />,
    )

    expect(screen.getByRole('img', { name: 'First' })).toHaveAttribute(
      'src',
      'https://cdn.example/one.jpg',
    )
    expect(screen.getByText('Archive 1')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'nextPhoto' }))
    expect(onIndexChange).toHaveBeenCalledWith(1)

    await user.click(screen.getByRole('button', { name: 'closePhoto' }))
    expect(onClose).toHaveBeenCalled()
  })
})
