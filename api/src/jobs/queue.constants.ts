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

export type TranslateJobData = {
  type: 'article' | 'author' | 'series' | 'category'
  id: string
}

export type EmbedJobData = {
  articleId: string
}
