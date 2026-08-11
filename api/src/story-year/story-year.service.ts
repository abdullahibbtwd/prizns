import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  ArticleStatus,
  StoryYearCampaignStatus,
} from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type {
  CreateStoryYearCampaignDto,
  SetNominationsDto,
  UpdateStoryYearCampaignDto,
} from './dto/story-year.dto'

@Injectable()
export class StoryYearService {
  constructor(private readonly prisma: PrismaService) {}

  private isVotingOpen(campaign: {
    status: StoryYearCampaignStatus
    opensAt: Date | null
    closesAt: Date | null
  }) {
    if (campaign.status !== StoryYearCampaignStatus.OPEN) return false
    const now = Date.now()
    if (campaign.opensAt && campaign.opensAt.getTime() > now) return false
    if (campaign.closesAt && campaign.closesAt.getTime() < now) return false
    return true
  }

  listCms() {
    return this.prisma.storyYearCampaign.findMany({
      orderBy: { year: 'desc' },
      include: {
        _count: { select: { nominations: true, votes: true } },
      },
    })
  }

  async getCms(id: string) {
    const campaign = await this.prisma.storyYearCampaign.findUnique({
      where: { id },
      include: {
        nominations: {
          orderBy: { sortOrder: 'asc' },
          include: {
            article: {
              select: {
                id: true,
                titleBg: true,
                titleEn: true,
                path: true,
                section: true,
                slug: true,
                status: true,
                heroMedia: { select: { url: true } },
              },
            },
            _count: { select: { votes: true } },
          },
        },
        _count: { select: { votes: true } },
      },
    })
    if (!campaign) throw new NotFoundException('Campaign not found')
    return campaign
  }

  create(dto: CreateStoryYearCampaignDto) {
    return this.prisma.storyYearCampaign.create({
      data: {
        year: dto.year,
        titleBg: dto.titleBg.trim(),
        titleEn: dto.titleEn?.trim() || null,
        descriptionBg: dto.descriptionBg?.trim() || '',
        descriptionEn: dto.descriptionEn?.trim() || null,
        status: dto.status ?? StoryYearCampaignStatus.DRAFT,
        opensAt: dto.opensAt ? new Date(dto.opensAt) : null,
        closesAt: dto.closesAt ? new Date(dto.closesAt) : null,
      },
    })
  }

  async update(id: string, dto: UpdateStoryYearCampaignDto) {
    await this.getCms(id)
    return this.prisma.storyYearCampaign.update({
      where: { id },
      data: {
        ...(dto.titleBg !== undefined ? { titleBg: dto.titleBg.trim() } : {}),
        ...(dto.titleEn !== undefined
          ? { titleEn: dto.titleEn?.trim() || null }
          : {}),
        ...(dto.descriptionBg !== undefined
          ? { descriptionBg: dto.descriptionBg.trim() }
          : {}),
        ...(dto.descriptionEn !== undefined
          ? { descriptionEn: dto.descriptionEn?.trim() || null }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.opensAt !== undefined
          ? { opensAt: dto.opensAt ? new Date(dto.opensAt) : null }
          : {}),
        ...(dto.closesAt !== undefined
          ? { closesAt: dto.closesAt ? new Date(dto.closesAt) : null }
          : {}),
      },
    })
  }

  async setNominations(id: string, dto: SetNominationsDto) {
    const campaign = await this.getCms(id)
    const unique = [...new Set(dto.articleIds.map((x) => x.trim()).filter(Boolean))]
    if (unique.length > 0) {
      const published = await this.prisma.article.findMany({
        where: { id: { in: unique }, status: ArticleStatus.PUBLISHED },
        select: { id: true },
      })
      if (published.length !== unique.length) {
        throw new BadRequestException(
          'All nominations must be published articles',
        )
      }
    }

    await this.prisma.$transaction([
      this.prisma.storyYearNomination.deleteMany({
        where: { campaignId: campaign.id },
      }),
      ...(unique.length
        ? [
            this.prisma.storyYearNomination.createMany({
              data: unique.map((articleId, sortOrder) => ({
                campaignId: campaign.id,
                articleId,
                sortOrder,
              })),
            }),
          ]
        : []),
    ])

    return this.getCms(id)
  }

