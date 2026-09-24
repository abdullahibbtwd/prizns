import { articlePath } from '@/lib/public-content'
import type { CmsArticle } from '@/lib/cms-types'

export type VoiceItem = {
  id: string
  title: string
  titleBg: string
  speaker: string
  speakerBg: string
  duration: string
  audioUrl: string
  quote: string
  image: string
  path?: string
}

export function toVoiceItem(article: CmsArticle): VoiceItem {
  return {
    id: article.slug || article.id,
    title: article.title || article.titleBg,
    titleBg: article.titleBg,
    speaker: article.speaker || article.author || '',
    speakerBg: article.speakerBg || article.authorBg || '',
    duration: article.audioDuration || article.readTime || '',
    audioUrl: article.audioUrl || '',
    quote: article.subtitle || article.subtitleBg || '',
    image: article.image || '',
    path: articlePath(article),
  }
}
