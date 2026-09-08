import { sanitizeRichText, richTextIsEmpty } from '@/lib/rich-text'
import { cn } from '@/lib/utils'

export function RichText({
  html,
  as: Tag = 'div',
  className,
}: {
  html: string
  as?: 'p' | 'div' | 'span'
  className?: string
}) {
  const safe = sanitizeRichText(html)
  if (richTextIsEmpty(safe)) return null
  const isList = /^\s*<(ul|ol)\b/i.test(safe)
  const Render = isList ? 'div' : Tag
  return (
    <Render
      className={cn('rich-text', className)}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  )
}
