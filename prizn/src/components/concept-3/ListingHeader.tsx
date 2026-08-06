import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ListingHeaderProps {
  lang: 'bg' | 'en'
  eyebrow: string
  title: string
  description: string
  countLabel?: string
  tone?: 'light' | 'dark'
}

export function ListingHeader({
  lang,
  eyebrow,
  title,
  description,
  countLabel,
  tone = 'light',
}: ListingHeaderProps) {
  const dark = tone === 'dark'
  const navigate = useNavigate()

  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1)
      return
    }
    navigate('/')
  }

  return (
    <header
      className={cn(
        'px-6 pb-12 pt-32 md:px-12 md:pb-16 md:pt-36',
        dark ? 'border-b border-white/10' : 'border-b border-[#EAE6DF]',
      )}
    >
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={goBack}
          className={cn(
            'mb-8 inline-flex items-center gap-2 font-sans text-[11px] uppercase tracking-[0.22em] transition-colors',
            dark
              ? 'text-white/50 hover:text-white'
              : 'text-[#1A1A1A]/50 hover:text-[#0C2686]',
          )}
        >
          <ArrowLeft className="size-3.5" />
          {lang === 'bg' ? 'Назад' : 'Back'}
        </button>

        <p
          className={cn(
            'font-sans text-xs font-medium uppercase tracking-[0.3em]',
            dark ? 'text-[#9FACE6]' : 'text-[#0C2686]',
          )}
        >
          {eyebrow}
        </p>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <h1
            className={cn(
              'font-heading text-4xl font-light tracking-tight md:text-6xl',
              dark ? 'text-white' : 'text-[#1A1A1A]',
            )}
          >
            {title}
          </h1>
          {countLabel && (
            <span
              className={cn(
                'font-sans text-xs uppercase tracking-[0.2em]',
                dark ? 'text-white/40' : 'text-[#1A1A1A]/45',
              )}
            >
              {countLabel}
            </span>
          )}
        </div>
        <p
          className={cn(
            'mt-5 max-w-2xl font-sans text-sm font-light leading-relaxed md:text-base',
            dark ? 'text-white/55' : 'text-[#1A1A1A]/60',
          )}
        >
          {description}
        </p>
      </div>
    </header>
  )
}

