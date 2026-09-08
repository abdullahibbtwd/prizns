import { describe, expect, it } from 'vitest'
import type { ArticleFormValues } from '@/lib/cms-types'
import {
  AUTOSAVE_IDLE_MS,
  autosaveStatus,
  clearStoryDraft,
  isStoryEditorTyping,
  readStoryDraft,
  serializeStoryDraft,
  shouldAutosaveDraft,
  shouldRestoreStoryDraft,
  writeStoryDraft,
} from './story-editor-autosave'

const values = {
  titleBg: 'Village morning',
  status: 'DRAFT',
  body: [{ type: 'paragraph', textBg: 'Lead.' }],
} as ArticleFormValues

describe('shouldAutosaveDraft', () => {
  it('saves dirty drafts that have a title', () => {
    expect(
      shouldAutosaveDraft({
        dirty: true,
        title: 'Village morning',
        status: 'DRAFT',
        busy: false,
      }),
    ).toBe(true)
  })

  it('skips empty titles, clean forms, and in-flight saves', () => {
    expect(
      shouldAutosaveDraft({
        dirty: true,
        title: '  ',
        status: 'DRAFT',
        busy: false,
      }),
    ).toBe(false)
    expect(
      shouldAutosaveDraft({
        dirty: false,
        title: 'Village morning',
        status: 'DRAFT',
        busy: false,
      }),
    ).toBe(false)
    expect(
      shouldAutosaveDraft({
        dirty: true,
        title: 'Village morning',
        status: 'DRAFT',
        busy: true,
      }),
    ).toBe(false)
  })

  it('does not autosave scheduled or archived stories', () => {
    expect(
      shouldAutosaveDraft({
        dirty: true,
        title: 'Village morning',
        status: 'SCHEDULED',
        busy: false,
      }),
    ).toBe(false)
  })
})

describe('autosaveStatus', () => {
  it('keeps review in review and stores everything else as draft', () => {
    expect(AUTOSAVE_IDLE_MS).toBe(5000)
    expect(autosaveStatus('REVIEW')).toBe('REVIEW')
    expect(autosaveStatus('PUBLISHED')).toBe('DRAFT')
    expect(autosaveStatus('DRAFT')).toBe('DRAFT')
  })
})

describe('isStoryEditorTyping', () => {
  it('treats body blocks and text fields as typing', () => {
    const paragraph = document.createElement('div')
    paragraph.contentEditable = 'true'
    const title = document.createElement('input')
    title.type = 'text'
    const note = document.createElement('textarea')
    expect(isStoryEditorTyping(paragraph)).toBe(true)
    expect(isStoryEditorTyping(title)).toBe(true)
    expect(isStoryEditorTyping(note)).toBe(true)
  })

  it('ignores buttons and file pickers so a save can run after idle', () => {
    const button = document.createElement('button')
    const file = document.createElement('input')
    file.type = 'file'
    expect(isStoryEditorTyping(button)).toBe(false)
    expect(isStoryEditorTyping(file)).toBe(false)
    expect(isStoryEditorTyping(null)).toBe(false)
  })
})

describe('story draft local backup', () => {
  it('round-trips a draft and restores when it is newer than the server', () => {
    writeStoryDraft('art-1', values)
    const backup = readStoryDraft('art-1')
    expect(backup?.values.titleBg).toBe('Village morning')
    expect(
      shouldRestoreStoryDraft(backup, '2020-01-01T00:00:00.000Z'),
    ).toBe(true)
    expect(
      shouldRestoreStoryDraft(backup, new Date(backup!.savedAt + 10_000).toISOString()),
    ).toBe(false)
    clearStoryDraft('art-1')
    expect(readStoryDraft('art-1')).toBeNull()
  })

  it('changes the snapshot when body text changes', () => {
    const a = serializeStoryDraft(values)
    const b = serializeStoryDraft({
      ...values,
      body: [{ type: 'paragraph', textBg: 'Changed.' }],
    })
    expect(a).not.toBe(b)
  })
})
