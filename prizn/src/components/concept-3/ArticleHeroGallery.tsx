import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export type HeroSlide = {
  id: string
  url: string
  creditBg?: string | null
}

export function articleHeroSlides(input: {
  image?: string
  photoCreditBg?: string
  gallery?: Array<{ id: string; url: string; creditBg?: string | null }>
}): HeroSlide[] {
  const slides: HeroSlide[] = []
  const seen = new Set<string>()

  const push = (slide: HeroSlide) => {
    const url = slide.url.trim()
    if (!url || seen.has(url)) return
    seen.add(url)
    slides.push({ ...slide, url })
  }

  if (input.image?.trim()) {
    push({
      id: 'hero',
      url: input.image,
      creditBg: input.photoCreditBg || null,
    })
  }
  for (const item of input.gallery ?? []) {
    push(item)
  }
  return slides
}

export function ArticleHeroGallery({
  slides,
  title,
}: {
  slides: HeroSlide[]
  title: string
}) {
  const { t } = useTranslation()
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (slides.length === 0) {
      setActive(0)
      return
    }
    setActive((prev) => Math.min(prev, slides.length - 1))
  }, [slides.length])

  if (slides.length === 0) return null

  const current = slides[active] ?? slides[0]!
  const hasMany = slides.length > 1

  const goPrev = () => {
    setActive((prev) => (prev <= 0 ? slides.length - 1 : prev - 1))
  }
  const goNext = () => {
    setActive((prev) => (prev >= slides.length - 1 ? 0 : prev + 1))
  }

  return (
    <div className="mb-14">
      <div
        className="relative aspect-[16/10] w-full overflow-hidden rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.04)]"
        tabIndex={hasMany ? 0 : undefined}
        onKeyDown={(event) => {
          if (!hasMany) return
          if (event.key === 'ArrowLeft') {
            event.preventDefault()
            goPrev()
          }
          if (event.key === 'ArrowRight') {
            event.preventDefault()
            goNext()
          }
        }}
      >
        <img
          src={current.url}
          alt={title}
          className="h-full w-full object-cover"
        />
        {current.creditBg ? (
          <div className="absolute bottom-3 right-4 rounded bg-black/40 px-2.5 py-1 font-sans text-[10px] uppercase tracking-widest text-white/80 backdrop-blur-md">
            {current.creditBg}
          </div>
        ) : null}
        {hasMany ? (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/95 text-[#1A1A1A] shadow-md transition hover:text-[#0C2686] print:hidden"
              aria-label={t('prevPhoto')}
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/95 text-[#1A1A1A] shadow-md transition hover:text-[#0C2686] print:hidden"
              aria-label={t('nextPhoto')}
            >
              <ChevronRight className="size-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 font-sans text-[11px] font-semibold text-white print:hidden">
              {t('photoOf', { current: active + 1, total: slides.length })}
            </div>
          </>
        ) : null}
      </div>

      {hasMany ? (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6 print:hidden">
          {slides.map((slide, index) => {
            const selected = index === active
            return (
              <button
                key={slide.id}
                type="button"
                onClick={() => setActive(index)}
                aria-label={t('photoOf', {
                  current: index + 1,
                  total: slides.length,
                })}
                aria-current={selected ? 'true' : undefined}
                className={`overflow-hidden rounded-[10px] border-2 transition ${
                  selected
                    ? 'border-[#0C2686]'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={slide.url}
                  alt=""
                  className="aspect-[4/3] h-full w-full object-cover"
                />
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
