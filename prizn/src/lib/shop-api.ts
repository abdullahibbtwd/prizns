import { api } from '@/lib/api'

export type ShopArrivalDayType = 'BUSINESS' | 'CALENDAR'

export type ShopGalleryItem = {
  id: string
  url: string
}

export type ShopProduct = {
  id: string
  slug: string
  title: string
  titleBg: string
  titleEn: string | null
  description: string
  descriptionBg: string
  descriptionEn: string | null
  priceCents: number
  currency: string
  stock: number
  inStock: boolean
  allowCod?: boolean
  estimatedArrivalMinDays?: number | null
  estimatedArrivalMaxDays?: number | null
  estimatedArrivalDayType?: ShopArrivalDayType | null
  estimatedArrival?: string
  estimatedArrivalBg?: string
  estimatedArrivalEn?: string | null
  image: string
  gallery?: ShopGalleryItem[]
  active: boolean
  imageMediaId?: string | null
  galleryMediaIds?: string[]
  createdAt?: string
  updatedAt?: string
}

export type ShopOrderTrack = {
  publicId: string
  status: string
  emailMasked: string
  totalCents: number
  currency: string
  paymentMethod?: string
  estimatedArrival?: string | null
  paidAt: string | null
  shippedAt: string | null
  deliveredAt: string | null
  items: Array<{
    title: string
    qty: number
    unitPriceCents: number
    lineTotalCents: number
  }>
  canMarkDelivered: boolean
}

export type CmsShopOrder = {
  id: string
  publicId: string
  email: string
  status: string
  paymentMethod?: string
  totalCents: number
  currency: string
  estimatedArrival?: string | null
  shipping: {
    name: string | null
    line1: string | null
    line2: string | null
    city: string | null
    postal: string | null
    country: string | null
    phone: string | null
  }
  paidAt: string | null
  shippedAt: string | null
  deliveredAt: string | null
  createdAt: string
  items: Array<{
    id: string
    productId: string | null
    title: string
    qty: number
    unitPriceCents: number
    lineTotalCents: number
  }>
}

export function listPublicShopProducts() {
  return api.get<ShopProduct[]>('/shop/products')
}

export function getPublicShopProduct(slug: string) {
  return api.get<ShopProduct>(`/shop/products/${encodeURIComponent(slug)}`)
}

export function createShopCheckout(
  items: Array<{ productId: string; qty: number }>,
) {
  return api.post<{ url: string; publicId: string }>('/shop/checkout', {
    items,
    successPath: '/shop/success',
    cancelPath: '/shop/cart',
  })
}

export function createShopCodOrder(body: {
  items: Array<{ productId: string; qty: number }>
  email: string
  name: string
  line1: string
  line2?: string
  city: string
  postal: string
  country?: string
  phone?: string
}) {
  return api.post<{
    publicId: string
    status: string
    estimatedArrival: string | null
  }>('/shop/checkout/cod', body)
}

export function trackShopOrder(publicId: string, email: string) {
  return api.post<ShopOrderTrack>('/shop/orders/track', { publicId, email })
}

export function markShopOrderDelivered(publicId: string, email: string) {
  return api.post<ShopOrderTrack>('/shop/orders/delivered', {
    publicId,
    email,
  })
}

export function listCmsShopProducts() {
  return api.get<ShopProduct[]>('/cms/shop/products')
}

export function createCmsShopProduct(body: {
  titleBg: string
  titleEn?: string
  descriptionBg?: string
  descriptionEn?: string
  priceCents: number
  stock: number
  active?: boolean
  allowCod?: boolean
  estimatedArrivalMinDays?: number | null
  estimatedArrivalMaxDays?: number | null
  estimatedArrivalDayType?: ShopArrivalDayType | null
  estimatedArrivalBg?: string
  estimatedArrivalEn?: string
  imageMediaId?: string | null
  galleryMediaIds?: string[]
  slug?: string
}) {
  return api.post<ShopProduct>('/cms/shop/products', body)
}

export function updateCmsShopProduct(
  id: string,
  body: Partial<{
    titleBg: string
    titleEn: string | null
    descriptionBg: string
    descriptionEn: string | null
    priceCents: number
    stock: number
    active: boolean
    allowCod: boolean
    estimatedArrivalMinDays: number | null
    estimatedArrivalMaxDays: number | null
    estimatedArrivalDayType: ShopArrivalDayType | null
    estimatedArrivalBg: string
    estimatedArrivalEn: string | null
    imageMediaId: string | null
    galleryMediaIds: string[]
  }>,
) {
  return api.patch<ShopProduct>(`/cms/shop/products/${id}`, body)
}

export function listCmsShopOrders(params?: {
  page?: number
  pageSize?: number
  status?: string
}) {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.pageSize) search.set('pageSize', String(params.pageSize))
  if (params?.status) search.set('status', params.status)
  const qs = search.toString()
  return api.get<{
    items: CmsShopOrder[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }>(`/cms/shop/orders${qs ? `?${qs}` : ''}`)
}

export function getCmsShopOrder(id: string) {
  return api.get<CmsShopOrder>(`/cms/shop/orders/${id}`)
}

export function shipCmsShopOrder(id: string) {
  return api.patch<CmsShopOrder>(`/cms/shop/orders/${id}/ship`)
}
