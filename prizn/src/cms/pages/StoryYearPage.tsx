import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ExternalLink, Trophy } from 'lucide-react'
import { pickLang } from '@/lib/pick-lang'
import { useJournalLang } from '@/hooks/useJournalLang'
import {
  CmsCard,
  CmsPageHeader,
  GhostButton,
  PrimaryButton,
  StatusPill,
} from '@/cms/components/CmsUI'
import { CmsField, CmsInput } from '@/cms/components/CmsFields'
import { JournalSelect } from '@/components/ui/JournalSelect'
import { Alert } from '@/components/ui/Alert'
import { listCmsArticles } from '@/lib/articles-api'
import {
  createCmsStoryYear,
  getCmsStoryYear,
  listCmsStoryYear,
  setCmsStoryYearNominations,
  updateCmsStoryYear,
  type CmsStoryYearDetail,
} from '@/lib/community-api'
import { ApiError } from '@/lib/api'

type ToastState = {
  open: boolean
  variant: 'success' | 'error'
  message: string
}

export default function CmsStoryYearPage() {
  const { t } = useTranslation()
  const { lang } = useJournalLang()
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [year, setYear] = useState(new Date().getFullYear())
  const [titleBg, setTitleBg] = useState('История на годината')
  const [picked, setPicked] = useState<string[]>([])
  const [toast, setToast] = useState<ToastState>({
    open: false,
    variant: 'success',
    message: '',
  })

  const listQuery = useQuery({
    queryKey: ['cms-story-year'],
    queryFn: listCmsStoryYear,
  })

  const detailQuery = useQuery({
    queryKey: ['cms-story-year', selectedId],
    queryFn: () => getCmsStoryYear(selectedId!),
    enabled: Boolean(selectedId),
  })

  const articlesQuery = useQuery({
    queryKey: ['cms-articles-for-soty'],
    queryFn: () => listCmsArticles({ status: 'PUBLISHED', pageSize: 100 }),
    enabled: Boolean(selectedId),
  })

  const detail = detailQuery.data as CmsStoryYearDetail | undefined
  const campaigns = listQuery.data ?? []
  const articles = articlesQuery.data?.items ?? []

  useEffect(() => {
    if (!detailQuery.data) return
    setPicked(detailQuery.data.nominations.map((n) => n.articleId))
  }, [selectedId, detailQuery.dataUpdatedAt, detailQuery.data])

  const statusOptions = useMemo(
    () => [
      { value: 'DRAFT', label: t('cms.storyYear.statusDraft') },
      { value: 'OPEN', label: t('cms.storyYear.statusOpen') },
      { value: 'CLOSED', label: t('cms.storyYear.statusClosed') },
    ],
    [t],
  )

  const showToast = (variant: 'success' | 'error', message: string) => {
    setToast({ open: true, variant, message })
  }

  const createMutation = useMutation({
    mutationFn: () =>
      createCmsStoryYear({
        year,
        titleBg: titleBg.trim() || t('cms.storyYear.title'),
        titleEn: `Story of the Year ${year}`,
        status: 'DRAFT',
      }),
    onSuccess: (row) => {
      void queryClient.invalidateQueries({ queryKey: ['cms-story-year'] })
      setSelectedId(row.id)
      showToast('success', t('cms.storyYear.created'))
    },
    onError: (err: Error) => {
      showToast(
        'error',
        err instanceof ApiError
          ? err.message
          : t('cms.storyYear.createFailed'),
      )
    },
  })

  const statusMutation = useMutation({
    mutationFn: (status: 'DRAFT' | 'OPEN' | 'CLOSED') =>
      updateCmsStoryYear(selectedId!, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cms-story-year'] })
      void queryClient.invalidateQueries({
        queryKey: ['cms-story-year', selectedId],
      })
      showToast('success', t('cms.storyYear.statusUpdated'))
    },
    onError: (err: Error) => {
      showToast(
        'error',
        err instanceof ApiError
          ? err.message
          : t('cms.storyYear.statusFailed'),
      )
    },
  })

  const nominationsMutation = useMutation({
    mutationFn: () => setCmsStoryYearNominations(selectedId!, picked),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['cms-story-year', selectedId],
      })
      void queryClient.invalidateQueries({ queryKey: ['cms-story-year'] })
      showToast('success', t('cms.storyYear.nominationsSaved'))
    },
    onError: (err: Error) => {
      showToast(
        'error',
        err instanceof ApiError
          ? err.message
          : t('cms.storyYear.nominationsFailed'),
      )
    },
  })

  return (
    <div>
      <CmsPageHeader
        title={t('cms.storyYear.title')}
        description={t('cms.storyYear.description')}
        badge={t('cms.storyYear.badge', { count: campaigns.length })}
      />

      <Alert
        open={toast.open}
        variant={toast.variant}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

      {!selectedId ? (
        <>
          <CmsCard className="mb-6 space-y-4 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-800">
              <Trophy className="size-4 text-[#0C2686]" />
              {t('cms.storyYear.createTitle')}
            </h2>
            <div className="grid gap-4 sm:grid-cols-[120px_1fr_auto]">
              <CmsField label={t('cms.storyYear.year')}>
                <CmsInput
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  min={2020}
                  max={2100}
                />
              </CmsField>
              <CmsField label={t('cms.storyYear.titleBg')}>
                <CmsInput
                  value={titleBg}
                  onChange={(e) => setTitleBg(e.target.value)}
                />
              </CmsField>
              <div className="flex items-end">
                <PrimaryButton
                  disabled={createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                >
                  {createMutation.isPending
                    ? t('cms.storyYear.creating')
                    : t('cms.storyYear.create')}
                </PrimaryButton>
              </div>
            </div>
          </CmsCard>

          <CmsCard hover={false} className="overflow-hidden p-0">
            <div className="border-b border-[#E8E4DC] bg-[#FAF8F3] px-5 py-3.5">
              <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-stone-700">
                {t('cms.storyYear.tableTitle')}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-[#E8E4DC] bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                  <tr>
                    <th className="px-4 py-3">{t('cms.storyYear.colYear')}</th>
                    <th className="px-4 py-3">{t('cms.storyYear.colTitle')}</th>
                    <th className="px-4 py-3">{t('cms.storyYear.colStatus')}</th>
                    <th className="px-4 py-3">
                      {t('cms.storyYear.colNominations')}
                    </th>
                    <th className="px-4 py-3">{t('cms.storyYear.colVotes')}</th>
                    <th className="px-4 py-3">{t('cms.storyYear.colAction')}</th>
                  </tr>
                </thead>
                <tbody>
                  {listQuery.isLoading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-stone-500">
                        {t('cms.storyYear.loading')}
                      </td>
                    </tr>
                  )}
                  {!listQuery.isLoading && campaigns.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-stone-500">
                        {t('cms.storyYear.empty')}
                      </td>
                    </tr>
                  )}
                  {campaigns.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-[#E8E4DC]/70 hover:bg-[#0C2686]/[0.02]"
                    >
                      <td className="px-4 py-3 font-semibold text-stone-900">
                        {c.year}
                      </td>
                      <td className="px-4 py-3 text-stone-800">
                        {pickLang(lang, c.titleEn, c.titleBg)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={c.status} />
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {c._count.nominations}
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {c._count.votes}
                      </td>
                      <td className="px-4 py-3">
                        <GhostButton onClick={() => setSelectedId(c.id)}>
                          {t('cms.storyYear.open')}
                        </GhostButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CmsCard>
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <GhostButton
              onClick={() => {
                setSelectedId(null)
                setPicked([])
              }}
            >
              <ArrowLeft className="size-4" />
              {t('cms.storyYear.backToList')}
            </GhostButton>
            <Link
              to="/story-of-the-year"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8E4DC] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wider text-stone-600 transition hover:border-[#0C2686]/30 hover:text-[#0C2686]"
            >
              <ExternalLink className="size-3.5" />
              {t('cms.storyYear.publicPage')}
            </Link>
          </div>

          {detailQuery.isLoading && (
            <CmsCard className="p-6 text-sm text-stone-500">
              {t('cms.storyYear.loading')}
            </CmsCard>
          )}

          {detail && (
            <>
              <CmsCard className="space-y-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-xl text-stone-900">
                      {t('cms.storyYear.detailTitle', { year: detail.year })}
                    </h2>
                    <p className="mt-1 text-sm text-stone-600">
                      {pickLang(lang, detail.titleEn, detail.titleBg)}
                    </p>
                  </div>
                  <StatusPill status={detail.status} />
                </div>

                <CmsField label={t('cms.storyYear.votingStatus')}>
                  <JournalSelect
                    name="story-year-status"
                    variant="boxed"
                    value={detail.status}
                    options={statusOptions}
                    onChange={(value) => {
                      if (
                        value === 'DRAFT' ||
                        value === 'OPEN' ||
                        value === 'CLOSED'
                      ) {
                        statusMutation.mutate(value)
                      }
                    }}
                  />
                </CmsField>
                <p className="text-xs leading-relaxed text-stone-500">
                  {t('cms.storyYear.statusHint')}
                </p>
              </CmsCard>

              <CmsCard hover={false} className="overflow-hidden p-0">
                <div className="border-b border-[#E8E4DC] bg-[#FAF8F3] px-5 py-3.5">
                  <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-stone-700">
                    {t('cms.storyYear.nominationsTitle')}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead className="border-b border-[#E8E4DC] bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                      <tr>
                        <th className="px-4 py-3">
                          {t('cms.storyYear.colStory')}
                        </th>
                        <th className="px-4 py-3">
                          {t('cms.storyYear.colVotesShort')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.nominations.length === 0 && (
                        <tr>
                          <td
                            colSpan={2}
                            className="px-4 py-8 text-stone-500"
                          >
                            {t('cms.storyYear.nominationsEmpty')}
                          </td>
                        </tr>
                      )}
                      {detail.nominations.map((n) => (
                        <tr
                          key={n.id}
                          className="border-b border-[#E8E4DC]/70"
                        >
                          <td className="px-4 py-3">
                            <Link
                              to={n.article.path}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-[#0C2686] hover:underline"
                            >
                              {pickLang(
                                lang,
                                n.article.titleEn,
                                n.article.titleBg,
                              )}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-stone-700">
                            {n._count.votes}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CmsCard>

              <CmsCard className="space-y-4 p-5">
                <div>
                  <h3 className="text-sm font-semibold text-stone-800">
                    {t('cms.storyYear.pickNominations')}
                  </h3>
                  <p className="mt-1 text-xs text-stone-500">
                    {t('cms.storyYear.pickHint')}
                  </p>
                </div>

                {articles.length === 0 ? (
                  <p className="text-sm text-stone-500">
                    {t('cms.storyYear.noPublished')}
                  </p>
                ) : (
                  <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-[#E8E4DC] p-2">
                    {articles.map((a) => {
                      const checked = picked.includes(a.id)
                      return (
                        <label
                          key={a.id}
                          className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-stone-50"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setPicked((prev) =>
                                checked
                                  ? prev.filter((id) => id !== a.id)
                                  : [...prev, a.id],
                              )
                            }
                          />
                          <span className="truncate">
                            {pickLang(lang, a.title, a.titleBg)}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}

                <PrimaryButton
                  disabled={nominationsMutation.isPending}
                  onClick={() => nominationsMutation.mutate()}
                >
                  {nominationsMutation.isPending
                    ? t('cms.storyYear.savingNominations')
                    : t('cms.storyYear.saveNominations', {
                        count: picked.length,
                      })}
                </PrimaryButton>
              </CmsCard>
            </>
          )}
        </div>
      )}
    </div>
  )
}
