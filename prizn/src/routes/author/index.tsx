import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Award, MapPin, PenLine } from 'lucide-react'
import { JournalShell } from '@/components/concept-3/JournalShell'
import { Logo } from '@/components/Logo'
import type { JournalAuthor } from '@/data/concept-3/authors'
import type { JournalArticle } from '@/data/concept-3/articleTypes'
import type { JournalLang } from '@/components/concept-3/JournalShell'
import { useJournalLang } from '@/hooks/useJournalLang'
import { listPublicArticles } from '@/lib/articles-api'
import { getPublicAuthor } from '@/lib/public-content'

function pick(
  lang: JournalLang,
  en: string | null | undefined,
  bg: string | null | undefined,
) {
  if (lang === 'bg') return (bg || en || '').trim()
  return (en || bg || '').trim()
}

function AuthorContent({
  author,
  stories,
  lang,
  setLang,
}: {
  author: JournalAuthor
  stories: JournalArticle[]
  lang: JournalLang
  setLang: (lang: JournalLang) => void
}) {
  const navigate = useNavigate()

  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1)
      return
    }
    navigate('/authors')
  }

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b border-[#EAE6DF] bg-[#FDFBF7]/95 px-6 py-4 backdrop-blur-md md:px-12">
        <div className="flex items-center gap-3">
          <Link to="/" className="shrink-0 cursor-pointer transition-opacity hover:opacity-90">
            <Logo className="h-6 md:h-7" showSlogan={false} />
          </Link>
          <span className="h-4 w-px bg-[#1A1A1A]/20" />
          <span className="hidden font-sans text-xs font-medium uppercase tracking-widest text-[#0C2686] sm:inline">
            {lang === 'bg' ? 'Автор' : 'Author'}
          </span>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={() => setLang(lang === 'bg' ? 'en' : 'bg')}
            className="inline-flex cursor-pointer items-center rounded-full border border-black/10 px-2.5 py-2 font-sans text-[11px] uppercase tracking-widest text-[#1A1A1A]/60 transition-colors hover:border-[#0C2686] hover:text-[#0C2686]"
          >
            {lang.toUpperCase()}
          </button>
          <button
            type="button"
            onClick={goBack}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-black/10 px-3 py-2 font-sans text-[11px] uppercase tracking-[0.18em] text-[#1A1A1A] transition-colors hover:border-black hover:text-[#0C2686]"
          >
            <ArrowLeft className="size-3.5" />
            <span className="hidden sm:inline">{lang === 'bg' ? 'Назад' : 'Back'}</span>
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-6 pb-20 pt-28 md:px-12 md:pt-32">
        <section className="grid grid-cols-1 items-start gap-10 md:grid-cols-12 md:gap-12">
          <div className="md:col-span-5">
            <div className="overflow-hidden rounded-[4px] bg-[#EAE6DF]">
              <img
                src={author.image}
                alt={pick(lang, author.name, author.nameBg)}
                className="aspect-[3/4] w-full object-cover"
              />
            </div>
          </div>

          <div className="md:col-span-7 md:pt-4">
            <p className="font-sans text-[11px] font-medium uppercase tracking-[0.28em] text-[#0C2686]">
              {pick(lang, author.role, author.roleBg)}
            </p>
            <h1 className="mt-3 font-heading text-4xl font-light tracking-tight text-[#1A1A1A] md:text-5xl lg:text-6xl">
              {pick(lang, author.name, author.nameBg)}
            </h1>

            <p className="mt-4 inline-flex items-center gap-1.5 font-sans text-xs uppercase tracking-[0.18em] text-[#1A1A1A]/50">
              <MapPin className="size-3 text-[#0C2686]" />
              {pick(lang, author.location, author.locationBg)}
            </p>

            <blockquote className="mt-8 border-l-2 border-[#0C2686] bg-[#0C2686]/5 py-5 pl-5 pr-4 md:pl-6">
              <p className="font-heading text-xl italic leading-snug text-[#1A1A1A] md:text-2xl">
                “{pick(lang, author.quote, author.quoteBg)}”
              </p>
            </blockquote>

            <p className="mt-8 font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/70 md:text-base">
              {pick(lang, author.bio, author.bioBg)}
            </p>

            <p className="mt-6 inline-flex items-center gap-2 font-sans text-xs uppercase tracking-[0.2em] text-[#1A1A1A]/45">
              <PenLine className="size-3.5 text-[#0C2686]" />
              {stories.length}{' '}
              {lang === 'bg'
                ? stories.length === 1
                  ? 'публикувана история'
                  : 'публикувани истории'
                : stories.length === 1
                  ? 'published story'
                  : 'published stories'}
            </p>

            {(author.badges?.length ?? 0) > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {author.badges!.map((badge) => (
                  <span
                    key={badge.id}
                    title={pick(
                      lang,
                      badge.descriptionEn,
                      badge.descriptionBg,
                    )}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#0C2686]/20 bg-[#0C2686]/5 px-3 py-1.5 font-sans text-[10px] uppercase tracking-widest text-[#0C2686]"
                  >
                    <Award className="size-3" />
                    {pick(lang, badge.nameEn, badge.nameBg)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mt-16 border-t border-[#EAE6DF] pt-12 md:mt-20 md:pt-16">
          <div className="mb-10 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-sans text-[11px] font-medium uppercase tracking-[0.28em] text-[#0C2686]">
                {lang === 'bg' ? 'От автора' : 'From this author'}
              </p>
              <h2 className="mt-2 font-heading text-3xl font-light text-[#1A1A1A] md:text-4xl">
                {lang === 'bg' ? 'Истории' : 'Stories'}
              </h2>
            </div>
            <Link
              to="/authors"
              className="font-sans text-xs uppercase tracking-[0.2em] text-[#1A1A1A]/50 transition-colors hover:text-[#0C2686]"
            >
              {lang === 'bg' ? 'Всички автори' : 'All authors'}
            </Link>
          </div>

          {stories.length === 0 ? (
            <p className="font-sans text-sm font-light text-[#1A1A1A]/55">
              {lang === 'bg'
                ? 'Все още няма публикувани истории за този автор.'
                : 'No published stories for this author yet.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {stories.map((story) => (
                <Link
                  key={story.slug}
                  to={story.path}
                  className="group overflow-hidden rounded-[16px] border border-[#EAE6DF] bg-white transition-all hover:border-[#0C2686]/30 hover:shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-[#1A1A1A]">
                    <img
                      src={story.image}
                      alt={pick(lang, story.title, story.titleBg)}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-5 md:p-6">
                    <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-[#0C2686]">
                      {pick(lang, story.category, story.categoryBg)}
                      {' · '}
                      {pick(lang, story.readTime, story.readTimeBg)}
                    </p>
                    <h3 className="mt-2 font-heading text-xl font-normal text-[#1A1A1A] transition-colors group-hover:text-[#0C2686] md:text-2xl">
                      {pick(lang, story.title, story.titleBg)}
                    </h3>
                    <p className="mt-2 line-clamp-2 font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/60">
                      {pick(lang, story.subtitle, story.subtitleBg)}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1.5 font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-[#0C2686]">
                      {lang === 'bg' ? 'Прочетете' : 'Read'}
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  )
}

export default function AuthorPage() {
  const { slug } = useParams<{ slug: string }>()
  const { lang, setLang } = useJournalLang()

  const authorQuery = useQuery({
    queryKey: ['public-author', slug],
    queryFn: () => getPublicAuthor(slug!),
    enabled: Boolean(slug),
    retry: false,
  })

  const articlesQuery = useQuery({
    queryKey: ['public-articles', 'all-for-author', slug],
    queryFn: () => listPublicArticles(),
    enabled: Boolean(slug),
    retry: false,
  })

  const apiAuthor = authorQuery.data
  const author: JournalAuthor | undefined = apiAuthor
    ? {
        slug: apiAuthor.slug,
        sourceId: apiAuthor.id,
        path: apiAuthor.path,
        name: apiAuthor.name,
        nameBg: apiAuthor.nameBg,
        role: apiAuthor.role,
        roleBg: apiAuthor.roleBg,
        quote: apiAuthor.quote,
        quoteBg: apiAuthor.quoteBg,
        image: apiAuthor.image,
        location: apiAuthor.location,
        locationBg: apiAuthor.locationBg,
        bio: apiAuthor.bio,
        bioBg: apiAuthor.bioBg,
        aliases: apiAuthor.aliases,
        badges: apiAuthor.badges,
      }
    : undefined

  if (!slug || (!author && !authorQuery.isLoading && !authorQuery.isFetching)) {
    return <Navigate to="/authors" replace />
  }

  if (!author) {
    return (
      <JournalShell navVariant="solid" hideChrome>
        {() => (
          <main className="flex min-h-[50vh] items-center justify-center px-6">
            <p className="font-sans text-sm text-[#1A1A1A]/50">…</p>
          </main>
        )}
      </JournalShell>
    )
  }

  const apiStories = (articlesQuery.data ?? []).filter(
    (article) => article.authorSlug === author.slug,
  )
  const stories: JournalArticle[] = apiStories.map((article) => ({
    slug: article.slug,
    sourceId: article.id,
    section: (article.section === 'human_stories'
      ? 'human-stories'
      : article.section) as JournalArticle['section'],
    path: article.path,
    category: article.category,
    categoryBg: article.categoryBg,
    title: article.title,
    titleBg: article.titleBg,
    subtitle: article.subtitle,
    subtitleBg: article.subtitleBg,
    readTime: article.readTime,
    readTimeBg: article.readTimeBg,
    location: article.location,
    locationBg: article.locationBg,
    author: article.author,
    authorBg: article.authorBg,
    authorSlug: article.authorSlug,
    date: article.date,
    dateBg: article.dateBg,
    image: article.image,
    photoCredit: article.photoCredit,
    photoCreditBg: article.photoCreditBg,
    body: (article.body ?? []) as JournalArticle['body'],
    endLabel: article.endLabel,
    endLabelBg: article.endLabelBg,
  }))

  return (
    <JournalShell navVariant="solid" hideChrome>
      {() => (
        <AuthorContent
          author={author}
          stories={stories}
          lang={lang}
          setLang={setLang}
        />
      )}
    </JournalShell>
  )
}
