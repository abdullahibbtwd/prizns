import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DonationStatus, Prisma } from '@prisma/client';
import Stripe from 'stripe';
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

  private currency(): string {
    return (
      this.config.get<string>('STRIPE_CURRENCY')?.trim().toLowerCase() || 'bgn'
    );
  }

  async createCheckout(dto: CreateCheckoutDto) {
    const stripe = this.requireStripe();
    const amountCents = Math.round(Number(dto.amountBgn) * 100);
    if (!Number.isFinite(amountCents) || amountCents < 100) {
      throw new BadRequestException('amountBgn must be at least 1.00');
    }

    const currency = this.currency();
    const donation = await this.prisma.donation.create({
      data: {
        amountCents,
        currency,
        status: DonationStatus.PENDING,
        email: dto.email?.trim().toLowerCase() || null,
        name: dto.name?.trim() || null,
      },
    });

    const base = this.siteUrl();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: dto.email?.trim() || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: amountCents,
            product_data: {
              name: 'Donation to Prizni',
              description: 'One-time support for Prizni journalism',
            },
          },
        },
      ],
      success_url: `${base}/support?donation=success`,
      cancel_url: `${base}/support?donation=cancelled`,
      metadata: {
        kind: 'donation',
        donationId: donation.id,
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

  async listCms(filters: {
    page?: number;
    pageSize?: number;
    status?: DonationStatus;
  } = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
    const where: Prisma.DonationWhereInput = {};
    if (filters.status) where.status = filters.status;

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.donation.count({ where }),
      this.prisma.donation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
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
}
