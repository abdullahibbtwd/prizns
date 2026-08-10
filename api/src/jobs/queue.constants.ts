export const QUEUE_TRANSLATE = 'translate'
export const QUEUE_AI = 'ai'
export const QUEUE_TTS = 'tts'
export const QUEUE_SOCIAL = 'social'
export const QUEUE_DIGEST = 'digest'

export type TranslateJobData = {
  type: 'article' | 'author' | 'series'
  id: string
}
