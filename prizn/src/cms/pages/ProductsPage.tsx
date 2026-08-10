import { type FormEvent, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  LayoutGrid,
  X,
} from 'lucide-react'
import {
  CmsCard,
  CmsPageHeader,
  GhostButton,
  PrimaryButton,
  StatusPill,
} from '@/cms/components/CmsUI'
import {
  CmsCheckbox,
  CmsField,
  CmsInput,
  CmsTextarea,
} from '@/cms/components/CmsFields'
import { JournalSelect } from '@/components/ui/JournalSelect'
import {
  createCmsShopProduct,
  listCmsShopProducts,
  updateCmsShopProduct,
  type ShopProduct,
} from '@/lib/shop-api'
import { uploadCmsMedia } from '@/lib/articles-api'
import { ApiError } from '@/lib/api'
import { randomId } from '@/lib/utils'

type GalleryItem = {
  id: string
  url: string
  file?: File
}

function revokeIfBlob(url?: string | null) {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
}

function preloadImageUrl(url: string) {
  return new Promise<void>((resolve) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = url
  })
}

export default function CmsProductsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [titleBg, setTitleBg] = useState('')
  const [priceBgn, setPriceBgn] = useState('25')
  const [stock, setStock] = useState('10')
  const [descriptionBg, setDescriptionBg] = useState('')
  const [allowCod, setAllowCod] = useState(false)
  const [etaFrom, setEtaFrom] = useState('3')
  const [etaTo, setEtaTo] = useState('5')
  const [etaDayType, setEtaDayType] = useState<'BUSINESS' | 'CALENDAR'>(
    'BUSINESS',
  )
  const [gallery, setGallery] = useState<GalleryItem[]>([])
  const [activeSlide, setActiveSlide] = useState(0)
  const [galleryView, setGalleryView] = useState<'slider' | 'grid'>('slider')
  const [mediaPreparing, setMediaPreparing] = useState(false)

  const productsQuery = useQuery({
    queryKey: ['cms-shop-products'],
    queryFn: listCmsShopProducts,
  })

  useEffect(() => {
    if (gallery.length === 0) {
      setActiveSlide(0)
      return
    }
    setActiveSlide((prev) => Math.min(prev, gallery.length - 1))
  }, [gallery.length])

  const resetForm = () => {
    for (const item of gallery) revokeIfBlob(item.url)
    setEditingId(null)
    setTitleBg('')
    setDescriptionBg('')
    setPriceBgn('25')
    setStock('10')
    setAllowCod(false)
    setEtaFrom('3')
    setEtaTo('5')
    setEtaDayType('BUSINESS')
    setGallery([])
    setActiveSlide(0)
    setGalleryView('slider')
  }

  const loadProduct = (product: ShopProduct) => {
    for (const item of gallery) revokeIfBlob(item.url)
    setEditingId(product.id)
    setTitleBg(product.titleBg)
    setDescriptionBg(product.descriptionBg || '')
    setPriceBgn((product.priceCents / 100).toFixed(2))
    setStock(String(product.stock))
    setAllowCod(Boolean(product.allowCod))
    setEtaFrom(
      product.estimatedArrivalMinDays != null
        ? String(product.estimatedArrivalMinDays)
        : '3',
    )
    setEtaTo(
      product.estimatedArrivalMaxDays != null
        ? String(product.estimatedArrivalMaxDays)
        : '5',
    )
    setEtaDayType(
      product.estimatedArrivalDayType === 'CALENDAR' ? 'CALENDAR' : 'BUSINESS',
    )
    const items =
      product.gallery?.length
        ? product.gallery.map((g) => ({ id: g.id, url: g.url }))
        : product.imageMediaId && product.image
          ? [{ id: product.imageMediaId, url: product.image }]
          : []
    setGallery(items)
    setActiveSlide(0)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const pickImages = async (files: FileList | null) => {
    if (!files?.length) return
    setMediaPreparing(true)
    try {
      const list = Array.from(files)
      const items: GalleryItem[] = list.map((file) => ({
        id: `local-${randomId()}`,
        url: URL.createObjectURL(file),
        file,
      }))
      await Promise.all(items.map((item) => preloadImageUrl(item.url)))
      const startIndex = gallery.length
      setGallery((prev) => [...prev, ...items])
      setActiveSlide(startIndex)
    } finally {
      setMediaPreparing(false)
    }
  }

  const removeImage = (mediaId: string) => {
    setGallery((prev) => {
      const next = prev.filter((item) => item.id !== mediaId)
      const removed = prev.find((item) => item.id === mediaId)
      revokeIfBlob(removed?.url)
      return next
    })
  }

  const setAsHero = (mediaId: string) => {
    setGallery((prev) => {
      const index = prev.findIndex((item) => item.id === mediaId)
      if (index <= 0) return prev
      const copy = [...prev]
      const [item] = copy.splice(index, 1)
      copy.unshift(item!)
      return copy
    })
    setActiveSlide(0)
  }

  const goPrev = () =>
    setActiveSlide((prev) => (prev <= 0 ? gallery.length - 1 : prev - 1))
  const goNext = () =>
    setActiveSlide((prev) => (prev >= gallery.length - 1 ? 0 : prev + 1))

  const saveMutation = useMutation({
    mutationFn: async () => {
      const galleryMediaIds: string[] = []
      for (const item of gallery) {
        if (item.file) {
          const media = await uploadCmsMedia(item.file, {
            folder: 'shop',
            titleBg: titleBg.trim() || item.file.name,
          })
          galleryMediaIds.push(media.id)
        } else {
          galleryMediaIds.push(item.id)
        }
      }
      const fromDays = Math.max(1, Math.floor(Number(etaFrom) || 0))
      const toDays = Math.max(1, Math.floor(Number(etaTo) || 0))
      const body = {
        titleBg: titleBg.trim(),
        descriptionBg: descriptionBg.trim(),
        priceCents: Math.round(Number(priceBgn) * 100),
        stock: Math.max(0, Math.floor(Number(stock) || 0)),
        active: true,
        allowCod,
        estimatedArrivalMinDays: allowCod ? Math.min(fromDays, toDays) : null,
        estimatedArrivalMaxDays: allowCod ? Math.max(fromDays, toDays) : null,
        estimatedArrivalDayType: allowCod ? etaDayType : null,
        galleryMediaIds,
        imageMediaId: galleryMediaIds[0] || null,
      }
      if (editingId) {
        return updateCmsShopProduct(editingId, body)
      }
      return createCmsShopProduct(body)
    },
    onSuccess: async () => {
      resetForm()
      await queryClient.invalidateQueries({ queryKey: ['cms-shop-products'] })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      updateCmsShopProduct(id, { active }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cms-shop-products'] })
    },
  })

  const stockMutation = useMutation({
    mutationFn: ({ id, stock: next }: { id: string; stock: number }) =>
      updateCmsShopProduct(id, { stock: next }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cms-shop-products'] })
    },
  })

  const codMutation = useMutation({
    mutationFn: ({ id, allowCod: next }: { id: string; allowCod: boolean }) =>
      updateCmsShopProduct(id, { allowCod: next }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cms-shop-products'] })
    },
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  const items = productsQuery.data ?? []
  const mediaBusy = mediaPreparing || saveMutation.isPending

  return (
    <div>
      <CmsPageHeader
        title={t('cms.shop.productsTitle')}
        description={t('cms.shop.productsDesc')}
        badge={t('cms.shop.productsBadge', { count: items.length })}
      />

      <CmsCard className="mb-6 space-y-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-xl text-stone-900">
            {editingId ? t('cms.shop.editProduct') : t('cms.shop.newProduct')}
          </h2>
          {editingId ? (
            <GhostButton type="button" onClick={resetForm}>
              {t('cms.shop.cancelEdit')}
            </GhostButton>
          ) : null}
        </div>

        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
          <CmsField label={t('cms.shop.title')}>
            <CmsInput
              required
              value={titleBg}
              onChange={(e) => setTitleBg(e.target.value)}
            />
          </CmsField>
          <CmsField label={t('cms.shop.priceBgn')}>
            <CmsInput
              required
              type="number"
              min={1}
              step="0.01"
              value={priceBgn}
              onChange={(e) => setPriceBgn(e.target.value)}
            />
          </CmsField>
          <CmsField label={t('cms.shop.stock')}>
            <CmsInput
              required
              type="number"
              min={0}
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </CmsField>
          <CmsField
            label={t('cms.shop.description')}
            className="md:col-span-2"
          >
            <CmsTextarea
              value={descriptionBg}
              onChange={(e) => setDescriptionBg(e.target.value)}
              rows={3}
            />
          </CmsField>

          <div className="md:col-span-2 space-y-4 rounded-2xl border border-[#E8E4DC] bg-[#FAF8F3]/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-heading text-lg font-semibold text-stone-800">
                {t('cms.shop.gallery')}
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                {gallery.length > 0 ? (
                  <GhostButton
                    type="button"
                    onClick={() =>
                      setGalleryView((v) =>
                        v === 'slider' ? 'grid' : 'slider',
                      )
                    }
                  >
                    <LayoutGrid className="size-3.5" />
                    {galleryView === 'slider'
                      ? t('cms.editor.showAll')
                      : t('cms.editor.showSlider')}
                  </GhostButton>
                ) : null}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#E8E4DC] bg-white px-4 py-2.5 text-xs font-semibold text-[#0C2686] shadow-2xs">
                  <ImagePlus className="size-4" />
                  {mediaBusy
                    ? t('cms.editor.preparingMedia')
                    : t('cms.editor.addImages')}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={mediaBusy}
                    onChange={async (e) => {
                      await pickImages(e.target.files)
                      e.target.value = ''
                    }}
                  />
                </label>
              </div>
            </div>

            {gallery.length === 0 ? (
              <label className="relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#E8E4DC] bg-white px-6 py-14 text-center transition-colors hover:border-[#0C2686]/40">
                <ImagePlus className="size-8 text-[#0C2686]" />
                <span className="text-sm font-medium text-stone-600">
                  {mediaBusy
                    ? t('cms.editor.preparingMedia')
                    : t('cms.editor.addImages')}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={mediaBusy}
                  onChange={async (e) => {
                    await pickImages(e.target.files)
                    e.target.value = ''
                  }}
                />
              </label>
            ) : galleryView === 'slider' ? (
              <div className="relative max-w-full space-y-3 overflow-x-hidden">
                <div className="relative h-[min(14rem,32vh)] w-full overflow-hidden rounded-2xl border border-[#E8E4DC] bg-stone-100">
                  <img
                    src={gallery[activeSlide]?.url}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  {activeSlide === 0 ? (
                    <span className="absolute left-3 top-3 rounded-md bg-[#0C2686] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                      {t('cms.editor.heroLabel')}
                    </span>
                  ) : null}
                  <div className="absolute right-3 top-3 flex gap-2">
                    {activeSlide !== 0 ? (
                      <button
                        type="button"
                        onClick={() => setAsHero(gallery[activeSlide]!.id)}
                        className="rounded-lg bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold text-[#0C2686] shadow-sm"
                      >
                        {t('cms.editor.setAsHero')}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => removeImage(gallery[activeSlide]!.id)}
                      className="rounded-lg bg-white/95 p-1.5 text-stone-600 shadow-sm"
                      title={t('cms.editor.removeImage')}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  {gallery.length > 1 ? (
                    <>
                      <button
                        type="button"
                        onClick={goPrev}
                        className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#E8E4DC] bg-white/95 text-stone-700 shadow-md"
                        aria-label={t('cms.stories.prev')}
                      >
                        <ChevronLeft className="size-5" />
                      </button>
                      <button
                        type="button"
                        onClick={goNext}
                        className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#E8E4DC] bg-white/95 text-stone-700 shadow-md"
                        aria-label={t('cms.stories.next')}
                      >
                        <ChevronRight className="size-5" />
                      </button>
                    </>
                  ) : null}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[11px] font-semibold text-white">
                    {t('cms.editor.imageOf', {
                      current: activeSlide + 1,
                      total: gallery.length,
                    })}
                  </div>
                </div>
                {gallery.length > 1 ? (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {gallery.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveSlide(index)}
                        className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${
                          index === activeSlide
                            ? 'border-[#0C2686]'
                            : 'border-transparent'
                        }`}
                      >
                        <img
                          src={item.url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {gallery.map((item, index) => (
                  <div
                    key={item.id}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-[#E8E4DC] bg-stone-100"
                  >
                    <img
                      src={item.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    {index === 0 ? (
                      <span className="absolute left-2 top-2 rounded bg-[#0C2686] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
                        {t('cms.editor.heroLabel')}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAsHero(item.id)}
                        className="absolute left-2 top-2 hidden rounded bg-white/95 px-1.5 py-0.5 text-[9px] font-semibold text-[#0C2686] group-hover:block"
                      >
                        {t('cms.editor.setAsHero')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(item.id)}
                      className="absolute right-2 top-2 rounded-lg bg-white/95 p-1 text-stone-600 shadow-sm"
                      title={t('cms.editor.removeImage')}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <CmsCheckbox
            className="md:col-span-2"
            checked={allowCod}
            onChange={() => setAllowCod((v) => !v)}
            label={t('cms.shop.allowCod')}
          />
          {allowCod ? (
            <div className="md:col-span-2 space-y-2">
              <p className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-stone-500">
                {t('cms.shop.estimatedArrival')}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <CmsInput
                  type="number"
                  min={1}
                  max={365}
                  required={allowCod}
                  value={etaFrom}
                  onChange={(e) => setEtaFrom(e.target.value)}
                  aria-label={t('cms.shop.etaFrom')}
                  className="w-20"
                />
                <span className="font-sans text-sm font-medium text-stone-600">
                  {t('cms.shop.etaTo')}
                </span>
                <CmsInput
                  type="number"
                  min={1}
                  max={365}
                  required={allowCod}
                  value={etaTo}
                  onChange={(e) => setEtaTo(e.target.value)}
                  aria-label={t('cms.shop.etaTo')}
                  className="w-20"
                />
                <div className="min-w-[12rem] flex-1">
                  <JournalSelect
                    name="etaDayType"
                    variant="boxed"
                    label={t('cms.shop.etaDayType')}
                    placeholder={t('cms.shop.etaDayType')}
                    value={etaDayType}
                    onChange={(value) =>
                      setEtaDayType(
                        value === 'CALENDAR' ? 'CALENDAR' : 'BUSINESS',
                      )
                    }
                    options={[
                      {
                        value: 'BUSINESS',
                        label: t('cms.shop.etaBusinessDays'),
                      },
                      {
                        value: 'CALENDAR',
                        label: t('cms.shop.etaCalendarDays'),
                      },
                    ]}
                  />
                </div>
              </div>
              <p className="text-xs text-stone-500">
                {t('cms.shop.etaPreview', {
                  range: `${Math.min(
                    Math.max(1, Math.floor(Number(etaFrom) || 1)),
                    Math.max(1, Math.floor(Number(etaTo) || 1)),
                  )}-${Math.max(
                    Math.max(1, Math.floor(Number(etaFrom) || 1)),
                    Math.max(1, Math.floor(Number(etaTo) || 1)),
                  )}`,
                  type:
                    etaDayType === 'BUSINESS'
                      ? t('cms.shop.etaBusinessDays')
                      : t('cms.shop.etaCalendarDays'),
                })}
              </p>
            </div>
          ) : null}

          <div className="md:col-span-2">
            <PrimaryButton
              type="submit"
              disabled={mediaBusy || !titleBg.trim()}
            >
              {saveMutation.isPending
                ? t('cms.shop.saving')
                : editingId
                  ? t('cms.shop.saveProduct')
                  : t('cms.shop.create')}
            </PrimaryButton>
            {saveMutation.isError ? (
              <p className="mt-2 text-sm text-rose-700">
                {(saveMutation.error as ApiError).message}
              </p>
            ) : null}
          </div>
        </form>
      </CmsCard>

      <CmsCard className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#E8E4DC] bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
            <tr>
              <th className="px-4 py-3">{t('cms.shop.title')}</th>
              <th className="px-4 py-3">{t('cms.shop.price')}</th>
              <th className="px-4 py-3">{t('cms.shop.stock')}</th>
              <th className="px-4 py-3">{t('cms.shop.cod')}</th>
              <th className="px-4 py-3">{t('cms.shop.active')}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {productsQuery.isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-stone-500">
                  {t('cms.shop.loading')}
                </td>
              </tr>
            ) : null}
            {items.map((product) => (
              <tr key={product.id} className="border-b border-[#E8E4DC]/70">
                <td className="px-4 py-3 font-medium">{product.titleBg}</td>
                <td className="px-4 py-3">
                  {(product.priceCents / 100).toFixed(2)} BGN
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    defaultValue={product.stock}
                    onBlur={(e) => {
                      const next = Math.max(
                        0,
                        Math.floor(Number(e.target.value) || 0),
                      )
                      if (next !== product.stock) {
                        stockMutation.mutate({ id: product.id, stock: next })
                      }
                    }}
                    className="w-20 rounded-lg border border-[#E8E4DC] px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={Boolean(product.allowCod)}
                    onChange={(e) =>
                      codMutation.mutate({
                        id: product.id,
                        allowCod: e.target.checked,
                      })
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={product.active ? 'ACTIVE' : 'ARCHIVED'} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      className="text-xs font-semibold text-[#0C2686]"
                      onClick={() => loadProduct(product)}
                    >
                      {t('cms.shop.edit')}
                    </button>
                    <button
                      type="button"
                      className="text-xs font-semibold text-[#0C2686]"
                      onClick={() =>
                        toggleMutation.mutate({
                          id: product.id,
                          active: !product.active,
                        })
                      }
                    >
                      {product.active
                        ? t('cms.shop.deactivate')
                        : t('cms.shop.activate')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CmsCard>
    </div>
  )
}
