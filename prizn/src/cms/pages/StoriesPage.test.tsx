import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { buildCmsArticle } from '@/test/factories'
import { renderPage } from '@/test/render-page'
import CmsStoriesPage from './StoriesPage'

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

vi.mock('@/hooks/useJournalLang', () => ({
  useJournalLang: () => ({ lang: 'en', setLang: vi.fn() }),
}))

const listCmsArticles = vi.fn()
const listCmsAuthors = vi.fn()
const deleteCmsArticle = vi.fn()

vi.mock('@/lib/articles-api', () => ({
  listCmsArticles: (...args: unknown[]) => listCmsArticles(...args),
  listCmsAuthors: (...args: unknown[]) => listCmsAuthors(...args),
  deleteCmsArticle: (...args: unknown[]) => deleteCmsArticle(...args),
}))

describe('CmsStoriesPage', () => {
  const article = buildCmsArticle({
    id: 'art-1',
    title: 'Draft story',
    titleBg: 'Ч чернова',
    status: 'DRAFT',
  })

  beforeEach(() => {
    listCmsAuthors.mockResolvedValue([])
    listCmsArticles.mockResolvedValue({
      items: [article],
      total: 1,
      page: 1,
      pageSize: 9,
      totalPages: 1,
    })
    deleteCmsArticle.mockResolvedValue(undefined)
  })

  it('omits sports and news from the section filter', async () => {
    const user = userEvent.setup()
    renderPage(<CmsStoriesPage />)
    await screen.findByText('Draft story')

    await user.click(
      screen.getByRole('button', { name: 'cms.stories.filterSectionAll' }),
    )

    expect(screen.getByRole('option', { name: 'Human stories' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Events' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Sports' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'News' })).not.toBeInTheDocument()
  })

  it('switches to table view', async () => {
    const user = userEvent.setup()
    renderPage(<CmsStoriesPage />)
    await screen.findByText('Draft story')

    const viewButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.querySelector('svg.lucide-list'))
    await user.click(viewButtons[0]!)
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('deletes a story after confirm', async () => {
    const user = userEvent.setup()
    renderPage(<CmsStoriesPage />)
    await screen.findByText('Draft story')

    await user.click(screen.getByRole('button', { name: 'cms.stories.delete' }))
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'cms.common.delete',
      }),
    )

    await waitFor(() => {
      expect(deleteCmsArticle).toHaveBeenCalledWith('art-1')
    })
  })
})
