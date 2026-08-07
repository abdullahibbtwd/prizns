import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Clock, MapPin, Share2, Bookmark, Headphones, Globe } from 'lucide-react'
import { JournalShell } from '@/components/concept-3/JournalShell'
import { Logo } from '@/components/Logo'
import { getAuthorForArticle } from '@/data/concept-3/authors'
import type { ArticleBlock, JournalArticle } from '@/data/concept-3/articleTypes'
import type { JournalLang } from '@/components/concept-3/JournalShell'
import { useJournalLang } from '@/hooks/useJournalLang'
import { LuxuryVideoPlayer } from '@/components/concept-3/LuxuryVideoPlayer'
import { getPublicArticle } from '@/lib/articles-api'
import type { CmsArticle } from '@/lib/cms-types'

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
    photoCredit: api.photoCredit,
    photoCreditBg: api.photoCreditBg,
    audioUrl: api.audioUrl,
    audioDuration: api.audioDuration,
    videoUrl: api.videoUrl,
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
  let dropCapUsed = false

  return (
    <div className="space-y-8 font-sans text-base md:text-lg text-[#1A1A1A]/80 font-light leading-relaxed">
      {article.body.map((block, index) => {
        const useDropCap = block.type === 'paragraph' && !dropCapUsed
        if (useDropCap) dropCapUsed = true
        return (
          <ArticleBlockView
            key={`${block.type}-${index}`}
            block={block}
            lang={lang}
            dropCap={useDropCap}
          />
        )
      })}
    </div>
  )
}

function ArticleBlockView({
  block,
  lang,
  dropCap,
}: {
  block: ArticleBlock
  lang: JournalLang
  dropCap: boolean
}) {
  if (block.type === 'paragraph') {
    return (
      <p
        className={
          dropCap
            ? 'first-letter:font-heading first-letter:text-6xl first-letter:font-normal first-letter:float-left first-letter:mr-3 first-letter:leading-none first-letter:text-[#0C2686]'
            : undefined
        }
      >
        {pick(lang, block.text, block.textBg)}
      </p>
    )
  }

  if (block.type === 'pullquote') {
    return (
      <blockquote className="my-12 border-l-2 border-[#0C2686] bg-[#0C2686]/5 px-6 py-8 md:px-10 rounded-r-xl">
        <p className="mb-3 font-heading text-2xl md:text-3xl font-normal leading-snug italic text-[#1A1A1A]">
          “{pick(lang, block.text, block.textBg)}”
        </p>
        <cite className="font-sans text-xs uppercase tracking-widest text-[#0C2686] not-italic">
          — {pick(lang, block.cite, block.citeBg)}
        </cite>
      </blockquote>
    )
  }

  if (block.type === 'note') {
    return (
      <aside className="rounded-[16px] border border-[#EAE6DF] bg-white px-6 py-5 md:px-8">
        <span className="mb-2 block font-sans text-[11px] font-medium uppercase tracking-[0.22em] text-[#0C2686]">
          {pick(lang, block.label, block.labelBg)}
        </span>
        <p className="font-sans text-sm md:text-base font-light leading-relaxed text-[#1A1A1A]/75">
          {pick(lang, block.text, block.textBg)}
        </p>
      </aside>
    )
  }

  return (
    <p className="text-center font-sans text-xs uppercase tracking-[0.18em] text-[#1A1A1A]/45">
      {pick(lang, block.text, block.textBg)}
    </p>
  )
}

function ArticleContent({
  article,
  lang,
  setLang,
}: {
  article: JournalArticle
  lang: JournalLang
  setLang: (lang: JournalLang) => void
}) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [readingProgress, setReadingProgress] = useState(0)
  const author = getAuthorForArticle(article)

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement
      const total = doc.scrollHeight - doc.clientHeight
      setReadingProgress(total > 0 ? (window.scrollY / total) * 100 : 0)
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

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-50">
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
              className="cursor-pointer rounded-full p-2 text-[#1A1A1A]/60 transition-colors hover:bg-black/5 hover:text-[#0C2686]"
              aria-label="Share"
            >
              <Share2 className="size-4 stroke-[1.5]" />
            </button>
            <button
              type="button"
              className="cursor-pointer rounded-full p-2 text-[#1A1A1A]/60 transition-colors hover:bg-black/5 hover:text-[#0C2686]"
              aria-label="Bookmark"
            >
              <Bookmark className="size-4 stroke-[1.5]" />
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

      <article className="mx-auto max-w-3xl px-6 pb-12 pt-28 md:pb-20 md:pt-32">
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

        {article.series ? (
          <p className="mb-4 text-center font-sans text-[11px] uppercase tracking-[0.2em] text-[#0C2686]">
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

        <div className="mb-12 text-center">
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

        {article.videoUrl ? (
          <div className="relative mb-14 w-full overflow-hidden rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
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
        ) : (
          article.image && (
            <div className="relative mb-14 aspect-[16/10] w-full overflow-hidden rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
              <img
                src={article.image}
                alt={pick(lang, article.title, article.titleBg)}
                className="h-full w-full object-cover"
              />
              <div className="absolute bottom-3 right-4 rounded bg-black/40 px-2.5 py-1 font-sans text-[10px] uppercase tracking-widest text-white/80 backdrop-blur-md">
                {pick(lang, article.photoCredit, article.photoCreditBg)}
              </div>
            </div>
          )
        )}

        {article.audioUrl && (
          <div className="mb-12 rounded-[16px] border border-[#EAE6DF] bg-white p-5 md:p-6">
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
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#0C2686] px-8 py-3.5 font-sans text-xs font-medium uppercase tracking-[0.25em] text-white transition-colors hover:bg-[#1A1A1A]"
          >
            {t('returnToJournal')}
          </button>
        </div>
      </article>
    </>
  )
}

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const { pathname } = useLocation()
  const { lang, setLang } = useJournalLang()
  const section = sectionFromPath(pathname)

  const apiQuery = useQuery({
    queryKey: ['public-article', section, slug],
    queryFn: () => getPublicArticle(section, slug!),
    enabled: Boolean(slug),
    retry: false,
  })

  const article = apiQuery.data ? toJournalArticle(apiQuery.data) : undefined

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
      {() => <ArticleContent article={article} lang={lang} setLang={setLang} />}
    </JournalShell>
  )
}
