export const QUEUE_TRANSLATE = 'translate'
export const QUEUE_AI = 'ai'
export const QUEUE_TTS = 'tts'
export const QUEUE_SOCIAL = 'social'
export const QUEUE_DIGEST = 'digest'
export const QUEUE_PUBLISH = 'publish'
export const QUEUE_MEDIA = 'media'

export type MediaJobData = {
  mediaId: string
  tempPath: string
  folder: string
  originalName: string
  mimeType: string
}

export type TranslateEntity = 'article' | 'author' | 'series' | 'category'

/** `sweep` re-queues rows stuck in PENDING/RUNNING (id is unused). */
export type TranslateJobData = {
  type: TranslateEntity | 'sweep'
  id: string
}

export type EmbedJobData = {
  articleId: string
}
