import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { buildCmsArticle } from '@/test/factories'
import { renderPage } from '@/test/render-page'
import CmsStoryEditorPage from './StoryEditorPage'

async function confirmPublishWithoutAudio(
  user: ReturnType<typeof userEvent.setup>,
) {
  const dialog = await screen.findByRole('dialog')
  await user.click(
    within(dialog).getByRole('button', {
      name: 'cms.editor.publishWithoutNarrationConfirm',
    }),
  )
}

async function confirmNarrationGenerate(
  user: ReturnType<typeof userEvent.setup>,
) {
  const dialog = await screen.findByRole('dialog')
  await user.click(
    within(dialog).getByRole('button', {
      name: 'cms.editor.narrationGenerate',
    }),
  )
}

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
  deleteCmsArticle: vi.fn(),
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

  it('lets the editor publish dirty changes on a live story without saving draft first', async () => {
    const user = userEvent.setup()
    getCmsArticle.mockResolvedValue(
      buildCmsArticle({
        status: 'PUBLISHED',
        titleBg: 'Village life',
        bodyRaw: [{ type: 'paragraph', textBg: 'Lead paragraph.' }],
      }),
    )
    renderEditor('/cms/stories/art-1')
    const title = await screen.findByDisplayValue('Village life')
    await user.type(title, ' edited')
    expect(screen.getByRole('button', { name: 'cms.editor.publish' })).toBeEnabled()
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
      translationStatus: 'PENDING',
      bodyRaw: [{ type: 'paragraph', textBg: 'Lead paragraph.' }],
    })
    getCmsArticle.mockResolvedValue(draft)
    updateCmsArticle.mockResolvedValue({ ...draft, status: 'PUBLISHED' })

    renderEditor('/cms/stories/art-1')
    await screen.findByRole('button', { name: 'cms.editor.publish' })
    await user.click(screen.getByRole('button', { name: 'cms.editor.publish' }))
    await confirmPublishWithoutAudio(user)

    await waitFor(() => {
      expect(updateCmsArticle).toHaveBeenCalledWith(
        'art-1',
        expect.objectContaining({ status: 'PUBLISHED' }),
      )
    })
    expect(await screen.findByText('Stories desk')).toBeInTheDocument()
  })

  it('locks Publish with a loader until publishing finishes', async () => {
    const user = userEvent.setup()
    const draft = buildCmsArticle({
      status: 'DRAFT',
      translationStatus: 'PENDING',
      bodyRaw: [{ type: 'paragraph', textBg: 'Lead paragraph.' }],
    })
    getCmsArticle.mockResolvedValue(draft)
    let finish!: (value: unknown) => void
    updateCmsArticle.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )

    renderEditor('/cms/stories/art-1')
    const publish = await screen.findByRole('button', { name: 'cms.editor.publish' })
    await user.click(publish)
    await confirmPublishWithoutAudio(user)

    const busy = await screen.findByRole('button', {
      name: /cms.editor.publishingNow/,
    })
    expect(busy).toBeDisabled()
    expect(
      screen.getByRole('button', { name: /cms.editor.saveDraft/ }),
    ).toBeDisabled()

    finish({ ...draft, status: 'PUBLISHED' })
    expect(await screen.findByText('Stories desk')).toBeInTheDocument()
  })

  it('publishes WordPress-imported headings and uncited quotes', async () => {
    const user = userEvent.setup()
    const draft = buildCmsArticle({
      status: 'DRAFT',
      translationStatus: 'PENDING',
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
    await confirmPublishWithoutAudio(user)

    await waitFor(() => {
      expect(updateCmsArticle).toHaveBeenCalledWith(
        'art-1',
        expect.objectContaining({ status: 'PUBLISHED' }),
      )
    })
  })

  it('queues narration when publishing with the narrate option', async () => {
    const user = userEvent.setup()
    const draft = buildCmsArticle({
      status: 'DRAFT',
      translationStatus: 'PENDING',
      bodyRaw: [{ type: 'paragraph', textBg: 'Lead paragraph.' }],
    })
    getCmsArticle.mockResolvedValue(draft)
    updateCmsArticle.mockResolvedValue({ ...draft, status: 'PUBLISHED' })

    renderEditor('/cms/stories/art-1')
    await screen.findByRole('button', { name: 'cms.editor.publish' })
    await user.click(screen.getByRole('button', { name: 'cms.editor.publish' }))

    const dialog = await screen.findByRole('dialog')
    await user.click(
      within(dialog).getByRole('button', {
        name: 'cms.editor.publishAndNarrate',
      }),
    )

    await waitFor(() => {
      expect(updateCmsArticle).toHaveBeenCalledWith(
        'art-1',
        expect.objectContaining({ status: 'PUBLISHED' }),
      )
      expect(queueArticleNarration).toHaveBeenCalledWith('art-1')
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
    await confirmNarrationGenerate(user)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'cms.editor.publish' }),
      ).toBeEnabled()
    })
    expect(screen.getByText('cms.editor.unpublishedEdits')).toBeInTheDocument()
  })
})

