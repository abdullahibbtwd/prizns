import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { buildCmsArticle } from '@/test/factories'
import { renderPage } from '@/test/render-page'
import CmsStoryEditorPage from './StoryEditorPage'

async function confirmPublish(user: ReturnType<typeof userEvent.setup>) {
  const dialog = await screen.findByRole('dialog')
  await user.click(
    within(dialog).getByRole('button', { name: 'cms.editor.publish' }),
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
const createCmsAuthor = vi.fn()
const listCmsSeries = vi.fn()
const listCmsTags = vi.fn()
const createCmsArticle = vi.fn()
const updateCmsArticle = vi.fn()
const queueArticleNarration = vi.fn()
const uploadCmsMedia = vi.fn()
const requestArticleChanges = vi.fn()

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
  listCmsAuthors: (...args: unknown[]) => listCmsAuthors(...args),
  createCmsArticle: (...args: unknown[]) => createCmsArticle(...args),
  updateCmsArticle: (...args: unknown[]) => updateCmsArticle(...args),
  deleteCmsArticle: vi.fn(),
  createCmsAuthor: (...args: unknown[]) => createCmsAuthor(...args),
  queueArticleTranslation: vi.fn(),
  uploadCmsMedia: (...args: unknown[]) => uploadCmsMedia(...args),
  queueArticleNarration: (...args: unknown[]) => queueArticleNarration(...args),
  clearArticleNarration: vi.fn(),
  requestArticleChanges: (...args: unknown[]) => requestArticleChanges(...args),
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

  it('shows Preview, Save draft, and Publish for a new story', async () => {
    renderEditor('/cms/stories/new')
    expect(
      await screen.findByRole('button', { name: /cms.editor.preview/ }),
    ).toBeEnabled()
    expect(
      screen.queryByRole('button', { name: 'cms.editor.review' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /cms.editor.saveDraft/ }),
    ).toBeEnabled()
    expect(
      screen.getByRole('button', { name: 'cms.editor.publish' }),
    ).toBeEnabled()
  })

  it('opens a public-style preview tab after saving dirty edits', async () => {
    const user = userEvent.setup()
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    getCmsArticle.mockResolvedValue(
      buildCmsArticle({ id: 'art-1', status: 'DRAFT', titleBg: 'Draft story' }),
    )
    updateCmsArticle.mockResolvedValue(
      buildCmsArticle({ id: 'art-1', status: 'DRAFT', titleBg: 'Draft story edited' }),
    )
    renderEditor('/cms/stories/art-1')
    const title = await screen.findByDisplayValue('Draft story')
    await user.type(title, ' edited')
    await user.click(screen.getByRole('button', { name: /cms.editor.preview/ }))

    await waitFor(() => {
      expect(updateCmsArticle).toHaveBeenCalled()
      expect(openSpy).toHaveBeenCalledWith(
        '/cms/stories/art-1/preview',
        '_blank',
        'noopener,noreferrer',
      )
    })
    openSpy.mockRestore()
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
    expect(screen.getByRole('button', { name: 'cms.editor.update' })).toBeEnabled()
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
        screen.getByRole('button', { name: 'cms.editor.update' }),
      ).toBeDisabled()
    })
    expect(
      screen.getByRole('button', { name: /cms.editor.unpublish/ }),
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
    await confirmPublish(user)

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
    await confirmPublish(user)

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
    await confirmPublish(user)

    await waitFor(() => {
      expect(updateCmsArticle).toHaveBeenCalledWith(
        'art-1',
        expect.objectContaining({ status: 'PUBLISHED' }),
      )
    })
  })

  it('asks for a plain publish confirmation with no audio options', async () => {
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
    expect(within(dialog).getByText('cms.editor.publishConfirmTitle')).toBeInTheDocument()
    expect(within(dialog).getAllByRole('button').map((b) => b.textContent)).toEqual(
      expect.not.arrayContaining([expect.stringMatching(/narrat|audio/i)]),
    )
    await user.click(within(dialog).getByRole('button', { name: 'cms.editor.cancel' }))
    expect(updateCmsArticle).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'cms.editor.publish' }))
    await confirmPublish(user)
    await waitFor(() => {
      expect(updateCmsArticle).toHaveBeenCalledWith(
        'art-1',
        expect.objectContaining({ status: 'PUBLISHED' }),
      )
    })
    expect(queueArticleNarration).not.toHaveBeenCalled()
  })

  it('queues narration on a published story without demoting it to draft', async () => {
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
        screen.getByRole('button', { name: 'cms.editor.update' }),
      ).toBeDisabled()
    })

    await user.click(
      screen.getByRole('button', { name: /cms.editor.narrationGenerate/ }),
    )
    await confirmNarrationGenerate(user)

    await waitFor(() => {
      expect(queueArticleNarration).toHaveBeenCalledWith('art-1')
    })
    expect(
      screen.getByRole('button', { name: 'cms.editor.update' }),
    ).toBeDisabled()
    expect(
      screen.queryByText('cms.editor.liveEditsPending'),
    ).not.toBeInTheDocument()
  })
})

