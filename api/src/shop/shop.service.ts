import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, ShopOrderStatus, ShopPaymentMethod } from '@prisma/client';
import Stripe from 'stripe';
import { MailService } from '../mail/mail.service';
import { absoluteSiteUrl } from '../common/money.util';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ensureUniqueSlug } from '../common/slug.util';
import {
  CreateCodOrderDto,
  CreateProductDto,
  CreateShopCheckoutDto,
  TrackOrderDto,
  UpdateProductDto,
} from './dto/shop.dto';
import {
  generateOrderPublicId,
  maskEmail,
  normalizeEmail,
  safeEqualString,
  buildEstimatedArrivalFields,
  type ArrivalDayType,
} from './shop.util';

type RateBucket = { count: number; resetAt: number };

@Injectable()
export class ShopService {
  private readonly logger = new Logger(ShopService.name);
  private stripe: Stripe | null = null;
  private readonly rateBuckets = new Map<string, RateBucket>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly storage: StorageService,
    private readonly mail: MailService,
  ) {
    const secret = this.config.get<string>('STRIPE_SECRET_KEY')?.trim();
    if (secret) this.stripe = new Stripe(secret);
  }

  isEnabled() {
    const flag = this.config.get<string>('FEATURE_SHOP')?.trim().toLowerCase();
    return flag === 'true' || flag === '1';
  }

  assertEnabled() {
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException(
        'Shop is disabled. Set FEATURE_SHOP=true to enable.',
      );
    }
  }

  private requireStripe(): Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException(
        'Stripe is not configured. Set STRIPE_SECRET_KEY.',
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
    // Stripe dropped BGN after Bulgaria’s euro adoption — map legacy env to EUR.
    const raw =
      this.config.get<string>('STRIPE_CURRENCY')?.trim().toLowerCase() || 'eur';
    return this.normalizeCurrency(raw);
  }

  private normalizeCurrency(code: string | null | undefined): string {
    const raw = (code ?? 'eur').trim().toLowerCase() || 'eur';
    return raw === 'bgn' ? 'eur' : raw;
  }

  private mediaUrl(media: { key: string; url: string } | null | undefined) {
    if (!media) return '';
    const url = (media.url ?? '').trim();
    if (
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      (url.startsWith('/') && !url.startsWith('/media'))
    ) {
      return url;
    }
    return this.storage.publicUrlFor(media.key);
  }

  private productInclude = {
    imageMedia: true,
    galleryItems: {
      orderBy: { sortOrder: 'asc' as const },
      include: { media: true },
    },
  } as const;

  private galleryFromProduct(row: {
    galleryItems?: Array<{
      sortOrder: number;
      media: { id: string; key: string; url: string };
    }>;
    imageMediaId?: string | null;
    imageMedia?: { id?: string; key: string; url: string } | null;
  }) {
    const fromJoin = (row.galleryItems ?? []).map((item) => ({
      id: item.media.id,
      url: this.mediaUrl(item.media),
    }));
    if (fromJoin.length > 0) return fromJoin;
    if (row.imageMediaId && row.imageMedia) {
      return [
        {
          id: row.imageMediaId,
          url: this.mediaUrl(row.imageMedia),
        },
      ];
    }
    return [];
  }

  private async replaceGallery(productId: string, mediaIds: string[]) {
    const unique = [...new Set(mediaIds.filter(Boolean))];
    await this.prisma.productGalleryItem.deleteMany({ where: { productId } });
    if (unique.length === 0) {
      await this.prisma.product.update({
        where: { id: productId },
        data: { imageMediaId: null },
      });
      return;
    }
    await this.prisma.productGalleryItem.createMany({
      data: unique.map((mediaId, sortOrder) => ({
        productId,
        mediaId,
        sortOrder,
      })),
    });
    await this.prisma.product.update({
      where: { id: productId },
      data: { imageMediaId: unique[0] },
    });
  }

  private resolveEtaFields(dto: {
    estimatedArrivalMinDays?: number | null;
    estimatedArrivalMaxDays?: number | null;
    estimatedArrivalDayType?: ArrivalDayType | null;
    estimatedArrivalBg?: string;
    estimatedArrivalEn?: string | null;
  }) {
    const hasStructured =
      dto.estimatedArrivalMinDays !== undefined ||
      dto.estimatedArrivalMaxDays !== undefined ||
      dto.estimatedArrivalDayType !== undefined;

    if (hasStructured) {
      return buildEstimatedArrivalFields({
        minDays: dto.estimatedArrivalMinDays,
        maxDays: dto.estimatedArrivalMaxDays,
        dayType: dto.estimatedArrivalDayType,
      });
    }

    return {
      estimatedArrivalMinDays: null,
      estimatedArrivalMaxDays: null,
      estimatedArrivalDayType: null,
      estimatedArrivalBg: dto.estimatedArrivalBg?.trim() ?? '',
      estimatedArrivalEn: dto.estimatedArrivalEn?.trim() || null,
    };
  }

  private resolveEtaUpdate(dto: UpdateProductDto) {
    const hasStructured =
      dto.estimatedArrivalMinDays !== undefined ||
      dto.estimatedArrivalMaxDays !== undefined ||
      dto.estimatedArrivalDayType !== undefined;

    if (hasStructured) {
      return buildEstimatedArrivalFields({
        minDays: dto.estimatedArrivalMinDays,
        maxDays: dto.estimatedArrivalMaxDays,
        dayType: dto.estimatedArrivalDayType,
      });
    }

    return {
      ...(dto.estimatedArrivalBg != null
        ? { estimatedArrivalBg: dto.estimatedArrivalBg.trim() }
        : {}),
      ...(dto.estimatedArrivalEn !== undefined
        ? { estimatedArrivalEn: dto.estimatedArrivalEn?.trim() || null }
        : {}),
    };
  }

  /** Soft in-memory rate limit (per process). */
  assertRateLimit(key: string, limit = 20, windowMs = 60_000) {
    const now = Date.now();
    const bucket = this.rateBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }
    bucket.count += 1;
    if (bucket.count > limit) {
      throw new BadRequestException('Too many requests. Try again shortly.');
    }
  }

  private toPublicProduct(row: {
    id: string;
    slug: string;
    titleBg: string;
    titleEn: string | null;
    descriptionBg: string;
    descriptionEn: string | null;
    priceCents: number;
    currency: string;
    stock: number;
    active: boolean;
    allowCod: boolean;
    estimatedArrivalMinDays?: number | null;
    estimatedArrivalMaxDays?: number | null;
    estimatedArrivalDayType?: ArrivalDayType | null;
    estimatedArrivalBg: string;
    estimatedArrivalEn: string | null;
    imageMediaId?: string | null;
    imageMedia: { id?: string; key: string; url: string } | null;
    galleryItems?: Array<{
      sortOrder: number;
      media: { id: string; key: string; url: string };
    }>;
  }) {
    return {
      id: row.id,
      slug: row.slug,
      title: row.titleEn ?? row.titleBg,
      titleBg: row.titleBg,
      titleEn: row.titleEn,
      description: row.descriptionEn ?? row.descriptionBg,
      descriptionBg: row.descriptionBg,
      descriptionEn: row.descriptionEn,
      priceCents: row.priceCents,
      currency: this.normalizeCurrency(row.currency),
      stock: row.stock,
      inStock: row.stock > 0,
      allowCod: row.allowCod,
      estimatedArrivalMinDays: row.estimatedArrivalMinDays ?? null,
      estimatedArrivalMaxDays: row.estimatedArrivalMaxDays ?? null,
      estimatedArrivalDayType: row.estimatedArrivalDayType ?? null,
      estimatedArrival: row.estimatedArrivalEn ?? row.estimatedArrivalBg,
      estimatedArrivalBg: row.estimatedArrivalBg,
      estimatedArrivalEn: row.estimatedArrivalEn,
      image: this.mediaUrl(row.imageMedia),
      gallery: this.galleryFromProduct(row),
      active: row.active,
    };
  }

  private toCmsProduct(row: {
    id: string;
    slug: string;
    titleBg: string;
    titleEn: string | null;
    descriptionBg: string;
    descriptionEn: string | null;
    priceCents: number;
    currency: string;
    stock: number;
    active: boolean;
    allowCod: boolean;
    estimatedArrivalMinDays?: number | null;
    estimatedArrivalMaxDays?: number | null;
    estimatedArrivalDayType?: ArrivalDayType | null;
    estimatedArrivalBg: string;
    estimatedArrivalEn: string | null;
    imageMediaId: string | null;
    imageMedia: { id?: string; key: string; url: string } | null;
    galleryItems?: Array<{
      sortOrder: number;
      media: { id: string; key: string; url: string };
    }>;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const gallery = this.galleryFromProduct(row);
    return {
      ...this.toPublicProduct(row),
      imageMediaId: row.imageMediaId,
      galleryMediaIds: gallery.map((item) => item.id),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async listPublicProducts() {
    this.assertEnabled();
    const rows = await this.prisma.product.findMany({
      where: { active: true },
      include: this.productInclude,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toPublicProduct(row));
  }

  async getPublicProduct(slug: string) {
    this.assertEnabled();
    const row = await this.prisma.product.findFirst({
      where: { slug, active: true },
      include: this.productInclude,
    });
    if (!row) throw new NotFoundException('Product not found');
    return this.toPublicProduct(row);
  }

  async listCmsProducts() {
    const rows = await this.prisma.product.findMany({
      include: this.productInclude,
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((row) => this.toCmsProduct(row));
  }

  async getCmsProduct(id: string) {
    const row = await this.prisma.product.findUnique({
      where: { id },
      include: this.productInclude,
    });
    if (!row) throw new NotFoundException('Product not found');
    return this.toCmsProduct(row);
  }

  async createProduct(dto: CreateProductDto) {
    if (dto.priceCents < 100) {
      throw new BadRequestException('priceCents must be at least 100');
    }
    const slug = await ensureUniqueSlug(
      dto.slug?.trim() || dto.titleBg,
      async (candidate) =>
        Boolean(
          await this.prisma.product.findUnique({
            where: { slug: candidate },
            select: { id: true },
          }),
        ),
    );
    const galleryIds =
      dto.galleryMediaIds?.filter(Boolean) ??
      (dto.imageMediaId ? [dto.imageMediaId] : []);
    const eta = this.resolveEtaFields(dto);
    const row = await this.prisma.product.create({
      data: {
        slug,
        titleBg: dto.titleBg.trim(),
        titleEn: dto.titleEn?.trim() || null,
        descriptionBg: dto.descriptionBg?.trim() ?? '',
        descriptionEn: dto.descriptionEn?.trim() || null,
        priceCents: dto.priceCents,
        currency: this.normalizeCurrency(dto.currency ?? this.currency()),
        stock: dto.stock,
        active: dto.active ?? true,
        allowCod: dto.allowCod ?? false,
        ...eta,
        imageMediaId: galleryIds[0] || null,
      },
      include: this.productInclude,
    });
    if (galleryIds.length > 0) {
      await this.replaceGallery(row.id, galleryIds);
      return this.getCmsProduct(row.id);
    }
    return this.toCmsProduct(row);
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');
    if (dto.priceCents != null && dto.priceCents < 100) {
      throw new BadRequestException('priceCents must be at least 100');
    }
    await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.titleBg != null ? { titleBg: dto.titleBg.trim() } : {}),
        ...(dto.titleEn !== undefined
          ? { titleEn: dto.titleEn?.trim() || null }
          : {}),
        ...(dto.descriptionBg != null
          ? { descriptionBg: dto.descriptionBg.trim() }
          : {}),
        ...(dto.descriptionEn !== undefined
          ? { descriptionEn: dto.descriptionEn?.trim() || null }
          : {}),
        ...(dto.priceCents != null ? { priceCents: dto.priceCents } : {}),
        ...(dto.currency != null
          ? { currency: this.normalizeCurrency(dto.currency) }
          : {}),
        ...(dto.stock != null ? { stock: dto.stock } : {}),
        ...(dto.active != null ? { active: dto.active } : {}),
        ...(dto.allowCod != null ? { allowCod: dto.allowCod } : {}),
        ...this.resolveEtaUpdate(dto),
        ...(dto.imageMediaId !== undefined && dto.galleryMediaIds === undefined
          ? { imageMediaId: dto.imageMediaId || null }
          : {}),
      },
    });
    if (dto.galleryMediaIds !== undefined) {
      await this.replaceGallery(id, dto.galleryMediaIds);
    } else if (dto.imageMediaId !== undefined) {
      await this.replaceGallery(id, dto.imageMediaId ? [dto.imageMediaId] : []);
    }
    return this.getCmsProduct(id);
  }

  async createCheckout(dto: CreateShopCheckoutDto, clientKey?: string) {
    this.assertEnabled();
    this.assertRateLimit(`checkout:${clientKey || 'anon'}`, 15, 60_000);
    const stripe = this.requireStripe();

    const merged = new Map<string, number>();
    for (const item of dto.items) {
      const qty = Math.floor(Number(item.qty));
      if (!item.productId || !Number.isFinite(qty) || qty < 1) {
        throw new BadRequestException('Invalid cart item');
      }
      merged.set(item.productId, (merged.get(item.productId) ?? 0) + qty);
    }
    if (merged.size === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const productIds = [...merged.keys()];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, active: true },
    });
    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products are unavailable');
    }

    const currency = this.currency();
    let totalCents = 0;
    const lineRows: Array<{
      productId: string;
      titleSnapshot: string;
      unitPriceCents: number;
      qty: number;
      lineTotalCents: number;
    }> = [];

    for (const product of products) {
      if (this.normalizeCurrency(product.currency) !== currency) {
        throw new BadRequestException(
          `Product currency mismatch for ${product.slug}`,
        );
      }
      const qty = merged.get(product.id)!;
      if (product.stock < qty) {
        throw new BadRequestException(
          `Insufficient stock for ${product.titleBg}`,
        );
      }
      const lineTotalCents = product.priceCents * qty;
      totalCents += lineTotalCents;
      lineRows.push({
        productId: product.id,
        titleSnapshot: product.titleEn ?? product.titleBg,
        unitPriceCents: product.priceCents,
        qty,
        lineTotalCents,
      });
    }

    if (totalCents < 100) {
      throw new BadRequestException('Order total too low');
    }

    let publicId = generateOrderPublicId();
    for (let i = 0; i < 8; i += 1) {
      const taken = await this.prisma.shopOrder.findUnique({
        where: { publicId },
        select: { id: true },
      });
      if (!taken) break;
      publicId = generateOrderPublicId();
    }

    const order = await this.prisma.shopOrder.create({
      data: {
        publicId,
        status: ShopOrderStatus.PENDING,
        paymentMethod: ShopPaymentMethod.STRIPE,
        totalCents,
        currency,
        items: {
          create: lineRows.map((row) => ({
            productId: row.productId,
            titleSnapshot: row.titleSnapshot,
            unitPriceCents: row.unitPriceCents,
            qty: row.qty,
            lineTotalCents: row.lineTotalCents,
          })),
        },
      },
      include: { items: true },
    });

    const base = this.siteUrl();
    const successPath = dto.successPath?.startsWith('/')
      ? dto.successPath
      : '/shop/success';
    const cancelPath = dto.cancelPath?.startsWith('/')
      ? dto.cancelPath
      : '/shop/cart';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      shipping_address_collection: {
        allowed_countries: [
          'BG',
          'RO',
          'GR',
          'DE',
          'AT',
          'IT',
          'FR',
          'GB',
          'US',
        ],
      },
      phone_number_collection: { enabled: true },
      line_items: lineRows.map((row) => ({
        quantity: row.qty,
        price_data: {
          currency,
          unit_amount: row.unitPriceCents,
          product_data: {
            name: row.titleSnapshot.slice(0, 120),
          },
        },
      })),
      success_url: absoluteSiteUrl(base, successPath, {
        order: 'success',
        id: publicId,
      }),
      cancel_url: absoluteSiteUrl(base, cancelPath, {
        order: 'cancelled',
      }),
      metadata: {
        kind: 'shop',
        orderId: order.id,
        publicId: order.publicId,
      },
    });

    await this.prisma.shopOrder.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });

    if (!session.url) {
      throw new ServiceUnavailableException(
        'Stripe Checkout Session did not return a URL',
      );
    }

    return { url: session.url, publicId: order.publicId };
  }

  async createCodOrder(dto: CreateCodOrderDto, clientKey?: string) {
    this.assertEnabled();
    this.assertRateLimit(`cod:${clientKey || 'anon'}`, 10, 60_000);

    const email = normalizeEmail(dto.email);
    if (!email) throw new BadRequestException('email is required');

    const merged = new Map<string, number>();
    for (const item of dto.items) {
      const qty = Math.floor(Number(item.qty));
      if (!item.productId || !Number.isFinite(qty) || qty < 1) {
        throw new BadRequestException('Invalid cart item');
      }
      merged.set(item.productId, (merged.get(item.productId) ?? 0) + qty);
    }
    if (merged.size === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const productIds = [...merged.keys()];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, active: true },
    });
    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products are unavailable');
    }
    if (products.some((p) => !p.allowCod)) {
      throw new BadRequestException(
        'Pay on delivery is not available for one or more products in the cart',
      );
    }

    const currency = this.currency();
    let totalCents = 0;
    const lineRows: Array<{
      productId: string;
      titleSnapshot: string;
      unitPriceCents: number;
      qty: number;
      lineTotalCents: number;
    }> = [];
    const etaParts: string[] = [];

    for (const product of products) {
      if (this.normalizeCurrency(product.currency) !== currency) {
        throw new BadRequestException(
          `Product currency mismatch for ${product.slug}`,
        );
      }
      const qty = merged.get(product.id)!;
      if (product.stock < qty) {
        throw new BadRequestException(
          `Insufficient stock for ${product.titleBg}`,
        );
      }
      const lineTotalCents = product.priceCents * qty;
      totalCents += lineTotalCents;
      lineRows.push({
        productId: product.id,
        titleSnapshot: product.titleEn ?? product.titleBg,
        unitPriceCents: product.priceCents,
        qty,
        lineTotalCents,
      });
      const eta =
        product.estimatedArrivalEn?.trim() ||
        product.estimatedArrivalBg?.trim() ||
        '';
      if (eta && !etaParts.includes(eta)) etaParts.push(eta);
    }

    if (totalCents < 100) {
      throw new BadRequestException('Order total too low');
    }

    let publicId = generateOrderPublicId();
    for (let i = 0; i < 8; i += 1) {
      const taken = await this.prisma.shopOrder.findUnique({
        where: { publicId },
        select: { id: true },
      });
      if (!taken) break;
      publicId = generateOrderPublicId();
    }

    const estimatedArrival = etaParts.join(' · ') || null;
    const country = (dto.country?.trim() || 'BG').toUpperCase().slice(0, 2);

    const order = await this.prisma.$transaction(async (tx) => {
      for (const row of lineRows) {
        const updated = await tx.product.updateMany({
          where: {
            id: row.productId,
            stock: { gte: row.qty },
          },
          data: { stock: { decrement: row.qty } },
        });
        if (updated.count !== 1) {
          throw new BadRequestException(
            `Insufficient stock while placing order for ${row.titleSnapshot}`,
          );
        }
      }

      return tx.shopOrder.create({
        data: {
          publicId,
          email,
          status: ShopOrderStatus.PAID,
          paymentMethod: ShopPaymentMethod.COD,
          totalCents,
          currency,
          estimatedArrival,
          shippingName: dto.name.trim(),
          shippingLine1: dto.line1.trim(),
          shippingLine2: dto.line2?.trim() || null,
          shippingCity: dto.city.trim(),
          shippingPostal: dto.postal.trim(),
          shippingCountry: country,
          shippingPhone: dto.phone?.trim() || null,
          paidAt: new Date(),
          items: {
            create: lineRows.map((row) => ({
              productId: row.productId,
              titleSnapshot: row.titleSnapshot,
              unitPriceCents: row.unitPriceCents,
              qty: row.qty,
              lineTotalCents: row.lineTotalCents,
            })),
          },
        },
      });
    });

    await this.sendPaidEmail(
      order.publicId,
      email,
      order.totalCents,
      order.currency,
      {
        paymentMethod: 'COD',
        estimatedArrival,
      },
    );

    return {
      publicId: order.publicId,
      status: order.status,
      estimatedArrival,
    };
  }

  async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const orderId = session.metadata?.orderId;
    const kind = session.metadata?.kind;
    if (kind && kind !== 'shop' && !orderId) return;

    const order = orderId
      ? await this.prisma.shopOrder.findUnique({
          where: { id: orderId },
          include: { items: true },
        })
      : session.id
        ? await this.prisma.shopOrder.findUnique({
            where: { stripeSessionId: session.id },
            include: { items: true },
          })
        : null;

    if (!order) {
      if (kind === 'shop') {
        this.logger.warn(
          `Shop webhook: order not found for session ${session.id}`,
        );
      }
      return;
    }

    if (order.status !== ShopOrderStatus.PENDING) {
      return; // idempotent
    }

    const currency = (session.currency || order.currency).toLowerCase();
    const amountTotal = session.amount_total;
    if (
      amountTotal == null ||
      amountTotal !== order.totalCents ||
      currency !== order.currency.toLowerCase()
    ) {
      this.logger.error(
        `Shop amount mismatch order=${order.id} expected=${order.totalCents} ${order.currency} got=${amountTotal} ${currency}`,
      );
      await this.prisma.shopOrder.update({
        where: { id: order.id },
        data: { status: ShopOrderStatus.FAILED },
      });
      return;
    }

    const email = normalizeEmail(
      session.customer_details?.email ||
        session.customer_email ||
        order.email ||
        '',
    );
    if (!email) {
      this.logger.error(`Shop order ${order.id} completed without email`);
    }

    const shipping =
      (
        session as Stripe.Checkout.Session & {
          shipping_details?: {
            name?: string | null;
            address?: {
              line1?: string | null;
              line2?: string | null;
              city?: string | null;
              postal_code?: string | null;
              country?: string | null;
            } | null;
          } | null;
        }
      ).shipping_details ?? null;
    const address = shipping?.address;
    const paymentIntent =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id || null;

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          if (!item.productId) continue;
          const updated = await tx.product.updateMany({
            where: {
              id: item.productId,
              stock: { gte: item.qty },
            },
            data: { stock: { decrement: item.qty } },
          });
          if (updated.count !== 1) {
            throw new BadRequestException(
              `Insufficient stock while fulfilling ${item.titleSnapshot}`,
            );
          }
        }

        const result = await tx.shopOrder.updateMany({
          where: { id: order.id, status: ShopOrderStatus.PENDING },
          data: {
            status: ShopOrderStatus.PAID,
            email,
            shippingName: shipping?.name || null,
            shippingLine1: address?.line1 || null,
            shippingLine2: address?.line2 || null,
            shippingCity: address?.city || null,
            shippingPostal: address?.postal_code || null,
            shippingCountry: address?.country || null,
            shippingPhone: session.customer_details?.phone || null,
            stripeSessionId: session.id,
            stripePaymentIntentId: paymentIntent,
            paidAt: new Date(),
          },
        });
        if (result.count !== 1) {
          throw new BadRequestException('Order already processed');
        }
      });
    } catch (error) {
      this.logger.error(
        `Failed to mark shop order paid: ${error instanceof Error ? error.message : String(error)}`,
      );
      await this.prisma.shopOrder.updateMany({
        where: { id: order.id, status: ShopOrderStatus.PENDING },
        data: { status: ShopOrderStatus.FAILED },
      });
      return;
    }

    if (email) {
      await this.sendPaidEmail(
        order.publicId,
        email,
        order.totalCents,
        order.currency,
      );
    }
  }

  private async sendPaidEmail(
    publicId: string,
    email: string,
    totalCents: number,
    currency: string,
    opts?: {
      paymentMethod?: 'STRIPE' | 'COD';
      estimatedArrival?: string | null;
    },
  ) {
    if (!this.mail.isConfigured()) {
      this.logger.warn(
        'Resend not configured — skipping order confirmation email',
      );
      return;
    }
    const trackUrl = `${this.siteUrl()}/shop/track?id=${encodeURIComponent(publicId)}`;
    const amount = (totalCents / 100).toFixed(2);
    const isCod = opts?.paymentMethod === 'COD';
    const etaLine = opts?.estimatedArrival
      ? `\nEstimated arrival: ${opts.estimatedArrival}`
      : '';
    const etaHtml = opts?.estimatedArrival
      ? `<p><strong>Estimated arrival:</strong> ${opts.estimatedArrival}</p>`
      : '';
    const payNote = isCod
      ? 'Payment: pay on delivery.'
      : 'Payment: card (Stripe).';
    try {
      await this.mail.send({
        to: email,
        subject: `Prizni order ${publicId}`,
        text: `Thank you for your order.\n\nOrder ID: ${publicId}\nTotal: ${amount} ${currency.toUpperCase()}\n${payNote}${etaLine}\n\nTrack your order:\n${trackUrl}\n\nKeep this Order ID and use the same email to track status.`,
        html: `<p>Thank you for your order.</p><p><strong>Order ID:</strong> ${publicId}</p><p><strong>Total:</strong> ${amount} ${currency.toUpperCase()}</p><p>${payNote}</p>${etaHtml}<p><a href="${trackUrl}">Track your order</a></p><p>Use this Order ID with the same email address to follow shipping status.</p>`,
      });
    } catch (error) {
      this.logger.error(
        `Order email failed for ${publicId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async sendShippedEmail(publicId: string, email: string) {
    if (!this.mail.isConfigured() || !email) return;
    const trackUrl = `${this.siteUrl()}/shop/track?id=${encodeURIComponent(publicId)}`;
    try {
      await this.mail.send({
        to: email,
        subject: `Prizni order ${publicId} shipped`,
        text: `Your order ${publicId} is on the way.\n\nTrack: ${trackUrl}\n\nWhen it arrives, mark it as delivered on the track page.`,
        html: `<p>Your order <strong>${publicId}</strong> is on the way.</p><p><a href="${trackUrl}">Track your order</a></p><p>When it arrives, you can mark it as delivered on the track page.</p>`,
      });
    } catch (error) {
      this.logger.error(
        `Shipped email failed for ${publicId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private assertOrderEmail(orderEmail: string, inputEmail: string) {
    const a = normalizeEmail(orderEmail);
    const b = normalizeEmail(inputEmail);
    if (!a || !safeEqualString(a, b)) {
      throw new NotFoundException('Order not found');
    }
  }

  async trackOrder(dto: TrackOrderDto, clientKey?: string) {
    this.assertEnabled();
    this.assertRateLimit(`track:${clientKey || 'anon'}`, 30, 60_000);
    const publicId = dto.publicId.trim().toUpperCase();
    const order = await this.prisma.shopOrder.findUnique({
      where: { publicId },
      include: { items: true },
    });
    if (!order || order.status === ShopOrderStatus.PENDING) {
      throw new NotFoundException('Order not found');
    }
    this.assertOrderEmail(order.email, dto.email);

    return {
      publicId: order.publicId,
      status: order.status,
      emailMasked: maskEmail(order.email),
      totalCents: order.totalCents,
      currency: order.currency,
      paidAt: order.paidAt?.toISOString() ?? null,
      shippedAt: order.shippedAt?.toISOString() ?? null,
      deliveredAt: order.deliveredAt?.toISOString() ?? null,
      paymentMethod: order.paymentMethod,
      estimatedArrival: order.estimatedArrival,
      items: order.items.map((item) => ({
        title: item.titleSnapshot,
        qty: item.qty,
        unitPriceCents: item.unitPriceCents,
        lineTotalCents: item.lineTotalCents,
      })),
      canMarkDelivered: order.status === ShopOrderStatus.SHIPPED,
    };
  }

  async markDelivered(dto: TrackOrderDto, clientKey?: string) {
    this.assertEnabled();
    this.assertRateLimit(`delivered:${clientKey || 'anon'}`, 20, 60_000);
    const publicId = dto.publicId.trim().toUpperCase();
    const order = await this.prisma.shopOrder.findUnique({
      where: { publicId },
    });
    if (!order) throw new NotFoundException('Order not found');
    this.assertOrderEmail(order.email, dto.email);
    if (order.status !== ShopOrderStatus.SHIPPED) {
      throw new BadRequestException('Order cannot be marked delivered yet');
    }
    const updated = await this.prisma.shopOrder.update({
      where: { id: order.id },
      data: {
        status: ShopOrderStatus.DELIVERED,
        deliveredAt: new Date(),
      },
      include: { items: true },
    });
    return this.trackOrder(
      { publicId: updated.publicId, email: dto.email },
      clientKey,
    );
  }

  async listCmsOrders(
    filters: {
      page?: number;
      pageSize?: number;
      status?: ShopOrderStatus;
    } = {},
  ) {
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
    const where: Prisma.ShopOrderWhereInput = {
      status: { not: ShopOrderStatus.PENDING },
    };
    if (filters.status) where.status = filters.status;

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.shopOrder.count({ where }),
      this.prisma.shopOrder.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map((row) => this.toCmsOrder(row)),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async getCmsOrder(id: string) {
    const row = await this.prisma.shopOrder.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!row) throw new NotFoundException('Order not found');
    return this.toCmsOrder(row);
  }

  private toCmsOrder(row: {
    id: string;
    publicId: string;
    email: string;
    status: ShopOrderStatus;
    paymentMethod: ShopPaymentMethod;
    totalCents: number;
    currency: string;
    estimatedArrival: string | null;
    shippingName: string | null;
    shippingLine1: string | null;
    shippingLine2: string | null;
    shippingCity: string | null;
    shippingPostal: string | null;
    shippingCountry: string | null;
    shippingPhone: string | null;
    stripeSessionId: string | null;
    stripePaymentIntentId: string | null;
    paidAt: Date | null;
    shippedAt: Date | null;
    deliveredAt: Date | null;
    createdAt: Date;
    items: Array<{
      id: string;
      titleSnapshot: string;
      unitPriceCents: number;
      qty: number;
      lineTotalCents: number;
      productId: string | null;
    }>;
  }) {
    return {
      id: row.id,
      publicId: row.publicId,
      email: row.email,
      status: row.status,
      paymentMethod: row.paymentMethod,
      totalCents: row.totalCents,
      currency: this.normalizeCurrency(row.currency),
      estimatedArrival: row.estimatedArrival,
      shipping: {
        name: row.shippingName,
        line1: row.shippingLine1,
        line2: row.shippingLine2,
        city: row.shippingCity,
        postal: row.shippingPostal,
        country: row.shippingCountry,
        phone: row.shippingPhone,
      },
      stripeSessionId: row.stripeSessionId,
      stripePaymentIntentId: row.stripePaymentIntentId,
      paidAt: row.paidAt?.toISOString() ?? null,
      shippedAt: row.shippedAt?.toISOString() ?? null,
      deliveredAt: row.deliveredAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      items: row.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        title: item.titleSnapshot,
        qty: item.qty,
        unitPriceCents: item.unitPriceCents,
        lineTotalCents: item.lineTotalCents,
      })),
    };
  }

  async markShipped(id: string) {
    const order = await this.prisma.shopOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== ShopOrderStatus.PAID) {
      throw new BadRequestException('Only paid orders can be marked shipped');
    }
    const updated = await this.prisma.shopOrder.update({
      where: { id },
      data: {
        status: ShopOrderStatus.SHIPPED,
        shippedAt: new Date(),
      },
      include: { items: true },
    });
    await this.sendShippedEmail(updated.publicId, updated.email);
    return this.toCmsOrder(updated);
  }
}
