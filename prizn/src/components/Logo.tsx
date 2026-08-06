import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  showSlogan?: boolean
  sloganClassName?: string
}

export function Logo({
  className,
  showSlogan = true,
  sloganClassName,
}: LogoProps) {
  return (
    <span className="inline-flex flex-col items-center">
      <img
        src="/prizni.svg"
        alt="Prizni"
        className={cn('h-8 w-auto md:h-9', className)}
      />
      {showSlogan && (
        <span
          className={cn(
            'mt-0.5 text-center font-script text-[11px] font-normal leading-[0.95] tracking-[0.02em] text-brand md:text-xs',
            sloganClassName,
          )}
        >
          Неразказаните истории
          <br />
          на Северозапада
        </span>
      )}
    </span>
  )
}
