import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Award } from 'lucide-react'
import {
  CmsCard,
  CmsPageHeader,
} from '@/cms/components/CmsUI'
import { JournalSelect } from '@/components/ui/JournalSelect'
import {
  evaluateAuthorBadges,
  listCmsBadges,
  awardCmsBadge,
} from '@/lib/community-api'
import { listCmsAuthors } from '@/lib/cms-content-api'
import { pickLang } from '@/lib/pick-lang'

export default function CmsBadgesPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'bg'
  const queryClient = useQueryClient()
  const [authorId, setAuthorId] = useState('')
  const [badgeId, setBadgeId] = useState('')

  const badgesQuery = useQuery({
    queryKey: ['cms-badges'],
    queryFn: listCmsBadges,
  })
  const authorsQuery = useQuery({
    queryKey: ['cms-authors-all'],
    queryFn: () => listCmsAuthors(true),
  })

  const awardMutation = useMutation({
    mutationFn: () => awardCmsBadge(authorId, badgeId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cms-badges'] })
      setAuthorId('')
      setBadgeId('')
    },
  })

  const evaluateMutation = useMutation({
    mutationFn: (id: string) => evaluateAuthorBadges(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cms-badges'] })
    },
  })

  const badges = badgesQuery.data ?? []
  const authors = authorsQuery.data ?? []

  return (
    <div>
      <CmsPageHeader
        title={t('cms.badges.title')}
        description={t('cms.badges.description')}
        badge={t('cms.badges.badge')}
      />

      <CmsCard className="mb-6 p-5">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-stone-700">
          {t('cms.badges.manualAward')}
        </h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <JournalSelect
            name="badge-author"
            variant="boxed"
            label={t('cms.badges.authorPlaceholder')}
            placeholder={t('cms.badges.authorPlaceholder')}
            value={authorId}
            onChange={setAuthorId}
            options={[
              { value: '', label: t('cms.badges.authorPlaceholder') },
              ...authors.map(
                (a: { id: string; nameEn?: string | null; nameBg: string }) => ({
                  value: a.id,
                  label: pickLang(lang, a.nameEn, a.nameBg),
                }),
              ),
            ]}
            className="min-w-[10rem] flex-1"
          />
          <JournalSelect
            name="badge-pick"
            variant="boxed"
            label={t('cms.badges.badgePlaceholder')}
            placeholder={t('cms.badges.badgePlaceholder')}
            value={badgeId}
            onChange={setBadgeId}
            options={[
              { value: '', label: t('cms.badges.badgePlaceholder') },
              ...badges.map((b) => ({
                value: b.id,
                label: pickLang(lang, b.nameEn, b.nameBg),
              })),
            ]}
            className="min-w-[10rem] flex-1"
          />
          <button
            type="button"
            disabled={!authorId || !badgeId || awardMutation.isPending}
            onClick={() => awardMutation.mutate()}
            className="rounded-xl bg-[#0C2686] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white disabled:opacity-50"
          >
            {t('cms.badges.award')}
          </button>
          <button
            type="button"
            disabled={!authorId || evaluateMutation.isPending}
            onClick={() => evaluateMutation.mutate(authorId)}
            className="rounded-xl border border-[#E8E4DC] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-stone-700"
          >
            {t('cms.badges.reevaluate')}
          </button>
        </div>
        {(awardMutation.isError || evaluateMutation.isError) && (
          <p className="mt-3 text-sm text-rose-700">
            {(awardMutation.error as Error)?.message ||
              (evaluateMutation.error as Error)?.message}
          </p>
        )}
      </CmsCard>

      <div className="grid gap-4">
        {badges.map((badge) => (
          <CmsCard key={badge.id} className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#0C2686]/10">
                <Award className="size-5 text-[#0C2686]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-heading text-lg text-stone-900">
                  {pickLang(lang, badge.nameEn, badge.nameBg)}
                </h3>
                <p className="mt-1 text-sm text-stone-600">
                  {pickLang(lang, badge.descriptionEn, badge.descriptionBg)}
                </p>
                <p className="mt-2 text-xs uppercase tracking-wider text-stone-500">
                  {badge.minPublished != null
                    ? t('cms.badges.autoAt', { count: badge.minPublished })
                    : t('cms.badges.manualOnly')}{' '}
                  · {t('cms.badges.holders', { count: badge._count.authors })}
                </p>
                {badge.authors.length > 0 && (
                  <p className="mt-2 text-sm text-stone-700">
                    {badge.authors
                      .map((a) =>
                        pickLang(lang, a.author.nameEn, a.author.nameBg),
                      )
                      .join(', ')}
                  </p>
                )}
              </div>
            </div>
          </CmsCard>
        ))}
      </div>
    </div>
  )
}
