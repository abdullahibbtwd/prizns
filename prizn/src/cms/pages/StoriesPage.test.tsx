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
const listCmsCategories = vi.fn()

vi.mock('@/lib/articles-api', () => ({
  listCmsArticles: (...args: unknown[]) => listCmsArticles(...args),
  listCmsAuthors: (...args: unknown[]) => listCmsAuthors(...args),
  deleteCmsArticle: (...args: unknown[]) => deleteCmsArticle(...args),
}))

vi.mock('@/lib/categories-api', () => ({
  listCmsCategories: (...args: unknown[]) => listCmsCategories(...args),
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
    listCmsCategories.mockResolvedValue([
      {
        id: 'cat-human',
        slug: 'choveshki-istorii',
        nameBg: 'Човешки истории',
        nameEn: 'Human stories',
        name: 'Human stories',
        descriptionBg: null,
        descriptionEn: null,
        parentId: null,
        parentName: null,
        translationStatus: 'READY',
        translationError: null,
        sourceLang: 'bg',
        childCount: 0,
        articleCount: 4,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'cat-events',
        slug: 'sabitia',
        nameBg: 'Събития',
        nameEn: 'Events',
        name: 'Events',
        descriptionBg: null,
        descriptionEn: null,
        parentId: null,
        parentName: null,
        translationStatus: 'READY',
        translationError: null,
        sourceLang: 'bg',
        childCount: 0,
        articleCount: 2,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'cat-vratza',
        slug: 'vratza',
        nameBg: 'Враца',
        nameEn: 'Vratsa',
        name: 'Vratsa',
        descriptionBg: null,
        descriptionEn: null,
        parentId: null,
        parentName: null,
        translationStatus: 'READY',
        translationError: null,
        sourceLang: 'bg',
        childCount: 0,
        articleCount: 0,
        createdAt: '',
        updatedAt: '',
      },
    ])
    listCmsArticles.mockResolvedValue({
      items: [article],
      total: 1,
      page: 1,
      pageSize: 9,
      totalPages: 1,
    })
    deleteCmsArticle.mockResolvedValue(undefined)
  })

  it('lists categories in the filter and hides leftover city topics', async () => {
    const user = userEvent.setup()
    renderPage(<CmsStoriesPage />)
    await screen.findByText('Draft story')

    await user.click(
      screen.getByRole('button', { name: 'cms.stories.filterSectionAll' }),
    )

    expect(screen.getByRole('option', { name: 'Human stories' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Events' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Vratsa' })).not.toBeInTheDocument()
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