describe('CmsStoryEditorPage audio', () => {
  const liveWithAudio = () =>
    buildCmsArticle({
      status: 'PUBLISHED',
      titleBg: 'Village life',
      bodyRaw: [{ type: 'paragraph', textBg: 'Lead paragraph.' }],
      audioMediaId: 'aud-1',
      audioUrl: 'https://cdn.test/narration.mp3',
      narrationStatus: 'READY',
    })

  beforeEach(() => {
    listCmsAuthors.mockResolvedValue([])
    listCmsSeries.mockResolvedValue([])
    listCmsTags.mockResolvedValue([])
    updateCmsArticle.mockReset()
    uploadCmsMedia.mockReset()
    getCmsArticle.mockReset()
    getCmsArticle.mockResolvedValue(liveWithAudio())
    updateCmsArticle.mockImplementation(async (_id, body) => ({
      ...liveWithAudio(),
      ...body,
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('removes audio only when the editor clicks Update', async () => {
    const user = userEvent.setup()
    renderEditor('/cms/stories/art-1')
    await user.click(
      await screen.findByRole('button', { name: /cms.editor.narrationRemove/ }),
    )
    expect(screen.getByText('cms.editor.narrationRemovePending')).toBeInTheDocument()
    expect(updateCmsArticle).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'cms.editor.update' }))
    await waitFor(() => {
      expect(updateCmsArticle).toHaveBeenCalledWith(
        'art-1',
        expect.objectContaining({ audioMediaId: null }),
      )
    })
  })

  it('undoing a removal leaves nothing to save', async () => {
    const user = userEvent.setup()
    renderEditor('/cms/stories/art-1')
    await user.click(
      await screen.findByRole('button', { name: /cms.editor.narrationRemove/ }),
    )
    expect(screen.getByRole('button', { name: 'cms.editor.update' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: /cms.editor.narrationUndo/ }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'cms.editor.update' })).toBeDisabled()
    })
  })

  it('leaves audio alone when saving other edits', async () => {
    const user = userEvent.setup()
    renderEditor('/cms/stories/art-1')
    const title = await screen.findByDisplayValue('Village life')
    await user.type(title, ' edited')
    await user.click(screen.getByRole('button', { name: 'cms.editor.update' }))
    await waitFor(() => expect(updateCmsArticle).toHaveBeenCalled())
    expect(updateCmsArticle.mock.calls[0]![1]).not.toHaveProperty('audioMediaId')
  })

  it('uploads a chosen recording on Update instead of generating', async () => {
    const user = userEvent.setup()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:recording')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(HTMLMediaElement.prototype, 'src', 'set').mockImplementation(
      function (this: HTMLMediaElement) {
        queueMicrotask(() => this.onerror?.(new Event('error')))
      },
    )
    uploadCmsMedia.mockResolvedValue({ id: 'aud-new' })
    renderEditor('/cms/stories/art-1')

    const input = await screen.findByLabelText('cms.editor.narrationUpload')
    await user.upload(
      input,
      new File(['mp3'], 'voice.mp3', { type: 'audio/mpeg' }),
    )
    expect(await screen.findByText('cms.editor.narrationUnsaved')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /cms.editor.narrationRegenerate|cms.editor.narrationGenerate/ }),
    ).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'cms.editor.update' }))
    await waitFor(() => {
      expect(updateCmsArticle).toHaveBeenCalledWith(
        'art-1',
        expect.objectContaining({ audioMediaId: 'aud-new' }),
      )
    })
    expect(uploadCmsMedia).toHaveBeenCalledTimes(1)
  })
})

