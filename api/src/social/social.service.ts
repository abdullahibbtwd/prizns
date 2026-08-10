import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ArticleStatus, SocialPostStatus } from '@prisma/client'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { PrismaService } from '../prisma/prisma.service'
import {
  GenerateSocialDto,
  UpdateSocialPlatformsDto,
  UpdateSocialPostDto,
} from './dto/social.dto'
import {
  DEFAULT_SOCIAL_PLATFORMS,
  SOCIAL_PLATFORM_CATALOG,
  isKnownSocialPlatform,
  socialPlatformHint,
} from './platforms'

const PROMPT_VERSION = 'prizni-social-v2'
const SETTINGS_ID = 'default'

type PlatformCopy = { body: string; hashtags: string }

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name)
  private readonly apiKey: string | undefined
  private readonly modelName: string
  private readonly enabled: boolean

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.apiKey = this.config.get<string>('GEMINI_API_KEY') || undefined
    this.modelName =
      this.config.get<string>('GEMINI_MODEL') || 'gemini-2.0-flash'
    const flag = this.config.get<string>('FEATURE_SOCIAL')
    const aiFlag = this.config.get<string>('FEATURE_AI')
    this.enabled =
      (flag === undefined || flag === '' || flag === 'true') &&
      (aiFlag === undefined || aiFlag === '' || aiFlag === 'true')
  }

  catalog() {
    return SOCIAL_PLATFORM_CATALOG.map((p) => ({
      code: p.code,
      labelEn: p.labelEn,
      labelBg: p.labelBg,
      hintEn: p.hintEn,
      hintBg: p.hintBg,
      defaultSelected: Boolean(p.defaultSelected),
    }))
  }

  async getPlatformSettings() {
    const row = await this.ensureSettings()
    return {
      platforms: row.platforms,
      catalog: this.catalog(),
    }
  }

  async savePlatformSettings(dto: UpdateSocialPlatformsDto) {
    const unique = [...new Set(dto.platforms.map((p) => p.trim().toUpperCase()))]
      .filter(Boolean)
    const invalid = unique.filter((code) => !isKnownSocialPlatform(code))
    if (invalid.length) {
      throw new BadRequestException(
        `Unknown platforms: ${invalid.join(', ')}`,
      )
    }
    if (unique.length === 0) {
      throw new BadRequestException('Select at least one platform')
    }

    const row = await this.prisma.socialWorkspaceSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, platforms: unique },
      update: { platforms: unique },
    })
    return {
      platforms: row.platforms,
      catalog: this.catalog(),
    }
  }

  async list(filters?: { status?: string; articleId?: string }) {
    const where: {
      status?: SocialPostStatus
      articleId?: string
    } = {}
    if (
      filters?.status &&
      Object.values(SocialPostStatus).includes(
        filters.status as SocialPostStatus,
      )
    ) {
      where.status = filters.status as SocialPostStatus
    }
    if (filters?.articleId?.trim()) {
      where.articleId = filters.articleId.trim()
    }

    const rows = await this.prisma.socialPost.findMany({
      where,
      include: {
        article: {
          select: {
            id: true,
            titleBg: true,
            titleEn: true,
            path: true,
            section: true,
            status: true,
            slug: true,
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
    })
    return rows.map((row) => this.toDto(row))
  }

  async generate(dto: GenerateSocialDto) {
    if (!this.enabled) {
      throw new ServiceUnavailableException('Social generate is disabled')
    }
    if (!this.apiKey) {
      throw new ServiceUnavailableException('GEMINI_API_KEY is not configured')
    }

    const article = await this.prisma.article.findUnique({
      where: { id: dto.articleId },
    })
    if (!article) throw new NotFoundException('Article not found')
    if (article.status !== ArticleStatus.PUBLISHED) {
      throw new ServiceUnavailableException(
        'Generate social copy only for published stories',
      )
    }

    const settings = await this.ensureSettings()
    const platforms = settings.platforms.filter(isKnownSocialPlatform)
    if (platforms.length === 0) {
      throw new BadRequestException(
        'No platforms selected. Open platform settings and save a selection.',
      )
    }

    const site =
      this.config.get<string>('PUBLIC_SITE_URL')?.replace(/\/$/, '') ||
      'https://prizni.bg'
    const url = `${site}${article.path.startsWith('/') ? '' : '/'}${article.path}`

    const bodyText = this.bodyPlain(article.body).slice(0, 4000)
    const sample = [article.titleBg, article.subtitleBg, bodyText].join(' ')
    const cyrillic = (sample.match(/\p{Script=Cyrillic}/gu) ?? []).length
    const latin = (sample.match(/[A-Za-z]/g) ?? []).length
    const langLabel =
      cyrillic > 0 && cyrillic >= latin * 0.35 ? 'Bulgarian' : 'English'

    const shape = platforms
      .map(
        (code) =>
          `  "${code}": { "body": "...", "hashtags": "#... #..." }  // ${socialPlatformHint(code)}`,
      )
      .join(',\n')

    const prompt = `You write social copy for Prizni, a warm digital journal of Northwestern Bulgaria.

Write ALL copy in ${langLabel}. Tone: warm, concrete, photography-led, never clickbait.

Return ONLY valid JSON with EXACTLY these keys (and no others):
{
${shape}
}

Rules:
- Tailor length and format to each platform's native style (see comments)
- Include the story URL once in body when a CTA/link fits; skip heavy links on TikTok/Snapchat scripts
- hashtags: 0–8 relevant tags, space-separated (empty string ok for Reddit-like platforms)
- Do not invent facts beyond the story

Title: ${article.titleBg}
Subtitle: ${article.subtitleBg || ''}
URL: ${url}
Body:
${bodyText || '(empty)'}`

    const genAI = new GoogleGenerativeAI(this.apiKey)
    const model = genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        temperature: 0.75,
        responseMimeType: 'application/json',
      },
    })

    let pack: Record<string, PlatformCopy>
    try {
      const result = await model.generateContent(prompt)
      pack = this.parsePack(result.response.text(), platforms)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`Social generate failed: ${message}`)
      throw new ServiceUnavailableException(
        `Social generate failed: ${message}`,
      )
    }

    const saved = []
    for (const code of platforms) {
      const item = pack[code] ?? { body: '', hashtags: '' }
      const row = await this.prisma.socialPost.upsert({
        where: {
          articleId_platform: {
            articleId: article.id,
            platform: code,
          },
        },
        create: {
          articleId: article.id,
          platform: code,
          status: SocialPostStatus.DRAFT,
          body: item.body,
          hashtags: item.hashtags,
          promptVersion: PROMPT_VERSION,
          error: null,
          externalId: null,
          publishedAt: null,
          scheduledAt: null,
        },
        update: {
          status: SocialPostStatus.DRAFT,
          body: item.body,
          hashtags: item.hashtags,
          promptVersion: PROMPT_VERSION,
          error: null,
        },
        include: {
          article: {
            select: {
              id: true,
              titleBg: true,
              titleEn: true,
              path: true,
              section: true,
              status: true,
              slug: true,
            },
          },
        },
      })
      saved.push(this.toDto(row))
    }
    return saved
  }

  async update(id: string, dto: UpdateSocialPostDto) {
    const existing = await this.prisma.socialPost.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Social post not found')

    const row = await this.prisma.socialPost.update({
      where: { id },
      data: {
        ...(dto.body !== undefined ? { body: dto.body.trim() } : {}),
        ...(dto.hashtags !== undefined ? { hashtags: dto.hashtags.trim() } : {}),
        ...(dto.status
          ? {
              status:
                dto.status === 'APPROVED'
                  ? SocialPostStatus.APPROVED
                  : SocialPostStatus.DRAFT,
            }
          : {}),
      },
      include: {
        article: {
          select: {
            id: true,
            titleBg: true,
            titleEn: true,
            path: true,
            section: true,
            status: true,
            slug: true,
          },
        },
      },
    })
    return this.toDto(row)
  }

  async approve(id: string) {
    return this.update(id, { status: 'APPROVED' })
  }

  async remove(id: string) {
    const existing = await this.prisma.socialPost.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Social post not found')
    await this.prisma.socialPost.delete({ where: { id } })
    return { ok: true, id }
  }

  private async ensureSettings() {
    const existing = await this.prisma.socialWorkspaceSettings.findUnique({
      where: { id: SETTINGS_ID },
    })
    if (existing) return existing
    return this.prisma.socialWorkspaceSettings.create({
      data: {
        id: SETTINGS_ID,
        platforms: DEFAULT_SOCIAL_PLATFORMS,
      },
    })
  }

  private toDto(row: {
    id: string
    articleId: string
    platform: string
    status: SocialPostStatus
    body: string
    hashtags: string
    promptVersion: string | null
    scheduledAt: Date | null
    publishedAt: Date | null
    externalId: string | null
    error: string | null
    createdAt: Date
    updatedAt: Date
    article?: {
      id: string
      titleBg: string
      titleEn: string | null
      path: string
      section: string
      status: ArticleStatus
      slug: string
    }
  }) {
    return {
      id: row.id,
      articleId: row.articleId,
      platform: row.platform,
      status: row.status,
      body: row.body,
      hashtags: row.hashtags,
      promptVersion: row.promptVersion,
      scheduledAt: row.scheduledAt,
      publishedAt: row.publishedAt,
      externalId: row.externalId,
      error: row.error,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      article: row.article
        ? {
            id: row.article.id,
            titleBg: row.article.titleBg,
            title: row.article.titleEn ?? row.article.titleBg,
            path: row.article.path,
            section: row.article.section,
            status: row.article.status,
            slug: row.article.slug,
          }
        : undefined,
    }
  }

  private bodyPlain(body: unknown): string {
    if (!Array.isArray(body)) return ''
    return body
      .map((block) => {
        if (!block || typeof block !== 'object') return ''
        const b = block as { type?: string; textBg?: string }
        if (b.type === 'paragraph' || b.type === 'pullquote') {
          return (b.textBg || '').trim()
        }
        return ''
      })
      .filter(Boolean)
      .join('\n\n')
  }

  private parsePack(
    text: string,
    platforms: string[],
  ): Record<string, PlatformCopy> {
    const trimmed = text.trim()
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(trimmed) as Record<string, unknown>
    } catch {
      const start = trimmed.indexOf('{')
      const end = trimmed.lastIndexOf('}')
      if (start < 0 || end <= start) throw new Error('Model did not return JSON')
      parsed = JSON.parse(trimmed.slice(start, end + 1)) as Record<
        string,
        unknown
      >
    }

    const out: Record<string, PlatformCopy> = {}
    for (const code of platforms) {
      const raw =
        parsed[code] ??
        parsed[code.toLowerCase()] ??
        parsed[code.toUpperCase()]
      out[code] = this.asPlatform(raw)
    }
    return out
  }

  private asPlatform(value: unknown): PlatformCopy {
    if (!value || typeof value !== 'object') {
      return { body: '', hashtags: '' }
    }
    const v = value as { body?: unknown; hashtags?: unknown }
    return {
      body: typeof v.body === 'string' ? v.body.trim() : '',
      hashtags: typeof v.hashtags === 'string' ? v.hashtags.trim() : '',
    }
  }
}
