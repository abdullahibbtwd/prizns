import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Clock,
  MapPin,
  Share2,
  Bookmark,
  Headphones,
  Globe,
  Printer,
  Heart,
} from 'lucide-react'
import { JournalShell } from '@/components/concept-3/JournalShell'
import { Logo } from '@/components/Logo'
import { PageMeta } from '@/components/PageMeta'
import { SponsoredBadge } from '@/components/concept-3/SponsoredBadge'
import { SourcedBadge } from '@/components/concept-3/SourcedBadge'
import { SupportThisStory } from '@/components/concept-3/SupportThisStory'
import { RegionalContextExplainer } from '@/components/concept-3/RegionalContextExplainer'
import { getAuthorForArticle } from '@/data/concept-3/authors'
import type { ArticleBlock, JournalArticle } from '@/data/concept-3/articleTypes'
import type { JournalLang } from '@/components/concept-3/JournalShell'
import { useJournalLang } from '@/hooks/useJournalLang'
import { LuxuryVideoPlayer } from '@/components/concept-3/LuxuryVideoPlayer'
import {
  ArticleHeroGallery,
  articleHeroSlides,
} from '@/components/concept-3/ArticleHeroGallery'
import {
  getPublicArticle,
  listRelatedArticles,
  relateToArticle,
} from '@/lib/articles-api'
import type { CmsArticle } from '@/lib/cms-types'
import { useAnalyticsMeta } from '@/hooks/usePageAnalytics'
import { ensureReactionVisitorKey } from '@/lib/cookie-consent'
import { useReaderAuth } from '@/lib/reader-auth'
import {
  getSaveStatus,
  saveArticle,
  unsaveArticle,
} from '@/lib/reader-api'

function pick(lang: JournalLang, en: string, bg: string) {
  return lang === 'bg' ? bg : en
}

function sectionFromPath(pathname: string) {
  const part = decodePath(pathname).split('/').filter(Boolean)[0]
  return part || 'stories'
}

