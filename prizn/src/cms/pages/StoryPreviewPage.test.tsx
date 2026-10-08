import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { buildCmsArticle } from '@/test/factories'
import { renderPage } from '@/test/render-page'
import CmsStoryPreviewPage from './StoryPreviewPage'

const getCmsArticle = vi.fn()
const updateCmsArticle = vi.fn()

const authState = vi.hoisted(() => ({
  user: { id: 'u-admin', role: 'ADMIN', roles: ['ADMIN'] } as {
    id: string
    role: string
    roles: string[]
  },
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: authState.user, loading: false }),
}))

vi.mock('@/hooks/useJournalLang', () => ({
  useJournalLang: () => ({ lang: 'en', setLang: vi.fn() }),
}))

vi.mock('@/lib/articles-api', () => ({
  getCmsArticle: (...args: unknown[]) => getCmsArticle(...args),
  updateCmsArticle: (...args: unknown[]) => updateCmsArticle(...args),
}))

vi.mock('@/routes/article', async () => {
  const actual = await vi.importActual<typeof import('@/routes/article')>(
    '@/routes/article',
  )
  return {
    ...actual,
    ArticleContent: ({
      article,
      preview,
    }: {
      article: { title: string }
      preview?: { backTo: string; banner?: React.ReactNode }
    }) => (
      <div data-testid="article-preview">
        {preview?.banner}
        <span>{article.title}</span>
        <button type="button" onClick={() => undefined} data-back={preview?.backTo}>
          back
        </button>
      </div>
    ),
  }
})

function renderPreview(route = '/cms/stories/art-1/preview') {
  return renderPage(
    <Routes>
      <Route path="/cms/stories/:id/preview" element={<CmsStoryPreviewPage />} />
      <Route path="/cms" element={<div>CMS home</div>} />
    </Routes>,
    { route },
  )
}

describe('CmsStoryPreviewPage', () => {
  beforeEach(() => {
    authState.user = { id: 'u-admin', role: 'ADMIN', roles: ['ADMIN'] }
    getCmsArticle.mockReset()
    updateCmsArticle.mockReset()
  })

  it('renders the public-style preview and can publish', async () => {
    const user = userEvent.setup()
    getCmsArticle.mockResolvedValue(
      buildCmsArticle({
        id: 'art-1',
        status: 'DRAFT',
        title: 'Village preview',
        titleBg: 'Село',
        path: '/stories/village-preview',
      }),
    )
    updateCmsArticle.mockResolvedValue(
      buildCmsArticle({
        id: 'art-1',
        status: 'PUBLISHED',
        title: 'Village preview',
        titleBg: 'Село',
        path: '/stories/village-preview',
      }),
    )

    renderPreview()

    expect(await screen.findByTestId('article-preview')).toHaveTextContent(
      'Village preview',
    )
    expect(screen.getByText('cms.editor.previewBadge')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'cms.editor.publish' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(
      within(dialog).getByRole('button', { name: 'cms.editor.publish' }),
    )

    await waitFor(() => {
      expect(updateCmsArticle).toHaveBeenCalledWith(
        'art-1',
        expect.objectContaining({ status: 'PUBLISHED' }),
      )
    })
    expect(
      await screen.findByText('cms.editor.previewPublished'),
    ).toBeInTheDocument()
  })

  it('redirects authors who cannot publish', async () => {
    authState.user = { id: 'u-author', role: 'AUTHOR', roles: ['AUTHOR'] }
    renderPreview()
    expect(await screen.findByText('CMS home')).toBeInTheDocument()
  })
})
