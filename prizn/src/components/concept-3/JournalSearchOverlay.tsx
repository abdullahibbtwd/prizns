import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { Logo } from '@/components/Logo'
import type { JournalLang } from '@/components/concept-3/JournalShell'
import { articlePath, usePublicArticleSearch } from '@/lib/public-content'
import { pickLang } from '@/lib/pick-lang'
import { getSectionLabel } from '@/lib/section-i18n'

const SUGGESTIONS = [
  'Белоградчик',
  'Чипровски килими',
  'Дунавски рибари',
  'Магията на кваса',
  'Вършец минерални извори',
]

export function JournalSearchOverlay({
  lang,
  onClose,
}: {
  lang: JournalLang
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const searchQuery = usePublicArticleSearch(debounced)
  const results = searchQuery.data ?? []
  const canSearch = debounced.length >= 2

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-[#FDFBF7]/98 p-6 backdrop-blur-xl md:p-16"
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'bg' ? 'Търсене' : 'Search'}
    >
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <Logo className="h-7" sloganClassName="text-[10px]" />
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-black/10 p-2 text-journal-ink transition-colors hover:border-black hover:text-journal-navy"
          aria-label={lang === 'bg' ? 'Затвори' : 'Close'}
        >
          <X className="size-6 stroke-[1.5]" />
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col py-10">
        <p className="mb-4 text-center font-sans text-xs uppercase tracking-[0.25em] text-[#1A1A1A]/50">
          {lang === 'bg' ? 'Търсете из дигиталния журнал' : 'Search the digital journal'}
        </p>
        <div className="relative border-b-2 border-[#1A1A1A] pb-4">
          <Search className="pointer-events-none absolute left-0 top-2 size-6 text-[#1A1A1A]/25 md:size-8" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              lang === 'bg'
                ? 'Търсене на села, занаяти, разкази...'
                : 'Search villages, crafts, stories...'
            }
            className="w-full bg-transparent pl-10 font-heading text-3xl text-journal-ink outline-none placeholder:text-[#1A1A1A]/20 md:pl-12 md:text-5xl"
            autoFocus
          />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <span className="mr-2 text-xs uppercase tracking-widest text-[#1A1A1A]/50">
            {lang === 'bg' ? 'Популярни:' : 'Popular:'}
          </span>
          {SUGGESTIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setQuery(item)}
              className="rounded-full bg-black/5 px-3 py-1 font-sans text-xs text-[#1A1A1A]/70 hover:text-[#0C2686] hover:underline"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mt-10 min-h-0 flex-1 overflow-y-auto">
          {!canSearch ? (
            <p className="text-center font-sans text-sm text-[#1A1A1A]/45">
              {lang === 'bg'
                ? 'Напишете поне 2 символа, за да търсите.'
                : 'Type at least 2 characters to search.'}
            </p>
          ) : searchQuery.isFetching ? (
            <p className="text-center font-sans text-sm uppercase tracking-[0.18em] text-[#1A1A1A]/50">
              {lang === 'bg' ? 'Търсене…' : 'Searching…'}
            </p>
          ) : results.length === 0 ? (
            <p className="text-center font-sans text-sm text-[#1A1A1A]/55">
              {lang === 'bg'
                ? `Няма истории за „${debounced}“.`
                : `No stories for “${debounced}”.`}
            </p>
          ) : (
            <ul className="space-y-2">
              {results.map((article) => {
                const title = pickLang(lang, article.title, article.titleBg)
                const category = pickLang(
                  lang,
                  article.category,
                  article.categoryBg,
                )
                return (
                  <li key={article.id}>
                    <Link
                      to={articlePath(article)}
                      onClick={onClose}
                      className="flex items-center gap-4 rounded-[12px] border border-transparent px-2 py-2 transition-colors hover:border-[#EAE6DF] hover:bg-white"
                    >
                      <div className="size-16 shrink-0 overflow-hidden rounded-[8px] bg-[#EAE6DF]">
                        {article.image ? (
                          <img
                            src={article.image}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-[#0C2686]">
                          {category || getSectionLabel(article.section, lang)}
                        </p>
                        <p className="truncate font-heading text-xl text-[#1A1A1A]">
                          {title}
                        </p>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <p className="text-center font-sans text-xs uppercase tracking-widest text-[#1A1A1A]/40">
        {lang === 'bg'
          ? 'Esc или бутонът горе вдясно затваря търсенето'
          : 'Press Esc or the top-right button to close'}
      </p>
    </motion.div>
  )
}