describe('CmsStoryEditorPage roles', () => {
  beforeEach(() => {
    listCmsAuthors.mockResolvedValue([
      {
        id: 'author-1',
        slug: 'iva',
        nameBg: 'Ива',
        nameEn: 'Iva',
        roleBg: 'Автор',
        roleEn: null,
        imageUrl: null,
      },
    ])
    listCmsSeries.mockResolvedValue([])
    listCmsTags.mockResolvedValue([])
    getCmsArticle.mockReset()
    createCmsAuthor.mockReset()
  })

  afterEach(() => {
    authState.user = { id: 'u-admin', role: 'ADMIN', roles: ['ADMIN'] }
  })

  it('locks the author to the writer and hides delete for authors', async () => {
    authState.user = { id: 'u-author', role: 'AUTHOR', roles: ['AUTHOR'] }
    getCmsArticle.mockResolvedValue(
      buildCmsArticle({ status: 'DRAFT', titleBg: 'My story', authorId: 'author-1' }),
    )
    renderEditor('/cms/stories/art-1')
    await screen.findByDisplayValue('My story')

    expect(await screen.findByText('Iva')).toBeInTheDocument()
    expect(screen.getByText('cms.editor.authorOwnOnly')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /cms.editor.addAuthor/ }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /cms.stories.delete/ }),
    ).not.toBeInTheDocument()
  })

  it('lets authors submit for review but not publish', async () => {
    authState.user = { id: 'u-author', role: 'AUTHOR', roles: ['AUTHOR'] }
    getCmsArticle.mockResolvedValue(
      buildCmsArticle({ status: 'DRAFT', titleBg: 'My story', authorId: 'author-1' }),
    )
    renderEditor('/cms/stories/art-1')
    await screen.findByDisplayValue('My story')

    expect(
      screen.getByRole('button', { name: 'cms.editor.submitForReview' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /cms.editor.saveDraft/ }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'cms.editor.publish' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('cms.editor.reviewHint')).toBeInTheDocument()
  })

  it('locks a published story for its author', async () => {
    authState.user = { id: 'u-author', role: 'AUTHOR', roles: ['AUTHOR'] }
    getCmsArticle.mockResolvedValue(
      buildCmsArticle({
        status: 'PUBLISHED',
        titleBg: 'Live story',
        authorId: 'author-1',
      }),
    )
    renderEditor('/cms/stories/art-1')
    await screen.findByDisplayValue('Live story')

    for (const name of [
      'cms.editor.update',
      'cms.editor.submitForReview',
      /cms.editor.unpublish/,
    ]) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
  })

  it('lets moderators add a guest author from the story', async () => {
    const user = userEvent.setup()
    authState.user = { id: 'u-mod', role: 'MODERATOR', roles: ['MODERATOR'] }
    createCmsAuthor.mockResolvedValue({
      id: 'guest-1',
      slug: 'guest',
      nameBg: 'Гост',
      nameEn: null,
      roleBg: 'Гост автор',
      roleEn: null,
      imageUrl: null,
      isGuest: true,
    })
    getCmsArticle.mockResolvedValue(
      buildCmsArticle({ status: 'DRAFT', titleBg: 'Their story' }),
    )
    renderEditor('/cms/stories/art-1')
    await screen.findByDisplayValue('Their story')

    expect(
      screen.queryByRole('button', { name: /cms.stories.delete/ }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /cms.editor.addAuthor/ }))
    await user.type(screen.getByLabelText('cms.editor.authorName'), 'Гост')
    await user.click(screen.getByRole('checkbox', { name: /cms.authors.guestLabel/ }))
    await user.click(screen.getByRole('button', { name: 'cms.editor.createAuthor' }))

    await waitFor(() => {
      expect(createCmsAuthor).toHaveBeenCalledWith('Гост', { isGuest: true })
    })
  })

  it('shows delete to super admins', async () => {
    getCmsArticle.mockResolvedValue(
      buildCmsArticle({ status: 'DRAFT', titleBg: 'Any story' }),
    )
    renderEditor('/cms/stories/art-1')
    await screen.findByDisplayValue('Any story')
    expect(
      screen.getByRole('button', { name: /cms.stories.delete/ }),
    ).toBeInTheDocument()
  })
})

