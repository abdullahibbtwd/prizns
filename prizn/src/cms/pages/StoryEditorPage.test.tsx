import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { buildCmsArticle } from '@/test/factories'
import { renderPage } from '@/test/render-page'
import CmsStoryEditorPage from './StoryEditorPage'

const getCmsArticle = vi.fn()
const listCmsAuthors = vi.fn()
const listCmsSeries = vi.fn()
const listCmsTags = vi.fn()
const createCmsArticle = vi.fn()
const updateCmsArticle = vi.fn()
const queueArticleNarration = vi.fn()

vi.mock('@/hooks/useJournalLang', () => ({
  useJournalLang: () => ({ lang: 'en', setLang: vi.fn() }),
}))

vi.mock('@/lib/articles-api', () => ({
  getCmsArticle: (...args: unknown[]) => getCmsArticle(...args),
  listCmsAuthors: (...args: unknown[]) => listCmsAuthors(...args),
  createCmsArticle: (...args: unknown[]) => createCmsArticle(...args),
  updateCmsArticle: (...args: unknown[]) => updateCmsArticle(...args),
  createCmsAuthor: vi.fn(),
  queueArticleTranslation: vi.fn(),
  uploadCmsMedia: vi.fn(),
  queueArticleNarration: (...args: unknown[]) => queueArticleNarration(...args),
  clearArticleNarration: vi.fn(),
}))

vi.mock('@/lib/cms-content-api', () => ({
  listCmsSeries: (...args: unknown[]) => listCmsSeries(...args),
  createCmsSeries: vi.fn(),
}))

vi.mock('@/lib/tags-api', () => ({
  listCmsTags: (...args: unknown[]) => listCmsTags(...args),
  createCmsTag: vi.fn(),
}))

function renderEditor(route: string) {
  return renderPage(
    <Routes>
      <Route path="/cms/stories/new" element={<CmsStoryEditorPage />} />
      <Route path="/cms/stories/:id" element={<CmsStoryEditorPage />} />
      <Route path="/cms/stories" element={<div>Stories desk</div>} />
    </Routes>,
    { route },
  )
}

describe('CmsStoryEditorPage publishing actions', () => {
  beforeEach(() => {
    listCmsAuthors.mockResolvedValue([])
    listCmsSeries.mockResolvedValue([])
    listCmsTags.mockResolvedValue([])
    createCmsArticle.mockReset()
    updateCmsArticle.mockReset()
    getCmsArticle.mockReset()
    queueArticleNarration.mockReset()
    queueArticleNarration.mockResolvedValue({ ok: true, queued: true })
  })

  it('shows Review, Save draft, and Publish for a new story', async () => {
    renderEditor('/cms/stories/new')
    expect(
      await screen.findByRole('button', { name: 'cms.editor.review' }),
    ).toBeEnabled()
    expect(
      screen.getByRole('button', { name: /cms.editor.saveDraft/ }),
    ).toBeEnabled()
    expect(
      screen.getByRole('button', { name: 'cms.editor.publish' }),
    ).toBeEnabled()
  })

  it('disables Publish when the story is already published and saved', async () => {
    getCmsArticle.mockResolvedValue(
      buildCmsArticle({
        status: 'PUBLISHED',
        bodyRaw: [{ type: 'paragraph', textBg: 'Lead paragraph.' }],
      }),
    )
    renderEditor('/cms/stories/art-1')
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'cms.editor.publish' }),
      ).toBeDisabled()
    })
    expect(
      screen.getByRole('button', { name: /cms.editor.saveDraft/ }),
    ).toBeEnabled()
  })

  it('shows date and time fields when Scheduled is selected', async () => {
    const user = userEvent.setup()
    getCmsArticle.mockResolvedValue(
      buildCmsArticle({
        status: 'DRAFT',
        bodyRaw: [{ type: 'paragraph', textBg: 'Lead paragraph.' }],
      }),
    )
    renderEditor('/cms/stories/art-1')
    await screen.findByRole('button', { name: 'cms.editor.publish' })

    await user.click(screen.getByRole('button', { name: 'cms.status.draft' }))
    await user.click(
      await screen.findByRole('option', { name: 'cms.status.scheduled' }),
    )

    expect(await screen.findByText('cms.editor.scheduleAt')).toBeInTheDocument()
    expect(screen.getByLabelText('cms.editor.scheduleDate')).toBeInTheDocument()
    expect(screen.getByLabelText('cms.editor.scheduleTime')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /cms.editor.schedule/ }),
    ).toBeEnabled()
  })

  it('publishes and returns to the stories desk', async () => {
    const user = userEvent.setup()
    const draft = buildCmsArticle({
      status: 'DRAFT',
      bodyRaw: [{ type: 'paragraph', textBg: 'Lead paragraph.' }],
    })
    getCmsArticle.mockResolvedValue(draft)
    updateCmsArticle.mockResolvedValue({ ...draft, status: 'PUBLISHED' })

    renderEditor('/cms/stories/art-1')
    await screen.findByRole('button', { name: 'cms.editor.publish' })
    await user.click(screen.getByRole('button', { name: 'cms.editor.publish' }))

    await waitFor(() => {
      expect(updateCmsArticle).toHaveBeenCalledWith(
        'art-1',
        expect.objectContaining({ status: 'PUBLISHED' }),
      )
    })
    expect(await screen.findByText('Stories desk')).toBeInTheDocument()
  })

  it('publishes WordPress-imported headings and uncited quotes', async () => {
    const user = userEvent.setup()
    const draft = buildCmsArticle({
      status: 'DRAFT',
      bodyRaw: [
        { type: 'paragraph', textBg: 'Lead paragraph.' },
        { type: 'note', labelBg: 'За избора на спорта', textBg: '' },
        {
          type: 'pullquote',
          textBg: 'Започнах да се занимавам със спорт.',
          citeBg: '',
        },
      ],
    })
    getCmsArticle.mockResolvedValue(draft)
    updateCmsArticle.mockResolvedValue({ ...draft, status: 'PUBLISHED' })

    renderEditor('/cms/stories/art-1')
    await screen.findByRole('button', { name: 'cms.editor.publish' })
    await user.click(screen.getByRole('button', { name: 'cms.editor.publish' }))

    await waitFor(() => {
      expect(updateCmsArticle).toHaveBeenCalledWith(
        'art-1',
        expect.objectContaining({ status: 'PUBLISHED' }),
      )
    })
  })

  it('enables Publish after generating narration on a published story', async () => {
    const user = userEvent.setup()
    getCmsArticle.mockResolvedValue(
      buildCmsArticle({
        status: 'PUBLISHED',
        bodyRaw: [{ type: 'paragraph', textBg: 'Lead paragraph.' }],
      }),
    )
    renderEditor('/cms/stories/art-1')
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'cms.editor.publish' }),
      ).toBeDisabled()
    })

    await user.click(
      screen.getByRole('button', { name: /cms.editor.narrationGenerate/ }),
    )

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'cms.editor.publish' }),
      ).toBeEnabled()
    })
    expect(screen.getByText('cms.editor.unpublishedEdits')).toBeInTheDocument()
  })
})