  async getPublicCurrent(readerId?: string | null) {
    const include = {
      nominations: {
        orderBy: { sortOrder: 'asc' as const },
        include: {
          article: {
            select: {
              id: true,
              titleBg: true,
              titleEn: true,
              subtitleBg: true,
              subtitleEn: true,
              path: true,
              section: true,
              slug: true,
              locationBg: true,
              locationEn: true,
              heroMedia: { select: { url: true } },
              author: {
                select: {
                  slug: true,
                  nameBg: true,
                  nameEn: true,
                },
              },
            },
          },
          _count: { select: { votes: true } },
        },
      },
      _count: { select: { votes: true } },
    }

    const open = await this.prisma.storyYearCampaign.findFirst({
      where: { status: StoryYearCampaignStatus.OPEN },
      orderBy: { year: 'desc' },
      include,
    })
    const active =
      open ??
      (await this.prisma.storyYearCampaign.findFirst({
        where: { status: StoryYearCampaignStatus.CLOSED },
        orderBy: { year: 'desc' },
        include,
      }))

    if (!active) return null

    const votingOpen = this.isVotingOpen(active)

    let myVoteArticleId: string | null = null
    if (readerId) {
      const vote = await this.prisma.storyYearVote.findUnique({
        where: {
          campaignId_readerId: {
            campaignId: active.id,
            readerId,
          },
        },
        select: { articleId: true },
      })
      myVoteArticleId = vote?.articleId ?? null
    }

    return {
      id: active.id,
      year: active.year,
      titleBg: active.titleBg,
      titleEn: active.titleEn,
      descriptionBg: active.descriptionBg,
      descriptionEn: active.descriptionEn,
      status: active.status,
      votingOpen,
      opensAt: active.opensAt?.toISOString() ?? null,
      closesAt: active.closesAt?.toISOString() ?? null,
      totalVotes: active._count.votes,
      myVoteArticleId,
      nominations: active.nominations.map((n) => ({
        id: n.id,
        articleId: n.article.id,
        path: n.article.path,
        titleBg: n.article.titleBg,
        titleEn: n.article.titleEn,
        subtitleBg: n.article.subtitleBg,
        subtitleEn: n.article.subtitleEn,
        locationBg: n.article.locationBg,
        locationEn: n.article.locationEn,
        heroUrl: n.article.heroMedia?.url ?? null,
        authorNameBg: n.article.author?.nameBg ?? null,
        authorNameEn: n.article.author?.nameEn ?? null,
        authorSlug: n.article.author?.slug ?? null,
        voteCount: n._count.votes,
      })),
    }
  }

  async castVote(readerId: string, articleId: string) {
    const campaign = await this.prisma.storyYearCampaign.findFirst({
      where: { status: StoryYearCampaignStatus.OPEN },
      orderBy: { year: 'desc' },
    })
    if (!campaign || !this.isVotingOpen(campaign)) {
      throw new BadRequestException('Voting is not open')
    }

    const nomination = await this.prisma.storyYearNomination.findUnique({
      where: {
        campaignId_articleId: {
          campaignId: campaign.id,
          articleId,
        },
      },
    })
    if (!nomination) {
      throw new BadRequestException('This story is not nominated')
    }

    await this.prisma.storyYearVote.upsert({
      where: {
        campaignId_readerId: {
          campaignId: campaign.id,
          readerId,
        },
      },
      create: {
        campaignId: campaign.id,
        readerId,
        nominationId: nomination.id,
        articleId,
      },
      update: {
        nominationId: nomination.id,
        articleId,
      },
    })

    return this.getPublicCurrent(readerId)
  }
}
