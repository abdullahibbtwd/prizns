import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { JournalShell } from '@/components/concept-3/JournalShell'
import { ListingHeader } from '@/components/concept-3/ListingHeader'
import { askArchive, type ArchiveAskResult } from '@/lib/ai-api'
import { ApiError } from '@/lib/api'
import { useJournalLang } from '@/hooks/useJournalLang'

export default function ArchivePage() {
  const { lang } = useJournalLang()
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<ArchiveAskResult | null>(null)

  const askMutation = useMutation({
    mutationFn: () => askArchive({ question: question.trim(), lang }),
    onSuccess: setResult,
  })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (question.trim().length < 4) return
    askMutation.mutate()
  }

  const errorMessage =
    askMutation.error instanceof ApiError && askMutation.error.status === 503
      ? lang === 'bg'
        ? 'Архивът не е наличен в момента.'
        : 'The archive is not available right now.'
      : askMutation.error
        ? lang === 'bg'
          ? 'Въпросът не можа да се изпрати. Опитайте отново.'
          : 'Could not send the question. Try again.'
        : null

  return (
    <JournalShell>
      {() => (
        <main>
          <ListingHeader
            lang={lang}
            eyebrow={lang === 'bg' ? 'Архив' : 'Archive'}
            title={lang === 'bg' ? 'Питай архива' : 'Ask the Archive'}
            description={
              lang === 'bg'
                ? 'Попитайте за обичай, село или история от Северозапада. Отговаряме само с публикувани текстове на Prizni — и посочваме източника.'
                : 'Ask about a custom, a village, or a story from the Northwest. We answer only from published Prizni pieces, and we link to them.'
            }
          />

          <div className="mx-auto max-w-3xl px-6 py-16 md:px-12">
            <form onSubmit={onSubmit} className="space-y-4">
              <label className="block font-sans text-[11px] uppercase tracking-[0.2em] text-[#1A1A1A]/45">
                {lang === 'bg' ? 'Въпрос' : 'Question'}
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={4}
                  maxLength={500}
                  className="mt-2 block w-full rounded-2xl border border-[#EAE6DF] bg-white px-4 py-3 font-sans text-base text-[#1A1A1A] outline-none focus:border-[#0C2686]/40"
                  placeholder={
                    lang === 'bg'
                      ? 'Например: Какво са кукерите във Видинско?'
                      : 'For example: What are Kukeri in the Vidin region?'
                  }
                />
              </label>
              <button
                type="submit"
                disabled={question.trim().length < 4 || askMutation.isPending}
                className="rounded-full bg-[#0C2686] px-6 py-2.5 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-white disabled:opacity-50"
              >
                {askMutation.isPending
                  ? lang === 'bg'
                    ? 'Търсене…'
                    : 'Searching…'
                  : lang === 'bg'
                    ? 'Питай'
                    : 'Ask'}
              </button>
            </form>

            {errorMessage ? (
              <p className="mt-8 font-sans text-sm text-rose-800">{errorMessage}</p>
            ) : null}

            {result?.refused ? (
              <p className="mt-10 font-sans text-base leading-relaxed text-[#1A1A1A]/75">
                {lang === 'bg'
                  ? 'Няма история в архива, която достатъчно сигурно отговаря на този въпрос.'
                  : 'Nothing in the archive is close enough to answer that with confidence.'}
              </p>
            ) : null}

            {result && !result.refused && result.answer ? (
              <div className="mt-10 space-y-6">
                <p className="font-sans text-lg font-light leading-relaxed text-[#1A1A1A]">
                  {result.answer}
                </p>
                {result.citations.length > 0 ? (
                  <div>
                    <p className="mb-3 font-sans text-[11px] uppercase tracking-[0.2em] text-[#1A1A1A]/45">
                      {lang === 'bg' ? 'Източници' : 'Sources'}
                    </p>
                    <ul className="space-y-2">
                      {result.citations.map((cite) => (
                        <li key={cite.path}>
                          <Link
                            to={cite.path}
                            className="font-sans text-sm text-[#0C2686] hover:underline"
                          >
                            {lang === 'bg' ? cite.titleBg : cite.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </main>
      )}
    </JournalShell>
  )
}
