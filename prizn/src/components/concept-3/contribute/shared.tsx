import type { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { motion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export { JournalSelect } from '@/components/ui/JournalSelect'
export type { JournalSelectOption } from '@/components/ui/JournalSelect'

interface ContributeHeroProps {
  lang: 'bg' | 'en'
  eyebrow: string
  eyebrowBg: string
  title: string
  titleBg: string
  subtitle: string
  subtitleBg: string
  cta: string
  ctaBg: string
  ctaHref: string
  image: string
}

export function ContributeHero({
  lang,
  eyebrow,
  eyebrowBg,
  title,
  titleBg,
  subtitle,
  subtitleBg,
  cta,
  ctaBg,
  ctaHref,
  image,
}: ContributeHeroProps) {
  const scrollToCta = () => {
    const id = ctaHref.startsWith('#') ? ctaHref.slice(1) : null
    if (!id) return
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative flex h-screen w-full flex-col items-center justify-between overflow-hidden px-6 py-12 text-white md:py-16">
      <motion.div
        initial={{ scale: 1.05 }}
        animate={{ scale: 1 }}
        transition={{ duration: 10, ease: 'easeOut' }}
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${image})` }}
      />

      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/50 via-black/35 to-black/70" />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.2 }}
        className="relative z-10 pt-16 text-center md:pt-12"
      >
        <span className="font-sans text-[11px] font-medium uppercase tracking-[0.35em] text-white/80">
          {lang === 'bg' ? eyebrowBg : eyebrow}
        </span>
      </motion.div>

      <div className="relative z-10 mx-auto my-auto max-w-4xl px-4 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.4 }}
          className="font-heading text-4xl font-normal leading-[1.08] tracking-tight text-white drop-shadow-sm sm:text-6xl md:text-7xl lg:text-[80px]"
        >
          {lang === 'bg' ? titleBg : title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="mx-auto mt-6 max-w-2xl font-sans text-sm font-light leading-relaxed text-white/80 md:text-base"
        >
          {lang === 'bg' ? subtitleBg : subtitle}
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 1 }}
        className="relative z-10 pb-6 text-center md:pb-8"
      >
        <button
          type="button"
          onClick={scrollToCta}
          className="group inline-flex cursor-pointer items-center gap-3 rounded-full border border-white/30 px-7 py-3.5 font-sans text-xs uppercase tracking-[0.3em] text-white/90 backdrop-blur-xs transition-all duration-300 hover:border-white hover:bg-white/10 hover:text-white"
        >
          <span>{lang === 'bg' ? ctaBg : cta}</span>
          <ArrowDown className="size-3.5 stroke-[1.5] transition-transform duration-300 group-hover:translate-y-1" />
        </button>
      </motion.div>
    </section>
  )
}

export function SectionShell({
  id,
  children,
  className,
}: {
  id?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      id={id}
      className={cn(
        'border-t border-[#EAE6DF] bg-[#FDFBF7] px-6 py-20 md:px-12 md:py-28',
        className,
      )}
    >
      <div className="mx-auto max-w-7xl">{children}</div>
    </section>
  )
}

export function SectionIntro({
  lang,
  eyebrow,
  eyebrowBg,
  title,
  titleBg,
  text,
  textBg,
  center = false,
}: {
  lang: 'bg' | 'en'
  eyebrow: string
  eyebrowBg: string
  title: string
  titleBg: string
  text?: string
  textBg?: string
  center?: boolean
}) {
  return (
    <div className={center ? 'mx-auto mb-14 max-w-2xl text-center' : 'mb-14 max-w-2xl'}>
      <p className="font-sans text-xs font-medium uppercase tracking-[0.3em] text-[#0C2686]">
        {lang === 'bg' ? eyebrowBg : eyebrow}
      </p>
      <h2 className="mt-3 font-heading text-3xl font-light tracking-tight text-[#1A1A1A] md:text-5xl">
        {lang === 'bg' ? titleBg : title}
      </h2>
      {text && (
        <p className="mt-4 font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/60 md:text-base">
          {lang === 'bg' ? textBg : text}
        </p>
      )}
    </div>
  )
}

export function ProcessSteps({
  lang,
  steps,
}: {
  lang: 'bg' | 'en'
  steps: { en: string; bg: string }[]
}) {
  return (
    <div className="flex flex-col gap-0 md:flex-row md:items-start md:justify-between">
      {steps.map((step, index) => (
        <div key={step.en} className="relative flex flex-1 flex-col items-start md:items-center md:text-center">
          {index < steps.length - 1 && (
            <div
              className="absolute left-4 top-10 hidden h-px w-full bg-[#EAE6DF] md:block"
              aria-hidden
            />
          )}
          <div className="relative z-10 mb-4 flex size-8 items-center justify-center rounded-full border border-[#0C2686]/25 bg-[#FDFBF7] font-sans text-[11px] text-[#0C2686]">
            {index + 1}
          </div>
          <p className="max-w-[140px] font-heading text-xl font-normal text-[#1A1A1A] md:text-2xl">
            {lang === 'bg' ? step.bg : step.en}
          </p>
          {index < steps.length - 1 && (
            <div className="my-4 ml-3.5 h-8 w-px bg-[#EAE6DF] md:hidden" aria-hidden />
          )}
        </div>
      ))}
    </div>
  )
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-2 block font-sans text-[11px] font-medium uppercase tracking-[0.18em] text-[#1A1A1A]/55">
      {children}
    </label>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'w-full border-b border-[#1A1A1A]/15 bg-transparent py-3 font-sans text-sm text-[#1A1A1A] outline-none transition-colors placeholder:text-[#1A1A1A]/30 focus:border-[#0C2686]',
        props.className,
      )}
    />
  )
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        'w-full resize-y border border-[#EAE6DF] bg-white px-4 py-3 font-sans text-sm text-[#1A1A1A] outline-none transition-colors placeholder:text-[#1A1A1A]/30 focus:border-[#0C2686]',
        props.className,
      )}
    />
  )
}
