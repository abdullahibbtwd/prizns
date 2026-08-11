import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  ArticleStatus,
  DigestSendStatus,
  SeriesStatus,
} from '@prisma/client'
import { MailService } from '../mail/mail.service'
import { PrismaService } from '../prisma/prisma.service'
import { SendDigestDto } from './dto/send-digest.dto'

@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async preview(seriesId?: string) {
    const next = await this.findNextEpisode(seriesId)
    if (!next) {
      return { next: null, subscriberCount: await this.subscriberCount() }
    }
    return {
      next,
      subscriberCount: await this.subscriberCount(),
      mailConfigured: this.mail.isConfigured(),
    }
  }

  async history() {
    const rows = await this.prisma.episodeDigestSend.findMany({
      orderBy: { sentAt: 'desc' },
      take: 40,
      include: {
        series: { select: { id: true, titleBg: true, titleEn: true, slug: true } },
        article: {
          select: {
            id: true,
            titleBg: true,
            titleEn: true,
            path: true,
            slug: true,
          },
        },
      },
    })
    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      subject: row.subject,
      recipientCount: row.recipientCount,
      resendId: row.resendId,
      error: row.error,
      sentAt: row.sentAt,
      series: {
        id: row.series.id,
        titleBg: row.series.titleBg,
        title: row.series.titleEn ?? row.series.titleBg,
        slug: row.series.slug,
      },
      article: {
        id: row.article.id,
        titleBg: row.article.titleBg,
        title: row.article.titleEn ?? row.article.titleBg,
        path: row.article.path,
        slug: row.article.slug,
      },
    }))
  }

  /**
   * Fire-and-forget Episode of the Day when a series story is published.
   * Skips when FEATURE_DIGEST is off, mail missing, not in an ACTIVE series,
   * or already SENT. Never throws to the caller.
   */
  async trySendForPublishedArticle(articleId: string): Promise<void> {
    const flag = this.config
      .get<string>('FEATURE_DIGEST')
      ?.trim()
      .toLowerCase()
    if (flag === 'false' || flag === '0') return

    if (!this.mail.isConfigured()) {
      this.logger.warn(
        `Skip auto digest for ${articleId}: RESEND not configured`,
      )
      return
    }

    const membership = await this.prisma.seriesEpisode.findFirst({
      where: {
        articleId,
        article: { status: ArticleStatus.PUBLISHED },
        series: { status: SeriesStatus.ACTIVE },
      },
      select: { seriesId: true, articleId: true },
    })
    if (!membership) return

    const already = await this.prisma.episodeDigestSend.findUnique({
      where: {
        seriesId_articleId: {
          seriesId: membership.seriesId,
          articleId: membership.articleId,
        },
      },
      select: { status: true },
    })
    if (already?.status === DigestSendStatus.SENT) return

    try {
      const result = await this.sendNow({
        seriesId: membership.seriesId,
        articleId: membership.articleId,
      })
      this.logger.log(
        `Auto Episode of the Day sent for article ${articleId} → ${result.recipientCount} subscribers`,
      )
    } catch (error: unknown) {
      this.logger.error(
        `Auto digest failed for ${articleId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
  }

  async sendNow(dto: SendDigestDto) {
    if (!this.mail.isConfigured()) {
      throw new ServiceUnavailableException(
        'RESEND_API_KEY is not configured',
      )
    }

    const episode = await this.resolveEpisode(dto)
    if (!episode) {
      throw new BadRequestException('No undigested published episode found')
    }

    const already = await this.prisma.episodeDigestSend.findUnique({
      where: {
        seriesId_articleId: {
          seriesId: episode.seriesId,
          articleId: episode.articleId,
        },
      },
    })
    if (already?.status === DigestSendStatus.SENT) {
      throw new BadRequestException(
        'This episode was already sent (no double-send)',
      )
    }

    const subscribers = await this.prisma.newsletterSubscriber.findMany({
      select: { email: true },
      orderBy: { createdAt: 'asc' },
    })
    const emails = subscribers.map((s) => s.email).filter(Boolean)
    if (emails.length === 0) {
      throw new BadRequestException('No newsletter subscribers')
    }

    const site =
      this.config.get<string>('PUBLIC_SITE_URL')?.replace(/\/$/, '') ||
      'https://prizni.bg'
    const url = `${site}${episode.path.startsWith('/') ? '' : '/'}${episode.path}`
    const subject = `Епизод на деня · ${episode.titleBg}`
    const html = this.buildHtml({
      seriesTitle: episode.seriesTitleBg,
      episodeTitle: episode.titleBg,
      subtitle: episode.subtitleBg,
      url,
      episodeNumber: episode.episodeNumber,
    })
    const text = [
      `Епизод на деня — ${episode.seriesTitleBg}`,
      `Епизод ${episode.episodeNumber}: ${episode.titleBg}`,
      episode.subtitleBg,
      url,
    ]
      .filter(Boolean)
      .join('\n\n')

    try {
      const result = await this.mail.send({
        to: emails,
        subject,
        html,
        text,
      })

      const row = await this.prisma.episodeDigestSend.upsert({
        where: {
          seriesId_articleId: {
            seriesId: episode.seriesId,
            articleId: episode.articleId,
          },
        },
        create: {
          seriesId: episode.seriesId,
          articleId: episode.articleId,
          status: DigestSendStatus.SENT,
          recipientCount: result.recipientCount,
          resendId: result.ids[0] ?? null,
          subject,
          error: null,
          sentAt: new Date(),
        },
        update: {
          status: DigestSendStatus.SENT,
          recipientCount: result.recipientCount,
          resendId: result.ids[0] ?? null,
          subject,
          error: null,
          sentAt: new Date(),
        },
      })

      return {
        ok: true,
        id: row.id,
        recipientCount: result.recipientCount,
        resendIds: result.ids,
        episode,
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`Digest send failed: ${message}`)
      await this.prisma.episodeDigestSend.upsert({
        where: {
          seriesId_articleId: {
            seriesId: episode.seriesId,
            articleId: episode.articleId,
          },
        },
        create: {
          seriesId: episode.seriesId,
          articleId: episode.articleId,
          status: DigestSendStatus.FAILED,
          recipientCount: 0,
          subject,
          error: message.slice(0, 2000),
          sentAt: new Date(),
        },
        update: {
          status: DigestSendStatus.FAILED,
          error: message.slice(0, 2000),
          sentAt: new Date(),
        },
      })
      throw new ServiceUnavailableException(`Digest send failed: ${message}`)
    }
  }

  private async subscriberCount() {
    return this.prisma.newsletterSubscriber.count()
  }

  private async resolveEpisode(dto: SendDigestDto) {
    if (dto.articleId && dto.seriesId) {
      const ep = await this.prisma.seriesEpisode.findFirst({
        where: {
          seriesId: dto.seriesId,
          articleId: dto.articleId,
          article: { status: ArticleStatus.PUBLISHED },
        },
        include: {
          series: true,
          article: true,
        },
      })
      if (!ep) throw new NotFoundException('Episode not found')
      return this.mapEpisode(ep)
    }
    return this.findNextEpisode(dto.seriesId)
  }

  private async findNextEpisode(seriesId?: string) {
    const seriesList = await this.prisma.series.findMany({
      where: {
        status: SeriesStatus.ACTIVE,
        ...(seriesId?.trim() ? { id: seriesId.trim() } : {}),
      },
      include: {
        episodes: {
          orderBy: { sortOrder: 'asc' },
          include: { article: true },
        },
        digestSends: {
          where: { status: DigestSendStatus.SENT },
          select: { articleId: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    for (const series of seriesList) {
      const sent = new Set(series.digestSends.map((d) => d.articleId))
      for (const ep of series.episodes) {
        if (ep.article.status !== ArticleStatus.PUBLISHED) continue
        if (sent.has(ep.articleId)) continue
        return this.mapEpisode({ ...ep, series })
      }
    }
    return null
  }

  private mapEpisode(ep: {
    seriesId: string
    articleId: string
    sortOrder: number
    series: { id: string; titleBg: string; titleEn: string | null; slug: string }
    article: {
      id: string
      titleBg: string
      titleEn: string | null
      subtitleBg: string
      path: string
      slug: string
    }
  }) {
    return {
      seriesId: ep.series.id,
      seriesTitleBg: ep.series.titleBg,
      seriesTitle: ep.series.titleEn ?? ep.series.titleBg,
      seriesSlug: ep.series.slug,
      articleId: ep.article.id,
      titleBg: ep.article.titleBg,
      title: ep.article.titleEn ?? ep.article.titleBg,
      subtitleBg: ep.article.subtitleBg,
      path: ep.article.path,
      slug: ep.article.slug,
      episodeNumber: ep.sortOrder + 1,
    }
  }

  private buildHtml(input: {
    seriesTitle: string
    episodeTitle: string
    subtitle: string
    url: string
    episodeNumber: number
  }) {
    const safe = (s: string) =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    return `<!DOCTYPE html>
<html lang="bg">
<body style="margin:0;padding:0;background:#FAF8F3;font-family:Georgia,serif;color:#1A1A1A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FAF8F3;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background:#FDFBF7;border:1px solid #E8E4DC;border-radius:16px;padding:32px;">
          <tr><td style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#0C2686;">Епизод на деня</td></tr>
          <tr><td style="padding-top:12px;font-size:14px;color:#666;">${safe(input.seriesTitle)} · Епизод ${input.episodeNumber}</td></tr>
          <tr><td style="padding-top:16px;font-size:28px;line-height:1.25;">${safe(input.episodeTitle)}</td></tr>
          ${
            input.subtitle
              ? `<tr><td style="padding-top:12px;font-size:16px;line-height:1.5;color:#444;">${safe(input.subtitle)}</td></tr>`
              : ''
          }
          <tr>
            <td style="padding-top:28px;">
              <a href="${safe(input.url)}" style="display:inline-block;background:#0C2686;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-family:sans-serif;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;">Прочетете епизода</a>
            </td>
          </tr>
          <tr><td style="padding-top:28px;font-size:12px;color:#888;font-family:sans-serif;">Prizni — живият журнал на Северозапада</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  }
}