function decodePath(path: string) {
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

function pathsMatch(a: string, b: string) {
  return decodePath(a) === decodePath(b)
}

function toJournalArticle(api: CmsArticle): JournalArticle {
  return {
    slug: api.slug,
    sourceId: api.id,
    section: (api.section === 'human_stories' ? 'human-stories' : api.section) as JournalArticle['section'],
    path: api.path,
    category: api.category,
    categoryBg: api.categoryBg,
    title: api.title,
    titleBg: api.titleBg,
    subtitle: api.subtitle,
    subtitleBg: api.subtitleBg,
    readTime: api.readTime,
    readTimeBg: api.readTimeBg,
    location: api.location,
    locationBg: api.locationBg,
    author: api.author,
    authorBg: api.authorBg,
    authorSlug: api.authorSlug,
    speaker: api.speaker,
    speakerBg: api.speakerBg,
    date: api.date,
    dateBg: api.dateBg,
    image: api.image,
    heroKind: api.heroKind,
    photoCredit: api.photoCredit,
    photoCreditBg: api.photoCreditBg,
    audioUrl: api.audioUrl,
    audioDuration: api.audioDuration,
    videoUrl: api.videoUrl,
    sponsored: Boolean(api.sponsored),
    sourced: Boolean(api.sourced),
    sponsorName: api.sponsorName ?? null,
    behindStory: api.behindStory,
    behindStoryBg: api.behindStoryBg,
    seoTitle: api.seoTitle,
    seoTitleBg: api.seoTitleBg,
    seoDescription: api.seoDescription,
    seoDescriptionBg: api.seoDescriptionBg,
    gallery: api.gallery,
    series: api.series
      ? {
          id: api.series.id,
          slug: api.series.slug,
          title:
            api.series.title ||
            api.series.titleEn ||
            api.series.titleBg,
          titleBg: api.series.titleBg,
          titleEn: api.series.titleEn,
          episodeNumber: api.series.episodeNumber,
        }
      : null,
    body: api.body as ArticleBlock[],
    endLabel: api.endLabel,
    endLabelBg: api.endLabelBg,
  }
}

function ArticleBlocks({
  article,
  lang,
}: {
  article: JournalArticle
  lang: JournalLang
}) {
  return (
    <div className="article-body space-y-8 font-sans text-base md:text-lg text-[#1A1A1A]/80 font-light leading-relaxed">
      {article.body.map((block, index) => (
        <ArticleBlockView
          key={`${block.type}-${index}`}
          block={block}
          lang={lang}
        />
      ))}
    </div>
  )
}

function ArticleBlockView({
  block,
  lang,
}: {
  block: ArticleBlock
  lang: JournalLang
}) {
  if (block.type === 'image') {
    const caption = pick(lang, block.text, block.textBg).trim()
    return (
      <figure className="my-10">
        <img
          src={block.url}
          alt={caption}
          className="w-full rounded-[16px] object-cover"
        />
        {caption ? (
          <figcaption className="mt-3 text-center font-sans text-xs uppercase tracking-[0.16em] text-[#1A1A1A]/45">
            {caption}
          </figcaption>
        ) : null}
      </figure>
    )
  }

  if (block.type === 'video') {
    const caption = pick(lang, block.text, block.textBg).trim()
    return (
      <figure className="my-10 print-hidden">
        <LuxuryVideoPlayer
          src={block.url}
          title={caption}
          aspectClassName="aspect-video"
          tone="editorial"
          size="featured"
          className="rounded-[16px]"
        />
        {caption ? (
          <figcaption className="mt-3 text-center font-sans text-xs uppercase tracking-[0.16em] text-[#1A1A1A]/45">
            {caption}
          </figcaption>
        ) : null}
      </figure>
    )
  }

  if (block.type === 'paragraph') {
    return <p>{pick(lang, block.text, block.textBg)}</p>
  }

  if (block.type === 'pullquote') {
    const cite = pick(lang, block.cite, block.citeBg).trim()
    return (
      <blockquote className="my-10 border-l-2 border-[#0C2686] bg-[#0C2686]/5 px-6 py-6 md:px-8 rounded-r-xl">
        <p className="font-sans text-base md:text-lg font-light italic leading-relaxed text-[#1A1A1A]/80">
          “{pick(lang, block.text, block.textBg)}”
        </p>
        {cite ? (
          <cite className="mt-3 block font-sans text-xs uppercase tracking-widest text-[#0C2686] not-italic">
            — {cite}
          </cite>
        ) : null}
      </blockquote>
    )
  }

  if (block.type === 'note') {
    return (
      <aside className="rounded-[16px] border border-[#EAE6DF] bg-white px-6 py-5 md:px-8">
        <span className="mb-2 block font-sans text-[11px] font-medium uppercase tracking-[0.22em] text-[#0C2686]">
          {pick(lang, block.label, block.labelBg)}
        </span>
        {pick(lang, block.text, block.textBg).trim() ? (
          <p className="font-sans text-sm md:text-base font-light leading-relaxed text-[#1A1A1A]/75">
            {pick(lang, block.text, block.textBg)}
          </p>
        ) : null}
      </aside>
    )
  }

  return (
    <p className="text-center font-sans text-xs uppercase tracking-[0.18em] text-[#1A1A1A]/45">
      {pick(lang, block.text, block.textBg)}
    </p>
  )
}

function RelatedStrip({
  section,
  slug,
  lang,
}: {
  section: string
  slug: string
  lang: JournalLang
}) {
  const { t } = useTranslation()
  const relatedQuery = useQuery({
    queryKey: ['related-articles', section, slug],
    queryFn: () => listRelatedArticles(section, slug, 3),
  })
  const items = relatedQuery.data ?? []
  if (!relatedQuery.isSuccess || items.length === 0) return null

  return (
    <section className="mt-16 border-t border-[#EAE6DF] pt-12 print-hidden" data-print-hide>
      <h2 className="mb-8 text-center font-sans text-[11px] uppercase tracking-[0.25em] text-[#0C2686]">
        {t('relatedStories')}
      </h2>
      <ul className="grid gap-8 sm:grid-cols-3">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              to={`${item.path}?from=related`}
              className="group block"
            >
              {item.image ? (
                <div className="mb-3 aspect-[16/10] overflow-hidden">
                  <img
                    src={item.image}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                </div>
              ) : null}
              <p className="font-heading text-xl leading-snug text-[#1A1A1A] transition-colors group-hover:text-[#0C2686]">
                {pick(lang, item.title, item.titleBg)}
              </p>
              <p className="mt-1 font-sans text-[11px] uppercase tracking-wider text-[#1A1A1A]/45">
                {pick(lang, item.readTime, item.readTimeBg)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ArticleContent({
  article,
  lang,
  setLang,
  section,
  relateCount: initialRelateCount = 0,
  viewerHasRelated: initialHasRelated = false,
}: {
  article: JournalArticle
  lang: JournalLang
  setLang: (lang: JournalLang) => void
  section: string
  relateCount?: number
  viewerHasRelated?: boolean
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { reader, enabled: readerAuthEnabled, openSignIn } = useReaderAuth()
  const [readingProgress, setReadingProgress] = useState(0)
  const [relateCount, setRelateCount] = useState(initialRelateCount)
  const [hasRelated, setHasRelated] = useState(initialHasRelated)
  const [saved, setSaved] = useState(false)
  const author = getAuthorForArticle(article)
  const articleId = article.sourceId

  useEffect(() => {
    setRelateCount(initialRelateCount)
    setHasRelated(initialHasRelated)
  }, [article.slug, initialRelateCount, initialHasRelated])

  useEffect(() => {
    if (!reader || !articleId || !readerAuthEnabled) {
      setSaved(false)
      return
    }
    let cancelled = false
    void getSaveStatus(articleId)
      .then((result) => {
        if (!cancelled) setSaved(result.saved)
      })
      .catch(() => {
        if (!cancelled) setSaved(false)
      })
    return () => {
      cancelled = true
    }
  }, [reader, articleId, readerAuthEnabled, article.slug])

  const relateMutation = useMutation({
    mutationFn: () =>
      relateToArticle(section, article.slug, ensureReactionVisitorKey()),
    onSuccess: (data) => {
      setRelateCount(data.relateCount)
      setHasRelated(data.viewerHasRelated)
      void queryClient.invalidateQueries({
        queryKey: ['public-article', section, article.slug],
      })
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!articleId) throw new Error('Missing article')
      if (saved) {
        await unsaveArticle(articleId)
        return false
      }
      await saveArticle(articleId)
      return true
    },
    onSuccess: (next) => {
      setSaved(next)
      void queryClient.invalidateQueries({ queryKey: ['reader-saves'] })
    },
  })

  const handleBookmark = () => {
    if (!articleId || !readerAuthEnabled) return
    if (!reader) {
      openSignIn({
        intent: { type: 'save', articleId },
        returnUrl: window.location.pathname + window.location.search,
      })
      return
    }
    saveMutation.mutate()
  }

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement
      const scrollTop = el.scrollTop || document.body.scrollTop
      const height = el.scrollHeight - el.clientHeight
      setReadingProgress(height > 0 ? Math.min(100, (scrollTop / height) * 100) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [article.slug])

  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1)
      return
    }
    navigate('/')
  }

  const handleShare = async () => {
    const url = window.location.href
    const title = pick(lang, article.title, article.titleBg)
    try {
      if (navigator.share) {
        await navigator.share({ title, url })
        return
      }
    } catch {
      // fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // ignore
    }
  }

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-50 print-hidden" data-print-hide>
        <div className="h-1 w-full bg-[#EAE6DF]">
          <div
            className="h-full bg-[#0C2686] transition-all duration-150"
            style={{ width: `${readingProgress}%` }}
          />
        </div>

        <div className="flex items-center justify-between border-b border-[#EAE6DF] bg-[#FDFBF7]/95 px-6 py-4 backdrop-blur-md md:px-12">
          <div className="flex items-center gap-3">
            <Link to="/" className="shrink-0 cursor-pointer transition-opacity hover:opacity-90">
              <Logo className="h-6 md:h-7" showSlogan={false} />
            </Link>
            <span className="h-4 w-px bg-[#1A1A1A]/20" />
            <span className="hidden font-sans text-xs font-medium uppercase tracking-widest text-[#0C2686] sm:inline">
              {t('journalArticle')}
            </span>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button
              type="button"
              onClick={() => window.print()}
              className="cursor-pointer rounded-full p-2 text-[#1A1A1A]/60 transition-colors hover:bg-black/5 hover:text-[#0C2686]"
              aria-label={t('print')}
              title={t('print')}
            >
              <Printer className="size-4 stroke-[1.5]" />
            </button>
            <button
              type="button"
              onClick={() => void handleShare()}
              className="cursor-pointer rounded-full p-2 text-[#1A1A1A]/60 transition-colors hover:bg-black/5 hover:text-[#0C2686]"
              aria-label={t('share')}
            >
              <Share2 className="size-4 stroke-[1.5]" />
            </button>
            <button
              type="button"
              onClick={handleBookmark}
              disabled={saveMutation.isPending || !readerAuthEnabled}
              className="cursor-pointer rounded-full p-2 text-[#1A1A1A]/60 transition-colors hover:bg-black/5 hover:text-[#0C2686] disabled:opacity-40"
              aria-label={saved ? t('bookmarkSaved') : t('bookmark')}
              title={saved ? t('bookmarkSaved') : t('bookmark')}
            >
              <Bookmark
                className={`size-4 stroke-[1.5] ${saved ? 'fill-[#0C2686] text-[#0C2686]' : ''}`}
              />
            </button>
            <button
              type="button"
              onClick={() => setLang(lang === 'bg' ? 'en' : 'bg')}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-black/10 px-2.5 py-2 font-sans text-[11px] uppercase tracking-widest text-[#1A1A1A]/60 transition-colors hover:border-[#0C2686] hover:text-[#0C2686]"
            >
              <Globe className="size-3 stroke-[1.5]" />
              {lang.toUpperCase()}
            </button>
            <button
              type="button"
              onClick={goBack}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-black/10 px-3 py-2 font-sans text-[11px] uppercase tracking-[0.18em] text-[#1A1A1A] transition-colors hover:border-black hover:text-[#0C2686]"
            >
              <ArrowLeft className="size-3.5" />
              <span className="hidden sm:inline">{t('back')}</span>
            </button>
          </div>
        </div>
      </div>

      <article className="article-print mx-auto max-w-3xl px-6 pb-12 pt-28 md:pb-20 md:pt-32">
        <div className="mb-6 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 font-sans text-[10px] uppercase tracking-[0.12em] text-[#1A1A1A]/60 sm:mb-8 sm:gap-x-3 sm:gap-y-2 sm:text-xs sm:tracking-[0.25em]">
          <span className="font-medium text-[#0C2686]">
            {pick(lang, article.category, article.categoryBg)}
          </span>
          <span className="opacity-50">•</span>
          <span className="inline-flex items-center gap-0.5 sm:gap-1">
            <Clock className="size-2.5 shrink-0 sm:size-3" />
            {pick(lang, article.readTime, article.readTimeBg)}
          </span>
          <span className="opacity-50">•</span>
          <span className="inline-flex items-center gap-0.5 sm:gap-1">
            <MapPin className="size-2.5 shrink-0 text-[#0C2686] sm:size-3" />
            {pick(lang, article.location, article.locationBg)}
          </span>
        </div>

        {article.sponsored || article.sourced ? (
          <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
            {article.sourced ? <SourcedBadge lang={lang} tone="onLight" /> : null}
            {article.sponsored ? (
              <SponsoredBadge
                lang={lang}
                sponsorName={article.sponsorName}
                tone="onLight"
              />
            ) : null}
          </div>
        ) : null}

        {article.series ? (
          <p className="mb-4 text-center font-sans text-[11px] uppercase tracking-[0.2em] text-[#0C2686] print-hidden">
            <Link
              to={`/stories?series=${encodeURIComponent(article.series.slug || article.series.id)}`}
              className="underline-offset-4 hover:underline"
            >
              {lang === 'bg'
                ? `Епизод ${article.series.episodeNumber} от „${article.series.titleBg}“`
                : `Episode ${article.series.episodeNumber} of ${article.series.title}`}
            </Link>
          </p>
        ) : null}

        <h1 className="mb-6 text-center font-heading text-4xl font-normal leading-[1.12] text-[#1A1A1A] sm:text-5xl md:mb-8 md:text-6xl">
          {pick(lang, article.title, article.titleBg)}
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-center font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/60 md:text-base">
          {pick(lang, article.subtitle, article.subtitleBg)}
        </p>

        <div className="mb-8 text-center">
          <p className="mb-1 font-sans text-xs uppercase tracking-[0.2em] text-[#1A1A1A]/40">
            {article.speaker ? (
              `${t('voice')}${pick(lang, article.speaker, article.speakerBg ?? article.speaker)}`
            ) : author ? (
              <>
                {t('wordsBy')}
                <Link
                  to={author.path}
                  className="cursor-pointer text-[#0C2686] transition-colors hover:text-[#1A1A1A]"
                >
                  {pick(lang, author.name, author.nameBg)}
                </Link>
              </>
            ) : (
              pick(lang, `Words by ${article.author}`, `Текст: ${article.authorBg}`)
            )}
          </p>
          <p className="font-sans text-xs font-light text-[#1A1A1A]/60">
            {`${t('published')}${pick(lang, article.date, article.dateBg)}`}
          </p>
        </div>

        <div className="mb-12 flex justify-center print-hidden" data-print-hide>
          <button
            type="button"
            disabled={hasRelated || relateMutation.isPending}
            onClick={() => relateMutation.mutate()}
            title={t('iRelateHint')}
            className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 font-sans text-[11px] uppercase tracking-[0.2em] transition-colors ${
              hasRelated
                ? 'border-[#0C2686]/40 bg-[#0C2686]/5 text-[#0C2686]'
                : 'border-black/10 text-[#1A1A1A]/70 hover:border-[#0C2686] hover:text-[#0C2686]'
            } disabled:cursor-default`}
          >
            <Heart
              className={`size-3.5 ${hasRelated ? 'fill-[#0C2686]' : ''}`}
              strokeWidth={1.5}
            />
            {hasRelated ? t('iRelated') : t('iRelate')}
            {relateCount > 0 ? (
              <span className="tabular-nums text-[#1A1A1A]/45">· {relateCount}</span>
            ) : null}
          </button>
        </div>

        {article.heroKind === 'video' && article.videoUrl ? (
          <div className="relative mb-14 w-full overflow-hidden rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] print-hidden">
            <LuxuryVideoPlayer
              src={article.videoUrl}
              poster={article.image}
              title={pick(lang, article.title, article.titleBg)}
              aspectClassName="aspect-[16/10]"
              tone="editorial"
              size="featured"
              className="rounded-[16px]"
            />
            {article.photoCredit && (
              <div className="absolute bottom-3 right-4 rounded bg-black/40 px-2.5 py-1 font-sans text-[10px] uppercase tracking-widest text-white/80 backdrop-blur-md">
                {pick(lang, article.photoCredit, article.photoCreditBg)}
              </div>
            )}
          </div>
        ) : article.image ? (
          <ArticleHeroGallery
            slides={articleHeroSlides({
              image: article.image,
              photoCreditBg: pick(
                lang,
                article.photoCredit,
                article.photoCreditBg,
              ),
              gallery:
                article.section === 'gallery' ? article.gallery : undefined,
            })}
            title={pick(lang, article.title, article.titleBg)}
          />
        ) : null}

        {article.videoUrl &&
        article.heroKind !== 'video' &&
        !article.body.some(
          (block) => block.type === 'video' && block.url === article.videoUrl,
        ) ? (
          <div className="relative mb-14 w-full overflow-hidden rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] print-hidden">
            <LuxuryVideoPlayer
              src={article.videoUrl}
              poster={article.image}
              title={pick(lang, article.title, article.titleBg)}
              aspectClassName="aspect-[16/10]"
              tone="editorial"
              size="featured"
              className="rounded-[16px]"
            />
          </div>
        ) : null}

        {article.audioUrl && (
          <div className="mb-12 rounded-[16px] border border-[#EAE6DF] bg-white p-5 md:p-6 print-hidden" data-print-hide>
            <div className="mb-3 flex items-center gap-2 font-sans text-[11px] uppercase tracking-[0.2em] text-[#0C2686]">
              <Headphones className="size-3.5" />
              <span>
                {t('listen')}
                {article.audioDuration ? ` · ${article.audioDuration}` : ''}
              </span>
            </div>
            <audio controls className="w-full" src={article.audioUrl} preload="none">
              <track kind="captions" />
            </audio>
          </div>
        )}

        <ArticleBlocks article={article} lang={lang} />

        {(article.behindStoryBg || article.behindStory) ? (
          <aside className="mt-14 rounded-[16px] border border-[#EAE6DF] bg-white px-6 py-6 md:px-8 print-hidden" data-print-hide>
            <span className="mb-2 block font-sans text-[11px] font-medium uppercase tracking-[0.22em] text-[#0C2686]">
              {lang === 'bg' ? 'Зад историята' : 'Behind the Story'}
            </span>
            <p className="whitespace-pre-line font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/75 md:text-base">
              {pick(
                lang,
                article.behindStory || article.behindStoryBg || '',
                article.behindStoryBg || article.behindStory || '',
              )}
            </p>
          </aside>
        ) : null}

        <RegionalContextExplainer
          section={section}
          slug={article.slug}
          lang={lang}
        />

        <SupportThisStory articleId={articleId} lang={lang} />

        <div className="mt-16 border-t border-[#EAE6DF] pt-12 text-center">
          <span className="mb-4 block font-heading text-3xl uppercase tracking-[0.2em] text-[#1A1A1A]/30">
            PRIZNI
          </span>
          <p className="mb-8 font-sans text-xs uppercase tracking-widest text-[#1A1A1A]/50">
            {pick(lang, article.endLabel, article.endLabelBg)}
          </p>
          <button
            type="button"
            onClick={goBack}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#0C2686] px-8 py-3.5 font-sans text-xs font-medium uppercase tracking-[0.25em] text-white transition-colors hover:bg-[#1A1A1A] print-hidden"
            data-print-hide
          >
            {t('returnToJournal')}
          </button>
        </div>

        <RelatedStrip section={section} slug={article.slug} lang={lang} />
      </article>
    </>
  )
}

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const { pathname } = useLocation()
  const { lang, setLang } = useJournalLang()
  const section = sectionFromPath(pathname)
  const [visitorKey] = useState(() => ensureReactionVisitorKey())

  const apiQuery = useQuery({
    queryKey: ['public-article', section, slug, visitorKey],
    queryFn: () =>
      getPublicArticle(section, slug!, { visitorKey }),
    enabled: Boolean(slug),
    retry: false,
  })

  const article = apiQuery.data ? toJournalArticle(apiQuery.data) : undefined

  useAnalyticsMeta({
    articleId: apiQuery.data?.id ?? null,
    title: article ? (lang === 'bg' ? article.titleBg || article.title : article.title) : null,
  })

  if (apiQuery.isLoading) {
    return (
      <JournalShell navVariant="solid" hideChrome>
        {() => (
          <div className="flex min-h-[50vh] items-center justify-center text-sm text-[#1A1A1A]/60">
            Loading…
          </div>
        )}
      </JournalShell>
    )
  }

  if (!article || !pathsMatch(article.path, pathname)) {
    return <Navigate to="/" replace />
  }

  return (
    <JournalShell navVariant="solid" hideChrome>
      {() => (
        <>
          <PageMeta
            lang={lang}
            type="article"
            title={
              pick(
                lang,
                article.seoTitle || article.title,
                article.seoTitleBg || article.titleBg,
              )
            }
            description={
              pick(
                lang,
                article.seoDescription || article.subtitle,
                article.seoDescriptionBg || article.subtitleBg,
              ) || undefined
            }
            path={article.path}
            image={article.image || undefined}
            jsonLd={{
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: pick(
                lang,
                article.seoTitle || article.title,
                article.seoTitleBg || article.titleBg,
              ),
              description:
                pick(
                  lang,
                  article.seoDescription || article.subtitle,
                  article.seoDescriptionBg || article.subtitleBg,
                ) || undefined,
              image: article.image || undefined,
              datePublished: article.date || undefined,
              author: article.author
                ? { '@type': 'Person', name: pick(lang, article.author, article.authorBg) }
                : undefined,
              publisher: {
                '@type': 'Organization',
                name: 'Prizni',
              },
              mainEntityOfPage: article.path,
            }}
          />
          <ArticleContent
            article={article}
            lang={lang}
            setLang={setLang}
            section={section}
            relateCount={apiQuery.data?.relateCount ?? 0}
            viewerHasRelated={apiQuery.data?.viewerHasRelated ?? false}
          />
        </>
      )}
    </JournalShell>
  )
}
