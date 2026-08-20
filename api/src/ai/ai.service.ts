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
import { buildSuggestPrompt } from './suggest-prompt'

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

const PROMPT_VERSION = 'prizni-editorial-v3'
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
    this.embeddingModel = this.resolveEmbeddingModel(
      this.config.get<string>('GEMINI_EMBEDDING_MODEL') || 'gemini-embedding-001',
    )
    const flag = this.config.get<string>('FEATURE_AI')
    this.enabled = flag === undefined || flag === '' || flag === 'true'
  }

  isEnabled() {
    return this.enabled && Boolean(this.apiKey)
  }

  private resolveEmbeddingModel(name: string) {
    const trimmed = name.trim()
    if (
      trimmed === 'text-embedding-004' ||
      trimmed === 'embedding-001' ||
      trimmed === 'models/text-embedding-004'
    ) {
      this.logger.warn(
        `${trimmed} is retired; using gemini-embedding-001 instead`,
      )
      return 'gemini-embedding-001'
    }
    return trimmed || 'gemini-embedding-001'
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
    try {
      const genAI = new GoogleGenerativeAI(this.apiKey)
      const model = genAI.getGenerativeModel({ model: this.embeddingModel })
      const result = await model.embedContent(text.slice(0, EMBED_TEXT_MAX))
      const values = result.embedding?.values
      if (!values?.length) {
        throw new Error('Gemini returned an empty embedding')
      }
      return values.map((n) => Number(n))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`Embedding failed (${this.embeddingModel}): ${message}`)
      throw new ServiceUnavailableException(
        `Embedding failed: ${message}`,
      )
    }
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
    const bodyPreview = (dto.bodyText || '').trim()
    const prompt = buildSuggestPrompt({
      langLabel,
      section: dto.section || 'human-stories',
      titleBg: dto.titleBg,
      subtitleBg: dto.subtitleBg || '',
      locationBg: dto.locationBg,
      categoryBg: dto.categoryBg,
      bodyText: bodyPreview,
      variation: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    })

    const genAI = new GoogleGenerativeAI(this.apiKey)
    const model = genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        temperature: 0.95,
        topP: 0.95,
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

  /**
   * Retrieve published stories by embedding, then answer only from those
   * excerpts. Refuses when nothing in the archive is close enough.
   */
  async askArchive(input: { question: string; lang?: 'bg' | 'en' }): Promise<{
    refused: boolean
    answer: string | null
    lang: 'bg' | 'en'
    citations: Array<{
      path: string
      title: string
      titleBg: string
      score: number
    }>
  }> {
    if (!this.enabled) {
      throw new ServiceUnavailableException('AI assistant is disabled')
    }
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'GEMINI_API_KEY is not configured',
      )
    }

    const question = input.question.trim()
    const cyrillic = (question.match(/\p{Script=Cyrillic}/gu) ?? []).length
    const latin = (question.match(/[A-Za-z]/g) ?? []).length
    const lang: 'bg' | 'en' =
      input.lang ?? (cyrillic >= latin && cyrillic > 0 ? 'bg' : 'en')
    const langLabel = lang === 'bg' ? 'Bulgarian' : 'English'

    const queryVector = await this.embedText(question)
    const candidates = await this.prisma.article.findMany({
      where: {
        status: ArticleStatus.PUBLISHED,
        embedding: { not: Prisma.DbNull },
      },
      select: {
        id: true,
        path: true,
        titleBg: true,
        titleEn: true,
        subtitleBg: true,
        subtitleEn: true,
        locationBg: true,
        categoryBg: true,
        body: true,
        embedding: true,
      },
      orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
      take: 80,
    })

    const staleIds: string[] = []
    const scored = candidates
      .map((row) => {
        const vector = AiService.parseEmbedding(row.embedding)
        if (!vector) return null
        if (vector.length !== queryVector.length) {
          staleIds.push(row.id)
          return null
        }
        const score = AiService.cosineSimilarity(queryVector, vector)
        if (score < 0.32) return null
        return { row, score }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)

    if (staleIds.length > 0) {
      this.logger.warn(
        `Re-queueing ${staleIds.length} story embeddings for ${this.embeddingModel}`,
      )
      for (const id of staleIds) {
        void this.enqueueEmbed(id)
      }
    }

    if (scored.length === 0) {
      return { refused: true, answer: null, lang, citations: [] }
    }

    const excerpts = scored.map((item, index) => {
      const title =
        lang === 'en'
          ? item.row.titleEn?.trim() || item.row.titleBg
          : item.row.titleBg
      const excerpt = this.buildEmbedText(item.row).slice(0, 1200)
      return `[${index + 1}] ${title} (${item.row.path})\n${excerpt}`
    })

    const prompt = `You answer questions for readers of Prizni using ONLY the numbered archive excerpts below.

Return ONLY valid JSON:
{
  "answer": "short answer in ${langLabel}, or empty string if the excerpts do not contain the answer",
  "used": [1]
}

Rules:
- Write the answer in ${langLabel} only
- Cite sources inline as [1], [2] matching the excerpt numbers
- If the excerpts do not support an answer, return answer as an empty string
- Do not invent places, dates, people, or traditions not present in the excerpts
- Do not use general knowledge about Bulgaria beyond the excerpts

Question: ${question}

Excerpts:
${excerpts.join('\n\n')}`

    const genAI = new GoogleGenerativeAI(this.apiKey)
    const model = genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    })

    try {
      const result = await model.generateContent(prompt)
      const parsed = this.parseJson(result.response.text())
      const answer = this.asString(parsed.answer)
      const citations = scored.map((item) => ({
        path: item.row.path.startsWith('/') ? item.row.path : `/${item.row.path}`,
        title: item.row.titleEn?.trim() || item.row.titleBg,
        titleBg: item.row.titleBg,
        score: Math.round(item.score * 1000) / 1000,
      }))
      if (!answer) {
        return { refused: true, answer: null, lang, citations }
      }
      return { refused: false, answer, lang, citations }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`Ask archive failed: ${message}`)
      throw new ServiceUnavailableException(`Ask archive failed: ${message}`)
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
