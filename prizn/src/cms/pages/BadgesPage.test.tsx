import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderPage } from '@/test/render-page'
import CmsBadgesPage from './BadgesPage'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}))

const listCmsBadges = vi.fn()
const listCmsAuthors = vi.fn()
const awardCmsBadge = vi.fn()
const evaluateAuthorBadges = vi.fn()

vi.mock('@/lib/community-api', () => ({
  listCmsBadges: (...args: unknown[]) => listCmsBadges(...args),
  awardCmsBadge: (...args: unknown[]) => awardCmsBadge(...args),
  evaluateAuthorBadges: (...args: unknown[]) => evaluateAuthorBadges(...args),
}))

vi.mock('@/lib/cms-content-api', () => ({
  listCmsAuthors: (...args: unknown[]) => listCmsAuthors(...args),
}))

async function pickJournalOption(placeholder: string, label: string) {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: placeholder }))
  await user.click(screen.getByRole('option', { name: label }))
}

describe('CmsBadgesPage', () => {
  beforeEach(() => {
    listCmsBadges.mockResolvedValue([
      {
        id: 'badge-1',
        nameEn: 'Storyteller',
        nameBg: 'Разказвач',
        descriptionEn: 'Ten published stories',
        descriptionBg: 'Десет публикации',
        minPublished: 10,
        _count: { authors: 1 },
        authors: [
          {
            author: { nameEn: 'Maria', nameBg: 'Мария' },
          },
        ],
      },
    ])
    listCmsAuthors.mockResolvedValue([
      { id: 'auth-1', nameEn: 'Maria', nameBg: 'Мария' },
    ])
    awardCmsBadge.mockResolvedValue(undefined)
    evaluateAuthorBadges.mockResolvedValue(undefined)
  })

  it('lists badges and awards manually', async () => {
    const user = userEvent.setup()
    renderPage(<CmsBadgesPage />)
    expect(await screen.findByText('Storyteller')).toBeInTheDocument()

    await pickJournalOption('cms.badges.authorPlaceholder', 'Maria')
    await pickJournalOption('cms.badges.badgePlaceholder', 'Storyteller')
    await user.click(screen.getByRole('button', { name: 'cms.badges.award' }))

    await waitFor(() => {
      expect(awardCmsBadge).toHaveBeenCalledWith('auth-1', 'badge-1')
    })
  })

  it('reevaluates author badges', async () => {
    const user = userEvent.setup()
    renderPage(<CmsBadgesPage />)
    await screen.findByText('Storyteller')

    await pickJournalOption('cms.badges.authorPlaceholder', 'Maria')
    await user.click(screen.getByRole('button', { name: 'cms.badges.reevaluate' }))

    await waitFor(() => {
      expect(evaluateAuthorBadges).toHaveBeenCalledWith('auth-1')
    })
  })
})
