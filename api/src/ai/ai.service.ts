import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { AiSuggestDto } from './dto/suggest.dto'

export type AiSuggestionResult = {
  promptVersion: string
  headlines: string[]
  subtitle: string | null
  seoTitle: string | null
  seoDescription: string | null
  topicTags: string[]
  episodeOutline: string[]
  summary: string | null
}

const PROMPT_VERSION = 'prizni-editorial-v2'

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name)
  private readonly apiKey: string | undefined
  private readonly modelName: string
  private readonly enabled: boolean

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('GEMINI_API_KEY') || undefined
    this.modelName =
      this.config.get<string>('GEMINI_MODEL') || 'gemini-2.0-flash'
    const flag = this.config.get<string>('FEATURE_AI')
    this.enabled = flag === undefined || flag === '' || flag === 'true'
  }

  async suggest(dto: AiSuggestDto): Promise<AiSuggestionResult> {
    if (!this.enabled) {
      throw new ServiceUnavailableException('AI assistant is disabled')
    }
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'GEMINI_API_KEY is not configured',
      )
    }

    const sample = [dto.titleBg, dto.subtitleBg, dto.bodyText]
      .map((part) => part?.trim() ?? '')
      .filter(Boolean)
      .join(' ')
    const cyrillic = (sample.match(/\p{Script=Cyrillic}/gu) ?? []).length
    const latin = (sample.match(/[A-Za-z]/g) ?? []).length
    const detected: 'bg' | 'en' =
      cyrillic > 0 && cyrillic >= latin * 0.35
        ? 'bg'
        : latin > cyrillic
          ? 'en'
          : dto.lang === 'en'
            ? 'en'
            : 'bg'
    // Prefer the language of the draft the editor is writing.
    const lang = detected
    const langLabel = lang === 'bg' ? 'Bulgarian' : 'English'
    const bodyPreview = (dto.bodyText || '').trim().slice(0, 6000)
    const prompt = `You are the editorial assistant for Prizni, a warm digital journal of human stories, places, and traditions from Northwestern Bulgaria.

IMPORTANT: The editor is writing in ${langLabel}. All suggestions MUST be written in ${langLabel} only. Do not mix languages. Do not default to English unless the draft itself is English.

Tone: warm, concrete, photography-led, never clickbait.

Return ONLY valid JSON with this shape:
{
  "headlines": ["...", "...", "..."],
  "subtitle": "...",
  "seoTitle": "...",
  "seoDescription": "...",
  "topicTags": ["...", "..."],
  "episodeOutline": ["...", "..."],
  "summary": "..."
}

Rules:
- headlines: exactly 3 alternatives in ${langLabel}
- subtitle, seoTitle, seoDescription, topicTags, episodeOutline, summary: all in ${langLabel}
- seoTitle: under 60 characters when possible
- seoDescription: under 155 characters
- topicTags: 3–6 short topic labels (not places unless clearly about a place)
- episodeOutline: 0–5 episode titles if the draft could be a series; else []
- Do not invent facts not supported by the draft

Detected draft language: ${langLabel}
Section: ${dto.section || 'human-stories'}
Title: ${dto.titleBg}
Subtitle: ${dto.subtitleBg || ''}
Draft body:
${bodyPreview || '(empty draft)'}`

    const genAI = new GoogleGenerativeAI(this.apiKey)
    const model = genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    })

    try {
      const result = await model.generateContent(prompt)
      const text = result.response.text()
      const parsed = this.parseJson(text)
      return {
        promptVersion: PROMPT_VERSION,
        headlines: this.asStringArray(parsed.headlines).slice(0, 3),
        subtitle: this.asString(parsed.subtitle),
        seoTitle: this.asString(parsed.seoTitle),
        seoDescription: this.asString(parsed.seoDescription),
        topicTags: this.asStringArray(parsed.topicTags).slice(0, 8),
        episodeOutline: this.asStringArray(parsed.episodeOutline).slice(0, 6),
        summary: this.asString(parsed.summary),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`Gemini suggest failed: ${message}`)
      throw new ServiceUnavailableException(
        `AI suggestion failed: ${message}`,
      )
    }
  }

  private parseJson(text: string): Record<string, unknown> {
    const trimmed = text.trim()
    try {
      return JSON.parse(trimmed) as Record<string, unknown>
    } catch {
      const start = trimmed.indexOf('{')
      const end = trimmed.lastIndexOf('}')
      if (start >= 0 && end > start) {
        return JSON.parse(trimmed.slice(start, end + 1)) as Record<
          string,
          unknown
        >
      }
      throw new Error('Model did not return JSON')
    }
  }

  private asString(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    return trimmed || null
  }

  private asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return []
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
  }
}
