import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import {
  CmsCard,
  CmsPageHeader,
  PrimaryButton,
  StatusPill,
} from '@/cms/components/CmsUI'
import {
  createCmsAuthor,
  getCmsAuthor,
  updateCmsAuthor,
} from '@/lib/cms-content-api'
import { uploadCmsMedia } from '@/lib/articles-api'
import type { AuthorFormValues } from '@/lib/cms-types'

const schema = z.object({
  nameBg: z.string().min(1),
  roleBg: z.string().min(1),
  locationBg: z.string(),
  quoteBg: z.string(),
  bioBg: z.string(),
  imageUrl: z.string(),
  aliases: z.string(),
  isActive: z.boolean(),
})

const emptyDefaults: AuthorFormValues = {
  nameBg: '',
  roleBg: 'Автор',
  locationBg: '',
  quoteBg: '',
  bioBg: '',
  imageUrl: '',
  aliases: '',
  isActive: true,
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1 text-xs font-medium text-stone-600">
      <span>{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'w-full rounded-lg border border-[#E8E4DC] bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-[#0C2686]'

export default function CmsAuthorEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const isNew = !id || id === 'new'
  const [uploading, setUploading] = useState(false)

  const authorQuery = useQuery({
    queryKey: ['cms-author', id],
    queryFn: () => getCmsAuthor(id!),
    enabled: !isNew,
    refetchInterval: (query) => {
      const status = query.state.data?.translationStatus
      return status === 'PENDING' || status === 'RUNNING' ? 3000 : false
    },
  })

  const defaults = useMemo<AuthorFormValues>(() => {
    const author = authorQuery.data
    if (!author) return emptyDefaults
    return {
      nameBg: author.nameBg,
      roleBg: author.roleBg,
      locationBg: author.locationBg ?? '',
      quoteBg: author.quoteBg ?? '',
      bioBg: author.bioBg ?? '',
      imageUrl: author.imageUrl ?? '',
      aliases: (author.aliases ?? []).join(', '),
      isActive: author.isActive,
    }
  }, [authorQuery.data])

  const form = useForm<AuthorFormValues>({
    resolver: zodResolver(schema),
    values: defaults,
    defaultValues: emptyDefaults,
  })

  const saveMutation = useMutation({
    mutationFn: async (values: AuthorFormValues) => {
      if (isNew) return createCmsAuthor(values)
      return updateCmsAuthor(id!, values)
    },
    onSuccess: async (author) => {
      await queryClient.invalidateQueries({ queryKey: ['cms-authors-desk'] })
      await queryClient.invalidateQueries({ queryKey: ['cms-authors'] })
      await queryClient.invalidateQueries({ queryKey: ['cms-authors-count'] })
      if (isNew) navigate(`/cms/authors/${author.id}`, { replace: true })
      else await queryClient.invalidateQueries({ queryKey: ['cms-author', id] })
    },
  })

  const uploadPortrait = async (files: FileList | null) => {
    if (!files?.[0]) return
    setUploading(true)
    try {
      const media = await uploadCmsMedia(files[0])
      form.setValue('imageUrl', media.url, { shouldDirty: true })
    } finally {
      setUploading(false)
    }
  }

  if (!isNew && authorQuery.isLoading) {
    return <p className="text-sm text-stone-500">{t('cms.authors.loading')}</p>
  }

  if (!isNew && authorQuery.isError) {
    return (
      <p className="text-sm text-rose-700">{t('cms.authors.loadFailed')}</p>
    )
  }

  const translationStatus = authorQuery.data?.translationStatus

  return (
    <div>
      <Link
        to="/cms/authors"
        className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-stone-600 transition-colors hover:text-[#0C2686]"
      >
        <ArrowLeft className="size-4" />
        {t('cms.authors.back')}
      </Link>

      <CmsPageHeader
        title={
          isNew
            ? t('cms.authors.newAuthor')
            : t('cms.authors.editing', {
                name: form.watch('nameBg') || t('cms.editor.untitled'),
              })
        }
        description={t('cms.authors.editorHint')}
        actions={
          <PrimaryButton
            type="button"
            disabled={saveMutation.isPending}
            onClick={form.handleSubmit((values) => saveMutation.mutate(values))}
          >
            {saveMutation.isPending
              ? t('cms.authors.saving')
              : t('cms.authors.save')}
          </PrimaryButton>
        }
      />

      <form
        className="grid gap-6 lg:grid-cols-[1fr_280px]"
        onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
      >
        <div className="space-y-6">
          <CmsCard className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('cms.authors.nameBg')}>
                <input className={inputClass} {...form.register('nameBg')} />
              </Field>
              <Field label={t('cms.authors.roleBg')}>
                <input className={inputClass} {...form.register('roleBg')} />
              </Field>
              <Field label={t('cms.authors.locationBg')}>
                <input
                  className={inputClass}
                  {...form.register('locationBg')}
                />
              </Field>
              <Field label={t('cms.authors.aliases')}>
                <input className={inputClass} {...form.register('aliases')} />
              </Field>
            </div>
          </CmsCard>

          <CmsCard className="space-y-4 p-5">
            <Field label={t('cms.authors.quoteBg')}>
              <textarea
                rows={2}
                className={inputClass}
                {...form.register('quoteBg')}
              />
            </Field>
            <Field label={t('cms.authors.bioBg')}>
              <textarea
                rows={5}
                className={inputClass}
                {...form.register('bioBg')}
              />
            </Field>
          </CmsCard>

          {saveMutation.isError && (
            <p className="text-sm text-rose-700">{t('cms.authors.saveFailed')}</p>
          )}
          {saveMutation.isSuccess && (
            <p className="text-sm text-emerald-700">
              {t('cms.authors.saved')}
              {translationStatus === 'PENDING' || translationStatus === 'RUNNING'
                ? t('cms.editor.translating')
                : translationStatus === 'READY'
                  ? t('cms.editor.translationReady')
                  : translationStatus === 'FAILED'
                    ? t('cms.editor.translationFailed')
                    : ''}
            </p>
          )}
        </div>

        <div className="space-y-6">
          <CmsCard className="space-y-4 p-5">
            <h3 className="text-sm font-semibold">{t('cms.authors.portrait')}</h3>
            <div className="aspect-[3/4] overflow-hidden rounded-xl bg-stone-100">
              {form.watch('imageUrl') ? (
                <img
                  src={form.watch('imageUrl')}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-[#E8E4DC] bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-white">
              {uploading ? t('cms.authors.uploading') : t('cms.authors.upload')}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void uploadPortrait(e.target.files)}
              />
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-stone-700">
              <input type="checkbox" {...form.register('isActive')} />
              {t('cms.authors.active')}
            </label>
            {translationStatus && (
              <div className="pt-2">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  {t('cms.stories.colTranslation')}
                </p>
                <StatusPill status={translationStatus} />
              </div>
            )}
          </CmsCard>
        </div>
      </form>
    </div>
  )
}
