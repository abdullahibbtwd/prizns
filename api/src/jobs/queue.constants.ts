export const QUEUE_TRANSLATE = 'translate'
export const QUEUE_AI = 'ai'
export const QUEUE_TTS = 'tts'
export const QUEUE_SOCIAL = 'social'
export const QUEUE_DIGEST = 'digest'
export const QUEUE_PUBLISH = 'publish'

export type TranslateJobData = {
  type: 'article' | 'author' | 'series' | 'category'
  id: string
}

export type EmbedJobData = {
  articleId: string
}
