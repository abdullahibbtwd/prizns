import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Edit, MapPin, Plus, Trash2, UserRound } from 'lucide-react'
import {
  CmsCard,
  CmsPageHeader,
  PrimaryButton,
  StatusPill,
} from '@/cms/components/CmsUI'
import { useCmsConfirm } from '@/cms/components/CmsConfirmDialog'
import { deleteCmsAuthor, listCmsAuthors } from '@/lib/cms-content-api'
import { useJournalLang } from '@/hooks/useJournalLang'
import { pickLang } from '@/lib/pick-lang'
import { cn } from '@/lib/utils'

export default function CmsAuthorsPage() {
  const { t } = useTranslation()
  const { lang } = useJournalLang()
  const queryClient = useQueryClient()
  const { confirm, dialog } = useCmsConfirm()
  const authorsQuery = useQuery({
    queryKey: ['cms-authors-desk'],
    queryFn: () => listCmsAuthors(true),
  })
  const authors = authorsQuery.data ?? []

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCmsAuthor(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cms-authors-desk'] })
      await queryClient.invalidateQueries({ queryKey: ['cms-authors'] })
      await queryClient.invalidateQueries({ queryKey: ['cms-authors-count'] })
    },
  })

  const confirmDelete = async (author: (typeof authors)[number]) => {
    const name = pickLang(lang, author.nameEn, author.nameBg) || author.nameBg
    const ok = await confirm({
      title: t('cms.authors.delete'),
      description: t('cms.authors.deleteConfirm', { name }),
    })
    if (!ok) return
    deleteMutation.mutate(author.id)
  }

  return (
    <div>
      <CmsPageHeader
        title={t('cms.authors.title')}
        description={t('cms.authors.description')}
        badge={t('cms.authors.items', { count: authors.length })}
        actions={
          <Link to="/cms/authors/new">
            <PrimaryButton>
              <Plus className="size-4" />
              {t('cms.authors.newAuthor')}
            </PrimaryButton>
          </Link>
        }
      />

      {authorsQuery.isLoading && (
        <p className="text-sm text-stone-500">{t('cms.authors.loading')}</p>
      )}
      {authorsQuery.isError && (
        <p className="text-sm text-rose-700">{t('cms.authors.loadFailed')}</p>
      )}

      {!authorsQuery.isLoading && authors.length === 0 && (
        <CmsCard className="p-8 text-center text-sm text-stone-500">
          {t('cms.authors.empty')}{' '}
          <Link to="/cms/authors/new" className="font-semibold text-[#0C2686]">
            {t('cms.authors.createFirst')}
          </Link>
        </CmsCard>
      )}

      {authors.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {authors.map((author) => (
            <CmsCard
              key={author.id}
              className="group flex flex-col overflow-hidden"
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-stone-100">
                {author.imageUrl ? (
                  <img
                    src={author.imageUrl}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-stone-300">
                    <UserRound className="size-16" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <span className="rounded-full bg-amber-500/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-950">
                    {pickLang(lang, author.roleEn, author.roleBg)}
                  </span>
                  <h2 className="mt-1.5 font-heading text-xl font-bold">
                    {pickLang(lang, author.nameEn, author.nameBg)}
                  </h2>
                </div>
              </div>

              <div className="flex flex-1 flex-col justify-between space-y-3 p-5 text-xs">
                <div className="space-y-3">
                  {(author.locationBg || author.locationEn) && (
                    <div className="flex items-center gap-1.5 font-medium text-stone-600">
                      <MapPin className="size-3.5 text-[#0C2686]" />
                      <span>
                        {pickLang(lang, author.locationEn, author.locationBg)}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <StatusPill
                      status={author.isActive ? 'ACTIVE' : 'ARCHIVED'}
                    />
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 font-semibold',
                        author.showOnAuthors
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-stone-100 text-stone-500',
                      )}
                    >
                      {author.showOnAuthors
                        ? t('cms.authors.listed')
                        : t('cms.authors.hidden')}
                    </span>
                    {author.translationStatus && (
                      <StatusPill status={author.translationStatus} />
                    )}
                    <span className="rounded-full bg-stone-100 px-2.5 py-0.5 font-semibold text-stone-600">
                      {t('cms.authors.storyCount', {
                        count: author._count?.articles ?? 0,
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Link
                    to={`/cms/authors/${author.id}`}
                    className="inline-flex items-center gap-1 font-semibold text-[#0C2686]"
                  >
                    <Edit className="size-3.5" /> {t('cms.authors.edit')}
                  </Link>
                  <button
                    type="button"
                    onClick={() => void confirmDelete(author)}
                    disabled={deleteMutation.isPending}
                    className="inline-flex items-center gap-1 font-semibold text-rose-700 disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" />
                    {deleteMutation.isPending
                      ? t('cms.authors.deleting')
                      : t('cms.authors.delete')}
                  </button>
                </div>
              </div>
            </CmsCard>
          ))}
        </div>
      )}
      {dialog}
    </div>
  )
}
