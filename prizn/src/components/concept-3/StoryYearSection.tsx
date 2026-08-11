import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ArrowRight, Award, Vote } from 'lucide-react'
import {
  getStoryOfTheYear,
  voteStoryOfTheYear,
  type StoryYearNomination,
  type StoryYearPublic,
} from '@/lib/community-api'
import { pickLang } from '@/lib/pick-lang'
import { useReaderAuth } from '@/lib/reader-auth'
import { cn } from '@/lib/utils'

interface StoryYearSectionProps {
  lang: 'bg' | 'en'
}

/** Height share for top-3: highest votes tallest, same column width. */
function topHeightPct(rank: number, votes: number, maxVotes: number) {
  const voteFactor = 0.55 + (votes / Math.max(maxVotes, 1)) * 0.45
  const rankFactor = rank === 1 ? 1 : rank === 2 ? 0.82 : 0.68
  return Math.round(Math.min(100, Math.max(52, voteFactor * rankFactor * 100)))
}

function NomineePanel({
  nomination,
  lang,
  rank,
  size,
  voted,
  voting,
  onVote,
}: {
  nomination: StoryYearNomination
  lang: 'bg' | 'en'
  rank: number
  size: 'lead' | 'mid' | 'trail' | 'small'
  voted: boolean
  voting: boolean
  onVote: () => void
}) {
  const { t } = useTranslation()
  const title = pickLang(lang, nomination.titleEn, nomination.titleBg)
  const location = pickLang(lang, nomination.locationEn, nomination.locationBg)
  const author = pickLang(
    lang,
    nomination.authorNameEn,
    nomination.authorNameBg,
  )

  return (
    <div
      className={cn(
        'group relative h-full min-h-0 w-full overflow-hidden rounded-[14px] bg-[#1A1A1A]',
        size === 'small' && 'rounded-xl',
      )}
    >
      <Link to={nomination.path} className="absolute inset-0 block" tabIndex={-1}>
        {nomination.heroUrl ? (
          <img
            src={nomination.heroUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#0C2686]/20">
            <Award
              className={cn(
                'text-white/35',
                size === 'small' ? 'size-5' : 'size-8',
              )}
            />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
      </Link>

      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 z-10 text-white',
          size === 'small'
            ? 'p-2'
            : size === 'lead'
              ? 'p-3 sm:p-4 md:p-5'
              : 'p-2.5 sm:p-3 md:p-4',
        )}
      >
        {rank === 1 && size !== 'small' && (
          <span className="mb-1 hidden font-sans text-[9px] uppercase tracking-[0.28em] text-white/80 sm:inline-block md:text-[10px]">
            {t('storyYearLeading')}
          </span>
        )}
        <Link
          to={nomination.path}
          className="pointer-events-auto block hover:opacity-90"
        >
          <h3
            className={cn(
              'font-heading font-normal leading-snug',
              size === 'lead' && 'text-base sm:text-xl md:text-3xl lg:text-4xl',
              size === 'mid' && 'text-sm sm:text-lg md:text-2xl',
              size === 'trail' && 'text-sm sm:text-base md:text-xl',
              size === 'small' && 'line-clamp-2 text-sm',
            )}
          >
            {title}
          </h3>
        </Link>
        {size !== 'small' && (author || location) ? (
          <p className="mt-1 hidden line-clamp-1 font-sans text-[11px] text-white/65 sm:block md:text-xs">
            {[author, location].filter(Boolean).join(' · ')}
          </p>
        ) : null}
        <div
          className={cn(
            'mt-2 flex flex-wrap items-center gap-2',
            size === 'small' && 'mt-1.5 gap-1.5',
          )}
        >
          <p
            className={cn(
              'font-sans uppercase tracking-[0.16em] text-white/80',
              size === 'small'
                ? 'text-[9px]'
                : 'text-[9px] sm:text-[10px] md:text-[11px]',
            )}
          >
            {t('storyYearVotes', { count: nomination.voteCount })}
          </p>
          <button
            type="button"
            disabled={voting}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onVote()
            }}
            className={cn(
              'pointer-events-auto inline-flex cursor-pointer items-center gap-1.5 rounded-full font-sans font-semibold uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-60',
              size === 'small'
                ? 'px-2 py-1 text-[8px]'
                : 'px-3 py-1.5 text-[9px] sm:text-[10px]',
              voted
                ? 'bg-white text-[#0C2686]'
                : 'border border-white/50 bg-white/10 text-white hover:bg-white hover:text-[#0C2686]',
            )}
          >
            <Vote className={size === 'small' ? 'size-2.5' : 'size-3'} />
            {voted ? t('storyYearVoted') : t('storyYearVote')}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Landing section — only mounts when a campaign has voting open. */
export function StoryYearSection({ lang }: StoryYearSectionProps) {
  const { t } = useTranslation()
  const { reader, openSignIn } = useReaderAuth()
  const queryClient = useQueryClient()
  const queryKey = ['story-of-the-year', reader?.id ?? 'anon', 'home'] as const

  const { data: campaign } = useQuery({
    queryKey,
    queryFn: getStoryOfTheYear,
    staleTime: 60_000,
  })

  const voteMutation = useMutation({
    mutationFn: (articleId: string) => voteStoryOfTheYear(articleId),
    onSuccess: (data: StoryYearPublic) => {
      queryClient.setQueryData(queryKey, data)
      queryClient.setQueryData(['story-of-the-year', reader?.id], data)
    },
  })

  if (!campaign?.votingOpen || campaign.nominations.length === 0) {
    return null
  }

  const sorted = [...campaign.nominations].sort(
    (a, b) => b.voteCount - a.voteCount || a.titleBg.localeCompare(b.titleBg),
  )
  const maxVotes = Math.max(...sorted.map((n) => n.voteCount), 1)
  const top = sorted.slice(0, 3)
  const rest = sorted.slice(3)
  const topSize = (rank: number): 'lead' | 'mid' | 'trail' =>
    rank === 1 ? 'lead' : rank === 2 ? 'mid' : 'trail'

  const handleVote = (articleId: string) => {
    if (!reader) {
      openSignIn({ returnUrl: '/#story-of-the-year' })
      return
    }
    voteMutation.mutate(articleId)
  }

  return (
    <section
      id="story-of-the-year"
      className="flex h-dvh max-h-dvh flex-col overflow-hidden border-t border-[#EAE6DF] bg-[#FDFBF7] px-4 py-4 sm:px-6 sm:py-5 md:px-10 md:py-6"
    >
      <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col">
        <div className="mb-3 flex shrink-0 flex-col gap-2 sm:mb-4 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <span className="mb-0.5 block font-sans text-[10px] font-medium uppercase tracking-[0.3em] text-[#0C2686]">
              {t('storyYearEyebrow')} · {campaign.year}
            </span>
            <h2 className="font-heading text-2xl font-light text-[#1A1A1A] sm:text-3xl md:text-4xl">
              {pickLang(lang, campaign.titleEn, campaign.titleBg) ||
                t('storyYearTitle')}
            </h2>
            <p className="mt-1 max-w-xl font-sans text-[11px] font-light leading-relaxed text-[#1A1A1A]/60 sm:text-xs md:text-sm">
              {pickLang(lang, campaign.descriptionEn, campaign.descriptionBg) ||
                t('storyYearHomeLead')}{' '}
              <span className="text-[#0C2686]/80">
                {t('storyYearOpen', { count: campaign.totalVotes })}
              </span>
            </p>
            {voteMutation.isError && (
              <p className="mt-1 font-sans text-xs text-rose-700">
                {(voteMutation.error as Error).message}
              </p>
            )}
          </div>
          <Link
            to="/story-of-the-year"
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-[#0C2686] px-4 py-2 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[#0a1f6b] sm:self-auto sm:text-[11px]"
          >
            {t('storyYearHomeCta')}
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {/* Top 3 — equal width, height by votes (bottom-aligned) */}
        <div className="grid min-h-0 flex-1 grid-cols-3 items-end gap-2 sm:gap-3 md:gap-4">
          {top.map((n, index) => {
            const rank = index + 1
            const heightPct = topHeightPct(rank, n.voteCount, maxVotes)
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: index * 0.06 }}
                style={{ height: `${heightPct}%` }}
                className="min-h-0 w-full"
              >
                <NomineePanel
                  nomination={n}
                  lang={lang}
                  rank={rank}
                  size={topSize(rank)}
                  voted={campaign.myVoteArticleId === n.articleId}
                  voting={voteMutation.isPending}
                  onVote={() => handleVote(n.articleId)}
                />
              </motion.div>
            )
          })}
        </div>

        {/* Remaining — equal-width small cards */}
        {rest.length > 0 && (
          <div className="mt-2.5 shrink-0 sm:mt-3">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-2.5 md:grid-cols-5 md:gap-3 lg:grid-cols-6">
              {rest.map((n, index) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.06 + index * 0.03 }}
                  className="h-28 w-full sm:h-32"
                >
                  <NomineePanel
                    nomination={n}
                    lang={lang}
                    rank={index + 4}
                    size="small"
                    voted={campaign.myVoteArticleId === n.articleId}
                    voting={voteMutation.isPending}
                    onVote={() => handleVote(n.articleId)}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
