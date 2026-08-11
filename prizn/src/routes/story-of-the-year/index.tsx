import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Award, Vote } from 'lucide-react'
import { JournalShell } from '@/components/concept-3/JournalShell'
import { PageMeta } from '@/components/PageMeta'
import { useReaderAuth } from '@/lib/reader-auth'
import {
  getStoryOfTheYear,
  voteStoryOfTheYear,
} from '@/lib/community-api'

function pick(lang: 'bg' | 'en', en: string | null | undefined, bg: string) {
  return lang === 'bg' ? bg : en || bg
}

export default function StoryOfTheYearPage() {
  const { t } = useTranslation()
  const { reader, openSignIn } = useReaderAuth()
  const queryClient = useQueryClient()

  const campaignQuery = useQuery({
    queryKey: ['story-of-the-year', reader?.id],
    queryFn: getStoryOfTheYear,
  })

  const voteMutation = useMutation({
    mutationFn: (articleId: string) => voteStoryOfTheYear(articleId),
    onSuccess: (data) => {
      queryClient.setQueryData(['story-of-the-year', reader?.id], data)
    },
  })

  const campaign = campaignQuery.data

  return (
    <JournalShell navVariant="solid">
      {({ lang }) => (
        <>
          <PageMeta
            lang={lang}
            title={
              campaign
                ? pick(lang, campaign.titleEn, campaign.titleBg)
                : t('storyYearTitle')
            }
            description={
              campaign
                ? pick(lang, campaign.descriptionEn, campaign.descriptionBg)
                : t('storyYearEmpty')
            }
            path="/story-of-the-year"
          />
          <div className="mx-auto max-w-5xl px-6 py-16 md:px-12 md:py-24">
            <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-[#0C2686]/70">
              {t('storyYearEyebrow')}
            </p>
            <h1 className="mt-2 font-heading text-4xl text-[#0C2686] md:text-5xl">
              {campaign
                ? pick(lang, campaign.titleEn, campaign.titleBg)
                : t('storyYearTitle')}
            </h1>
            <p className="mt-4 max-w-2xl font-sans text-sm leading-relaxed text-[#1A1A1A]/70">
              {campaign
                ? pick(lang, campaign.descriptionEn, campaign.descriptionBg) ||
                  t('storyYearLead')
                : t('storyYearEmpty')}
            </p>

            {campaign && (
              <p className="mt-4 font-sans text-xs uppercase tracking-widest text-[#1A1A1A]/50">
                {campaign.votingOpen
                  ? t('storyYearOpen', { count: campaign.totalVotes })
                  : t('storyYearClosed', { count: campaign.totalVotes })}
              </p>
            )}

            {campaignQuery.isLoading && (
              <p className="mt-10 font-sans text-sm text-[#1A1A1A]/60">
                {t('readerLoading')}
              </p>
            )}

            {campaign && (
              <div className="mt-12 space-y-4">
                {campaign.nominations.map((n) => {
                  const voted = campaign.myVoteArticleId === n.articleId
                  return (
                    <div
                      key={n.id}
                      className="flex flex-col gap-4 rounded-2xl border border-[#EAE6DF] bg-white/50 p-4 sm:flex-row sm:items-center"
                    >
                      {n.heroUrl ? (
                        <img
                          src={n.heroUrl}
                          alt=""
                          loading="lazy"
                          className="h-28 w-full rounded-xl object-cover sm:h-24 sm:w-32"
                        />
                      ) : (
                        <div className="flex h-28 w-full items-center justify-center rounded-xl bg-[#0C2686]/5 sm:h-24 sm:w-32">
                          <Award className="size-6 text-[#0C2686]/40" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <Link
                          to={n.path}
                          className="font-heading text-xl text-[#1A1A1A] hover:text-[#0C2686]"
                        >
                          {pick(lang, n.titleEn, n.titleBg)}
                        </Link>
                        <p className="mt-1 font-sans text-xs text-[#1A1A1A]/50">
                          {[
                            pick(lang, n.authorNameEn, n.authorNameBg || ''),
                            pick(lang, n.locationEn, n.locationBg),
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                        <p className="mt-2 font-sans text-xs uppercase tracking-widest text-[#0C2686]/70">
                          {t('storyYearVotes', { count: n.voteCount })}
                        </p>
                      </div>
                      {campaign.votingOpen && (
                        <button
                          type="button"
                          disabled={voteMutation.isPending}
                          onClick={() => {
                            if (!reader) {
                              openSignIn({
                                returnUrl: '/story-of-the-year',
                              })
                              return
                            }
                            voteMutation.mutate(n.articleId)
                          }}
                          className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2.5 font-sans text-[11px] uppercase tracking-widest transition ${
                            voted
                              ? 'bg-[#0C2686] text-white'
                              : 'border border-[#0C2686]/30 text-[#0C2686] hover:bg-[#0C2686] hover:text-white'
                          }`}
                        >
                          <Vote className="size-3.5" />
                          {voted ? t('storyYearVoted') : t('storyYearVote')}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {voteMutation.isError && (
              <p className="mt-6 font-sans text-sm text-rose-700">
                {(voteMutation.error as Error).message}
              </p>
            )}
          </div>
        </>
      )}
    </JournalShell>
  )
}
