import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ArticleStatus, DonationStatus, Prisma } from '@prisma/client';
import Stripe from 'stripe';
import { absoluteSiteUrl } from '../common/money.util';
import { PrismaService } from '../prisma/prisma.service';
import { ShopService } from '../shop/shop.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@Injectable()
export class DonationsService {
  private readonly logger = new Logger(DonationsService.name);
  private stripe: Stripe | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => ShopService))
    private readonly shop: ShopService,
  ) {
    const secret = this.config.get<string>('STRIPE_SECRET_KEY')?.trim();
    if (secret) {
      this.stripe = new Stripe(secret);
    }
  }

  private requireStripe(): Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException(
        'Stripe is not configured. Set STRIPE_SECRET_KEY to enable donations.',
      );
    }
    return this.stripe;
  }

  private siteUrl(): string {
    const raw =
      this.config.get<string>('PUBLIC_SITE_URL')?.trim() ||
      'http://localhost:5175';
    return raw.replace(/\/+$/, '');
  }

  /**
   * Stripe settlement currency (BGN removed after euro adoption).
   * Donor amounts on Support are EUR.
   */
  private stripeCurrency(): string {
    const raw =
      this.config.get<string>('STRIPE_CURRENCY')?.trim().toLowerCase() || 'eur';
    return raw === 'bgn' ? 'eur' : raw;
  }

  async createCheckout(dto: CreateCheckoutDto) {
    const stripe = this.requireStripe();
    const amount = Number(dto.amountBgn);
    const amountCents = Math.round(amount * 100);
    if (!Number.isFinite(amountCents) || amountCents < 100) {
      throw new BadRequestException('amount must be at least 1.00 EUR');
    }

    let article: {
      id: string;
      path: string;
      titleBg: string;
      titleEn: string | null;
    } | null = null;
    const articleId = dto.articleId?.trim();
    if (articleId) {
      article = await this.prisma.article.findFirst({
        where: { id: articleId, status: ArticleStatus.PUBLISHED },
        select: { id: true, path: true, titleBg: true, titleEn: true },
      });
      if (!article) {
        throw new NotFoundException('Published article not found');
      }
    }

    // Persist the donor-facing EUR amount; Stripe charges EUR.
    const donation = await this.prisma.donation.create({
      data: {
        amountCents,
        currency: 'eur',
        status: DonationStatus.PENDING,
        email: dto.email?.trim().toLowerCase() || null,
        name: dto.name?.trim() || null,
        articleId: article?.id ?? null,
      },
    });

    const base = this.siteUrl();
    const storyTitle = article
      ? (article.titleEn?.trim() || article.titleBg).trim()
      : null;
    const storyPath = article
      ? article.path.startsWith('/')
        ? article.path
        : `/${article.path}`
      : null;
    const successUrl = absoluteSiteUrl(base, storyPath || '/support', {
      donation: 'success',
    });
    const cancelUrl = absoluteSiteUrl(base, storyPath || '/support', {
      donation: 'cancelled',
    });

    const amountLabel = `${amount.toFixed(2)} EUR`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: dto.email?.trim() || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: this.stripeCurrency(),
            unit_amount: amountCents,
            product_data: {
              name: storyTitle
                ? `Support: ${storyTitle.slice(0, 100)}`
                : 'Donation to Prizni',
              description: storyTitle
                ? `Micro-donation ${amountLabel} for this Prizni story`
                : `One-time support ${amountLabel}`,
            },
          },
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        kind: 'donation',
        donationId: donation.id,
        amountEur: String(amount),
        amountEurCents: String(amountCents),
        ...(article ? { articleId: article.id } : {}),
      },
    });

    await this.prisma.donation.update({
      where: { id: donation.id },
      data: { stripeSessionId: session.id },
    });

    if (!session.url) {
      throw new ServiceUnavailableException(
        'Stripe Checkout Session did not return a URL',
      );
    }

    return { url: session.url };
  }

  async handleWebhook(rawBody: Buffer, signature: string | undefined) {
    const stripe = this.requireStripe();
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET')?.trim();
    if (!secret) {
      throw new ServiceUnavailableException(
        'Stripe webhook secret is not configured. Set STRIPE_WEBHOOK_SECRET.',
      );
    }
    if (!signature) {
      throw new BadRequestException('Missing Stripe-Signature header');
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Stripe webhook signature failed: ${message}`);
      throw new BadRequestException(`Webhook Error: ${message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const kind = session.metadata?.kind;

      if (kind === 'shop' || session.metadata?.orderId) {
        await this.shop.handleCheckoutCompleted(session);
        return { received: true as const };
      }

      const donationId = session.metadata?.donationId;
      const paymentIntent =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id || null;

      if (donationId) {
        await this.prisma.donation.updateMany({
          where: { id: donationId },
          data: {
            status: DonationStatus.COMPLETED,
            stripeSessionId: session.id,
            stripePaymentIntentId: paymentIntent,
          },
        });
      } else if (session.id) {
        await this.prisma.donation.updateMany({
          where: { stripeSessionId: session.id },
          data: {
            status: DonationStatus.COMPLETED,
            stripePaymentIntentId: paymentIntent,
          },
        });
      }
    }

    return { received: true as const };
  }

  /** Abandoned Stripe sessions older than this are deleted (never paid). */
  static readonly PENDING_RETENTION_DAYS = 7;

  private lastPendingPurgeAt = 0;

  /** Delete PENDING donations older than 7 days (throttled). */
  async purgeAbandonedPending(force = false): Promise<number> {
    const now = Date.now();
    if (!force && now - this.lastPendingPurgeAt < 60 * 60 * 1000) {
      return 0;
    }
    this.lastPendingPurgeAt = now;
    const cutoff = new Date(
      now - DonationsService.PENDING_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    const result = await this.prisma.donation.deleteMany({
      where: {
        status: DonationStatus.PENDING,
        createdAt: { lt: cutoff },
      },
    });
    if (result.count > 0) {
      this.logger.log(
        `Purged ${result.count} abandoned PENDING donation(s) older than ${DonationsService.PENDING_RETENTION_DAYS} days`,
      );
    }
    return result.count;
  }

  async listCms(filters: {
    page?: number;
    pageSize?: number;
    status?: DonationStatus;
  } = {}) {
    void this.purgeAbandonedPending();
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
    const where: Prisma.DonationWhereInput = {
      // Abandoned Stripe checkouts stay PENDING — hide them unless asked.
      status: filters.status ?? DonationStatus.COMPLETED,
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.donation.count({ where }),
      this.prisma.donation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          article: {
            select: {
              id: true,
              path: true,
              titleBg: true,
              titleEn: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return {
      items: rows.map((row) => ({
        id: row.id,
        amountCents: row.amountCents,
        amountBgn: row.amountCents / 100,
        currency: row.currency,
        status: row.status,
        email: row.email,
        name: row.name,
        articleId: row.articleId,
        article: row.article
          ? {
              id: row.article.id,
              path: row.article.path,
              titleBg: row.article.titleBg,
              titleEn: row.article.titleEn,
            }
          : null,
        stripeSessionId: row.stripeSessionId,
        stripePaymentIntentId: row.stripePaymentIntentId,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Completed-donation totals for the CMS chart.
   * granularity: day (last 30), month (last 12), year (all years present).
   */
  async getCmsTrend(granularity: 'day' | 'month' | 'year' = 'day') {
    void this.purgeAbandonedPending();

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const dayKey = (d: Date) =>
      `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    const monthKey = (d: Date) =>
      `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
    const yearKey = (d: Date) => String(d.getUTCFullYear());
    const monthLabels = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    let since: Date | undefined;
    if (granularity === 'day') {
      since = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      );
      since.setUTCDate(since.getUTCDate() - 29);
    } else if (granularity === 'month') {
      since = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1),
      );
    }

    const rows = await this.prisma.donation.findMany({
      where: {
        status: DonationStatus.COMPLETED,
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      select: { amountCents: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const buckets = new Map<string, number>();

    if (granularity === 'day') {
      for (let i = 0; i < 30; i += 1) {
        const d = new Date(since!);
        d.setUTCDate(since!.getUTCDate() + i);
        buckets.set(dayKey(d), 0);
      }
      for (const row of rows) {
        const k = dayKey(row.createdAt);
        if (buckets.has(k)) {
          buckets.set(k, (buckets.get(k) ?? 0) + row.amountCents);
        }
      }
    } else if (granularity === 'month') {
      for (let i = 0; i < 12; i += 1) {
        const d = new Date(
          Date.UTC(since!.getUTCFullYear(), since!.getUTCMonth() + i, 1),
        );
        buckets.set(monthKey(d), 0);
      }
      for (const row of rows) {
        const k = monthKey(row.createdAt);
        if (buckets.has(k)) {
          buckets.set(k, (buckets.get(k) ?? 0) + row.amountCents);
        }
      }
    } else {
      for (const row of rows) {
        const k = yearKey(row.createdAt);
        buckets.set(k, (buckets.get(k) ?? 0) + row.amountCents);
      }
      if (buckets.size === 0) {
        buckets.set(yearKey(now), 0);
      }
    }

    const series = [...buckets.entries()].map(([key, cents]) => {
      let label = key;
      if (granularity === 'day') {
        const [, m, d] = key.split('-');
        label = `${d} ${monthLabels[Number(m) - 1]}`;
      } else if (granularity === 'month') {
        const [y, m] = key.split('-');
        label = `${monthLabels[Number(m) - 1]} ${y}`;
      }
      return {
        key,
        label,
        amountBgn: cents / 100,
        amountCents: cents,
      };
    });

    const todayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );

    const [todayAgg, monthAgg] = await Promise.all([
      this.prisma.donation.aggregate({
        where: {
          status: DonationStatus.COMPLETED,
          createdAt: { gte: todayStart },
        },
        _sum: { amountCents: true },
      }),
      this.prisma.donation.aggregate({
        where: {
          status: DonationStatus.COMPLETED,
          createdAt: { gte: monthStart },
        },
        _sum: { amountCents: true },
      }),
    ]);

    const todayCents = todayAgg._sum.amountCents ?? 0;
    const monthCents = monthAgg._sum.amountCents ?? 0;
    const rangeCents = series.reduce((s, p) => s + p.amountCents, 0);

    return {
      granularity,
      series,
      todayBgn: todayCents / 100,
      monthBgn: monthCents / 100,
      rangeBgn: rangeCents / 100,
      pendingRetentionDays: DonationsService.PENDING_RETENTION_DAYS,
    };
  }
}