describe('CmsStoryEditorPage send back for changes', () => {
  beforeEach(() => {
    listCmsAuthors.mockResolvedValue([])
    listCmsSeries.mockResolvedValue([])
    listCmsTags.mockResolvedValue([])
    getCmsArticle.mockReset()
    requestArticleChanges.mockReset()
  })

  afterEach(() => {
    authState.user = { id: 'u-admin', role: 'ADMIN', roles: ['ADMIN'] }
  })

  it('lets a moderator send a story in review back with a note', async () => {
    const user = userEvent.setup()
    authState.user = { id: 'u-mod', role: 'MODERATOR', roles: ['MODERATOR'] }
    getCmsArticle.mockResolvedValue(
      buildCmsArticle({ id: 'art-1', status: 'REVIEW', titleBg: 'Submitted' }),
    )
    requestArticleChanges.mockResolvedValue(
      buildCmsArticle({
        id: 'art-1',
        status: 'DRAFT',
        titleBg: 'Submitted',
        reviewNote: 'Please add a photo credit',
      }),
    )
    renderEditor('/cms/stories/art-1')
    await screen.findByDisplayValue('Submitted')

    await user.click(screen.getByRole('button', { name: /cms.editor.sendBack$/ }))
    const dialog = await screen.findByRole('dialog')
    const confirm = within(dialog).getByRole('button', {
      name: /cms.editor.sendBackConfirm/,
    })
    expect(confirm).toBeDisabled()
    await user.type(
      within(dialog).getByLabelText('cms.editor.sendBackNote'),
      'Please add a photo credit',
    )
    await user.click(confirm)

    await waitFor(() => {
      expect(requestArticleChanges).toHaveBeenCalledWith(
        'art-1',
        'Please add a photo credit',
      )
    })
    expect(await screen.findByText('cms.editor.sentBackTitle')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /cms.editor.sendBack$/ }),
    ).not.toBeInTheDocument()
  })

  it('hides send back from authors', async () => {
    authState.user = { id: 'u-author', role: 'AUTHOR', roles: ['AUTHOR'] }
    getCmsArticle.mockResolvedValue(
      buildCmsArticle({ status: 'REVIEW', titleBg: 'Mine', authorId: 'author-1' }),
    )
    renderEditor('/cms/stories/art-1')
    await screen.findByDisplayValue('Mine')
    expect(
      screen.queryByRole('button', { name: /cms.editor.sendBack$/ }),
    ).not.toBeInTheDocument()
  })

  it('shows the moderator note to the author and lets them resubmit', async () => {
    authState.user = { id: 'u-author', role: 'AUTHOR', roles: ['AUTHOR'] }
    getCmsArticle.mockResolvedValue(
      buildCmsArticle({
        status: 'DRAFT',
        titleBg: 'Mine',
        authorId: 'author-1',
        reviewNote: 'Please add a photo credit',
      }),
    )
    renderEditor('/cms/stories/art-1')
    await screen.findByDisplayValue('Mine')

    expect(screen.getByText('cms.editor.changesRequestedTitle')).toBeInTheDocument()
    expect(screen.getByText('Please add a photo credit')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'cms.editor.submitForReview' }),
    ).toBeInTheDocument()
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
