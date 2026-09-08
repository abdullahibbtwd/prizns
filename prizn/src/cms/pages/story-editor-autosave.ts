import type { ArticleFormValues, ArticleStatus } from '@/lib/cms-types'

const KEY_PREFIX = 'prizn-story-draft:'

/** Wait this long after the last keystroke before a background draft save. */
export const AUTOSAVE_IDLE_MS = 5000

const SKIP_AUTOSAVE_INPUT_TYPES = new Set([
  'checkbox',
  'radio',
  'file',
  'button',
  'submit',
  'reset',
  'hidden',
  'color',
  'range',
])

/** True while the caret is in a story field (paragraph, note, title, etc.). */
export function isStoryEditorTyping(active: EventTarget | null): boolean {
  if (!(active instanceof HTMLElement)) return false
  if (active.isContentEditable) return true
  if (active instanceof HTMLTextAreaElement) return true
  if (active instanceof HTMLInputElement) {
    return !SKIP_AUTOSAVE_INPUT_TYPES.has(active.type)
  }
  return false
}

export type StoryDraftBackup = {
  savedAt: number
  values: ArticleFormValues
}

export function storyDraftStorageKey(id: string) {
  return `${KEY_PREFIX}${id}`
}

export function serializeStoryDraft(values: ArticleFormValues): string {
  return JSON.stringify({
    section: values.section,
    status: values.status,
    categoryBg: values.categoryBg,
    titleBg: values.titleBg,
    subtitleBg: values.subtitleBg,
    body: values.body,
    locationBg: values.locationBg,
    speakerBg: values.speakerBg,
    behindStoryBg: values.behindStoryBg,
    seoTitleBg: values.seoTitleBg,
    seoDescriptionBg: values.seoDescriptionBg,
    featured: values.featured,
    sponsored: values.sponsored,
    sourced: values.sourced,
    sponsorName: values.sponsorName,
    tagIds: values.tagIds,
    categoryIds: values.categoryIds,
    seriesMode: values.seriesMode,
    seriesId: values.seriesId,
    scheduledAt: values.scheduledAt,
  })
}

export function shouldAutosaveDraft(opts: {
  dirty: boolean
  title: string
  status: ArticleStatus
  busy: boolean
}): boolean {
  if (!opts.dirty || opts.busy) return false
  if (!opts.title.trim()) return false
  if (opts.status === 'SCHEDULED' || opts.status === 'ARCHIVED') return false
  return true
}

export function autosaveStatus(status: ArticleStatus): Extract<
  ArticleStatus,
  'DRAFT' | 'REVIEW'
> {
  return status === 'REVIEW' ? 'REVIEW' : 'DRAFT'
}

export function writeStoryDraft(id: string, values: ArticleFormValues) {
  try {
    const payload: StoryDraftBackup = { savedAt: Date.now(), values }
    localStorage.setItem(storyDraftStorageKey(id), JSON.stringify(payload))
  } catch {
    /* quota / private mode */
  }
}

export function readStoryDraft(id: string): StoryDraftBackup | null {
  try {
    const raw = localStorage.getItem(storyDraftStorageKey(id))
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoryDraftBackup
    if (!parsed?.values || typeof parsed.savedAt !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

export function clearStoryDraft(id: string) {
  try {
    localStorage.removeItem(storyDraftStorageKey(id))
  } catch {
    /* ignore */
  }
}

export function shouldRestoreStoryDraft(
  backup: StoryDraftBackup | null,
  serverUpdatedAt?: string | null,
): boolean {
  if (!backup) return false
  if (!serverUpdatedAt) return true
  const server = Date.parse(serverUpdatedAt)
  if (Number.isNaN(server)) return true
  return backup.savedAt > server
}