describe('CmsStoryEditorPage autosave', () => {
  beforeEach(() => {
    listCmsAuthors.mockResolvedValue([])
    listCmsSeries.mockResolvedValue([])
    listCmsTags.mockResolvedValue([])
    createCmsArticle.mockReset()
    updateCmsArticle.mockReset()
    getCmsArticle.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('waits five seconds after the last keystroke, then saves without stealing the caret', async () => {
    getCmsArticle.mockResolvedValue(
      buildCmsArticle({
        status: 'DRAFT',
        titleBg: 'Village life',
        translationStatus: 'PENDING',
        bodyRaw: [{ type: 'paragraph', textBg: 'Lead paragraph.' }],
      }),
    )
    updateCmsArticle.mockResolvedValue(
      buildCmsArticle({ status: 'DRAFT', titleBg: 'Village life extra' }),
    )

    renderEditor('/cms/stories/art-1')
    const title = await screen.findByDisplayValue('Village life')

    vi.useFakeTimers()
    title.focus()
    fireEvent.change(title, { target: { value: 'Village life extra' } })
    fireEvent.input(title)

    await vi.advanceTimersByTimeAsync(2000)
    expect(updateCmsArticle).not.toHaveBeenCalled()
    expect(title).toHaveValue('Village life extra')

    await vi.advanceTimersByTimeAsync(3000)
    expect(updateCmsArticle).toHaveBeenCalled()
    expect(title).toHaveValue('Village life extra')
    expect(document.activeElement).toBe(title)
  })
})

function jpegFile(name: string) {
  return new File(['img'], name, { type: 'image/jpeg' })
}

function dropFiles(element: HTMLElement, files: File[]) {
  const dataTransfer = {
    files,
    items: files.map((file) => ({
      kind: 'file' as const,
      type: file.type,
      getAsFile: () => file,
    })),
    types: ['Files'],
    dropEffect: 'copy',
  }
  fireEvent.dragEnter(element, { dataTransfer })
  fireEvent.dragOver(element, { dataTransfer })
  fireEvent.drop(element, { dataTransfer })
}

describe('CmsStoryEditorPage image drop', () => {
  beforeEach(() => {
    listCmsAuthors.mockResolvedValue([])
    listCmsSeries.mockResolvedValue([])
    listCmsTags.mockResolvedValue([])
    class FakeImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_value: string) {
        queueMicrotask(() => this.onload?.())
      }
    }
    vi.stubGlobal('Image', FakeImage)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-image')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  it('uses the first dropped image as the hero and later drops as gallery extras', async () => {
    renderEditor('/cms/stories/new')
    const zone = await screen.findByTestId('story-media-dropzone')

    dropFiles(zone, [jpegFile('hero.jpg')])
    expect(await screen.findByText('cms.editor.heroLabel')).toBeInTheDocument()

    dropFiles(zone, [jpegFile('extra.jpg')])
    await waitFor(() => {
      expect(screen.getByTestId('gallery-thumb-0')).toBeInTheDocument()
      expect(screen.getByTestId('gallery-thumb-1')).toBeInTheDocument()
    })
  })
})
