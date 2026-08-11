import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectQueue } from '@nestjs/bullmq'
import { ArticleStatus, Prisma } from '@prisma/client'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { Queue } from 'bullmq'
import { QUEUE_AI, type EmbedJobData } from '../jobs/queue.constants'
import { PrismaService } from '../prisma/prisma.service'
import type { StoredArticleBlock } from '../articles/article.types'
import { toPrismaSectionFilter } from '../articles/section.util'
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
const EMBED_TEXT_MAX = 8000

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name)
  private readonly apiKey: string | undefined
  private readonly modelName: string
  private readonly embeddingModel: string
  private readonly enabled: boolean
  private readonly rateBuckets = new Map<
    string,
    { count: number; resetAt: number }
  >()

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_AI) private readonly aiQueue: Queue,
  ) {
    this.apiKey = this.config.get<string>('GEMINI_API_KEY') || undefined
    this.modelName =
      this.config.get<string>('GEMINI_MODEL') || 'gemini-2.0-flash'
    this.embeddingModel =
      this.config.get<string>('GEMINI_EMBEDDING_MODEL') || 'text-embedding-004'
    const flag = this.config.get<string>('FEATURE_AI')
    this.enabled = flag === undefined || flag === '' || flag === 'true'
  }

  isEnabled() {
    return this.enabled && Boolean(this.apiKey)
  }

  /** Soft in-memory rate limit for public AI endpoints. */
  assertRateLimit(key: string, limit = 12, windowMs = 60_000) {
    const now = Date.now()
    const bucket = this.rateBuckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
      this.rateBuckets.set(key, { count: 1, resetAt: now + windowMs })
      return
    }
    bucket.count += 1
    if (bucket.count > limit) {
      throw new BadRequestException('Too many requests. Try again shortly.')
    }
  }

  /** Queue embedding refresh — no-op when AI is off (never throws). */
  async enqueueEmbed(articleId: string): Promise<void> {
    if (!this.isEnabled()) {
      this.logger.debug(`Skip embed for ${articleId}: AI disabled or no key`)
      return
    }
    try {
      await this.aiQueue.add(
        'embed-article',
        { articleId } satisfies EmbedJobData,
        {
          jobId: `embed:${articleId}`,
          removeOnComplete: 100,
          removeOnFail: 200,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      )
    } catch (error: unknown) {
      this.logger.warn(
        `Failed to queue embed for ${articleId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
  }

  async processEmbed(articleId: string): Promise<void> {
    if (!this.isEnabled() || !this.apiKey) {
      throw new ServiceUnavailableException('AI embeddings are disabled')
    }

    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        titleBg: true,
        subtitleBg: true,
        categoryBg: true,
        locationBg: true,
        body: true,
      },
    })
    if (!article) throw new NotFoundException('Article not found')

    const text = this.buildEmbedText(article)
    if (!text.trim()) {
      this.logger.warn(`No text to embed for ${articleId}`)
      return
    }

    const vector = await this.embedText(text)
    await this.prisma.article.update({
      where: { id: articleId },
      data: {
        embedding: vector as unknown as Prisma.InputJsonValue,
        embeddingUpdatedAt: new Date(),
      },
    })
    this.logger.log(
      `Embedding stored for ${articleId} (${vector.length} dims)`,
    )
  }

  async embedText(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('GEMINI_API_KEY is not configured')
    }
    const genAI = new GoogleGenerativeAI(this.apiKey)
    const model = genAI.getGenerativeModel({ model: this.embeddingModel })
    const result = await model.embedContent(text.slice(0, EMBED_TEXT_MAX))
    const values = result.embedding?.values
    if (!values?.length) {
      throw new Error('Gemini returned an empty embedding')
    }
    return values.map((n) => Number(n))
  }

  static parseEmbedding(raw: unknown): number[] | null {
    if (!Array.isArray(raw) || raw.length === 0) return null
    const nums = raw.map((n) => Number(n))
    if (nums.some((n) => !Number.isFinite(n))) return null
    return nums
  }

  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || a.length !== b.length) return 0
    let dot = 0
    let na = 0
    let nb = 0
    for (let i = 0; i < a.length; i++) {
      dot += a[i]! * b[i]!
      na += a[i]! * a[i]!
      nb += b[i]! * b[i]!
    }
    if (na === 0 || nb === 0) return 0
    return dot / (Math.sqrt(na) * Math.sqrt(nb))
  }

  private buildEmbedText(article: {
    titleBg: string
    subtitleBg: string
    categoryBg: string
    locationBg: string
    body: unknown
  }): string {
    const parts: string[] = []
    if (article.titleBg?.trim()) parts.push(article.titleBg.trim())
    if (article.subtitleBg?.trim()) parts.push(article.subtitleBg.trim())
    if (article.categoryBg?.trim()) parts.push(article.categoryBg.trim())
    if (article.locationBg?.trim()) parts.push(article.locationBg.trim())

    const body = Array.isArray(article.body)
      ? (article.body as StoredArticleBlock[])
      : []
    for (const block of body) {
      if (block.type === 'note') {
        if (block.labelBg?.trim()) parts.push(block.labelBg.trim())
        if (block.textBg?.trim()) parts.push(block.textBg.trim())
      } else if (block.type === 'pullquote') {
        if (block.textBg?.trim()) parts.push(block.textBg.trim())
        if (block.citeBg?.trim()) parts.push(block.citeBg.trim())
      } else if (block.type === 'paragraph' || block.type === 'caption') {
        if (block.textBg?.trim()) parts.push(block.textBg.trim())
      }
    }
    return parts.join('\n\n')
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

  /**
   * Classify an inbound contact message for the CMS desk.
   * Returns UNKNOWN (never throws) when AI is off or the call fails.
   */
  async classifyContact(input: {
    name: string
    email: string
    subject: string
    message: string
  }): Promise<{
    category: 'BUSINESS' | 'STORY_TIP' | 'SPAM' | 'GENERAL' | 'UNKNOWN'
    summary: string | null
  }> {
    if (!this.enabled || !this.apiKey) {
      return { category: 'UNKNOWN', summary: null }
    }

    const prompt = `You classify inbound messages for Prizni, a digital journal of Northwestern Bulgaria.

Return ONLY valid JSON:
{
  "category": "BUSINESS" | "STORY_TIP" | "SPAM" | "GENERAL",
  "summary": "one short sentence in English for editors"
}

Categories:
- BUSINESS: sponsorship, partnership, advertising, commercial collaboration
- STORY_TIP: tip for a story, interview lead, local news worth reporting
- SPAM: scams, SEO spam, irrelevant marketing, gibberish
- GENERAL: questions, feedback, press, other non-spam mail

Name: ${input.name}
Email: ${input.email}
Subject: ${input.subject}
Message:
${input.message.trim().slice(0, 4000)}`

    const genAI = new GoogleGenerativeAI(this.apiKey)
    const model = genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    })

    try {
      const result = await model.generateContent(prompt)
      const parsed = this.parseJson(result.response.text())
      const raw = this.asString(parsed.category)?.toUpperCase() ?? ''
      const allowed = new Set([
        'BUSINESS',
        'STORY_TIP',
        'SPAM',
        'GENERAL',
      ])
      const category = allowed.has(raw)
        ? (raw as 'BUSINESS' | 'STORY_TIP' | 'SPAM' | 'GENERAL')
        : 'UNKNOWN'
      return {
        category,
        summary: this.asString(parsed.summary),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Contact classify failed: ${message}`)
      return { category: 'UNKNOWN', summary: null }
    }
  }

  /**
   * Short regional context for readers — places, history cues, why NW Bulgaria matters here.
   */
  async explainRegionalContext(input: {
    section: string
    slug: string
    lang?: 'bg' | 'en'
  }): Promise<{
    promptVersion: string
    lang: 'bg' | 'en'
    context: string
    placeNotes: string[]
    whyItMatters: string | null
  }> {
    if (!this.enabled) {
      throw new ServiceUnavailableException('AI assistant is disabled')
    }
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'GEMINI_API_KEY is not configured',
      )
    }

    const sectionFilter = toPrismaSectionFilter(input.section)
    const article = await this.prisma.article.findFirst({
      where: {
        status: ArticleStatus.PUBLISHED,
        slug: input.slug,
        ...(sectionFilter ? { section: sectionFilter } : {}),
      },
      select: {
        titleBg: true,
        titleEn: true,
        subtitleBg: true,
        subtitleEn: true,
        locationBg: true,
        locationEn: true,
        categoryBg: true,
        categoryEn: true,
        body: true,
      },
    })
    if (!article) throw new NotFoundException('Article not found')

    const lang: 'bg' | 'en' = input.lang === 'en' ? 'en' : 'bg'
    const langLabel = lang === 'bg' ? 'Bulgarian' : 'English'
    const title =
      lang === 'en'
        ? article.titleEn?.trim() || article.titleBg
        : article.titleBg
    const subtitle =
      lang === 'en'
        ? article.subtitleEn?.trim() || article.subtitleBg
        : article.subtitleBg
    const location =
      lang === 'en'
        ? article.locationEn?.trim() || article.locationBg
        : article.locationBg
    const category =
      lang === 'en'
        ? article.categoryEn?.trim() || article.categoryBg
        : article.categoryBg
    const bodyPreview = this.buildEmbedText(article).slice(0, 4500)

    const prompt = `You help readers of Prizni, a digital journal of Northwestern Bulgaria (Северозападна България), understand the regional context of a story.

Return ONLY valid JSON:
{
  "context": "2–4 short paragraphs (or one tight block) explaining the place, region, or cultural backdrop a non-local reader needs",
  "placeNotes": ["short factual place/region note", "..."],
  "whyItMatters": "one sentence on why this matters for NW Bulgaria / memory / community"
}

Rules:
- Write everything in ${langLabel} only
- Ground claims in the story text; do not invent specific historical dates, politicians, or scandals not supported by the draft
- Prefer geography, livelihoods, traditions, and everyday life over politics
- placeNotes: 2–5 short bullets; empty array if no place is named
- Warm, concrete tone — never tourism brochure or clickbait

Title: ${title}
Subtitle: ${subtitle || ''}
Location: ${location || '(not specified)'}
Category: ${category || ''}
Story text:
${bodyPreview || '(empty)'}`

    const genAI = new GoogleGenerativeAI(this.apiKey)
    const model = genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        temperature: 0.45,
        responseMimeType: 'application/json',
      },
    })

    try {
      const result = await model.generateContent(prompt)
      const parsed = this.parseJson(result.response.text())
      const context = this.asString(parsed.context)
      if (!context) {
        throw new Error('Empty context from model')
      }
      return {
        promptVersion: 'prizni-regional-context-v1',
        lang,
        context,
        placeNotes: this.asStringArray(parsed.placeNotes).slice(0, 6),
        whyItMatters: this.asString(parsed.whyItMatters),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`Regional context failed: ${message}`)
      throw new ServiceUnavailableException(
        `Regional context failed: ${message}`,
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
