import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { Bold, Italic, Link2, List } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  closestAnchor,
  enterInlineMark,
  rangeIsUsable,
  readSelectionMarks,
  splitAndExitMark,
  unlinkRange,
  wrapRangeWithLink,
  type SelectionMarks,
} from '@/lib/rich-text-range'
import {
  normalizeHref,
  richTextIsEmpty,
  sanitizeRichText,
} from '@/lib/rich-text'
import { cn } from '@/lib/utils'

const EMPTY_MARKS: SelectionMarks = {
  bold: false,
  italic: false,
  link: false,
  list: false,
}

function selectionInside(root: HTMLElement | null): boolean {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || !root) return false
  const node = sel.anchorNode
  return Boolean(node && root.contains(node))
}

function saveSelection(): Range | null {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return null
  return sel.getRangeAt(0).cloneRange()
}

function restoreSelection(range: Range | null) {
  if (!range) return
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

function splitAtCaret(root: HTMLElement): { before: string; after: string } {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || !root.contains(sel.anchorNode)) {
    return { before: root.innerHTML, after: '' }
  }
  const range = sel.getRangeAt(0)
  range.deleteContents()
  const afterRange = document.createRange()
  afterRange.selectNodeContents(root)
  afterRange.setStart(range.endContainer, range.endOffset)
  const fragment = afterRange.extractContents()
  const holder = document.createElement('div')
  holder.appendChild(fragment)
  return {
    before: sanitizeRichText(root.innerHTML),
    after: sanitizeRichText(holder.innerHTML),
  }
}

function closestListItem(root: HTMLElement): HTMLElement | null {
  const sel = window.getSelection()
  const node = sel?.anchorNode
  if (!node || !root.contains(node)) return null
  const el = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement
  return el?.closest('li') ?? null
}

function listItemIsEmpty(li: HTMLElement): boolean {
  return richTextIsEmpty(li.innerHTML)
}

function disableStyleWithCss() {
  try {
    document.execCommand('styleWithCSS', false, 'false')
  } catch {
    /* some browsers throw */
  }
}

export function StoryRichTextField({
  value,
  index,
  placeholder,
  className,
  splitOnEnter = true,
  onChange,
  onFocus,
  onSplit,
  onEmptyBackspace,
  onPasteChunks,
}: {
  value: string
  index: number
  placeholder: string
  className?: string
  splitOnEnter?: boolean
  onChange: (html: string) => void
  onFocus: () => void
  onSplit?: (afterHtml: string) => void
  onEmptyBackspace?: () => void
  onPasteChunks?: (chunks: string[]) => void
}) {
  const { t } = useTranslation()
  const wrapRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const linkInputRef = useRef<HTMLInputElement>(null)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastHtml = useRef(value)
  const savedRange = useRef<Range | null>(null)
  const holdMarks = useRef(false)
  const linkOpenRef = useRef(false)
  const [focused, setFocused] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [editingExistingLink, setEditingExistingLink] = useState(false)
  const [marks, setMarks] = useState<SelectionMarks>(EMPTY_MARKS)

  linkOpenRef.current = linkOpen

  useEffect(() => {
    return () => {
      if (blurTimer.current) clearTimeout(blurTimer.current)
    }
  }, [])

  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    // Never rewrite the live editor — that moves the caret.
    if (document.activeElement === el) {
      lastHtml.current = value
      return
    }
    if (el.innerHTML === (value || '')) {
      lastHtml.current = value
      return
    }
    el.innerHTML = value || ''
    lastHtml.current = value
  }, [value])

  const syncMarks = () => {
    const el = rootRef.current
    if (!el || holdMarks.current) return
    setMarks(readSelectionMarks(el))
  }

  useEffect(() => {
    if (!focused) {
      setMarks(EMPTY_MARKS)
      return
    }
    const onSelectionChange = () => {
      const el = rootRef.current
      if (!el) return
      if (selectionInside(el) && !linkOpenRef.current) {
        savedRange.current = saveSelection()
      }
      if (!holdMarks.current) syncMarks()
    }
    document.addEventListener('selectionchange', onSelectionChange)
    syncMarks()
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [focused])

  useEffect(() => {
    if (!linkOpen) return
    linkInputRef.current?.focus()
    linkInputRef.current?.select()
  }, [linkOpen])

  const emit = (next = rootRef.current?.innerHTML ?? '') => {
    const safe = sanitizeRichText(next)
    lastHtml.current = safe
    onChange(safe)
    return safe
  }

  const keepSelection = (event: MouseEvent) => {
    event.preventDefault()
    if (selectionInside(rootRef.current)) {
      savedRange.current = saveSelection()
    }
  }

  const usableRange = () => {
    const el = rootRef.current
    if (!el) return null
    if (rangeIsUsable(savedRange.current, el)) return savedRange.current
    if (selectionInside(el)) {
      savedRange.current = saveSelection()
      return savedRange.current
    }
    return null
  }

  const run = (command: string) => {
    const el = rootRef.current
    if (!el) return
    holdMarks.current = true
    disableStyleWithCss()
    el.focus()
    restoreSelection(usableRange())
    const before = readSelectionMarks(el)
    const collapsed = window.getSelection()?.isCollapsed ?? true

    if (command === 'bold' || command === 'italic') {
      const wasOn = command === 'bold' ? before.bold : before.italic
      const selector = command === 'bold' ? 'b, strong' : 'i, em'
      const tag = command === 'bold' ? 'strong' : 'em'
      if (collapsed && wasOn) {
        splitAndExitMark(el, selector)
      } else if (collapsed && !wasOn) {
        document.execCommand(command)
        const now = readSelectionMarks(el)
        const nowOn = command === 'bold' ? now.bold : now.italic
        if (!nowOn) enterInlineMark(el, tag)
      } else {
        document.execCommand(command)
      }
      const next = {
        ...before,
        bold: command === 'bold' ? !wasOn : before.bold,
        italic: command === 'italic' ? !wasOn : before.italic,
      }
      setMarks(next)
    } else if (command === 'insertUnorderedList') {
      document.execCommand(command)
      setMarks({ ...before, list: !before.list })
    } else {
      holdMarks.current = false
      document.execCommand(command)
    }

    emit(el.innerHTML)
    savedRange.current = saveSelection()
  }

  const openLink = () => {
    const el = rootRef.current
    const range = usableRange()
    if (range) savedRange.current = range
    const anchor =
      el && range ? closestAnchor(range.startContainer, el) : null
    setLinkUrl(anchor?.getAttribute('href') ?? '')
    setEditingExistingLink(Boolean(anchor))
    setLinkOpen((open) => {
      if (open) {
        setEditingExistingLink(false)
        return false
      }
      return true
    })
  }

  const applyLink = () => {
    const el = rootRef.current
    const range = usableRange()
    if (!el || !range) return
    const href = normalizeHref(linkUrl)
    if (!href) {
      unlinkRange(range, el)
    } else {
      wrapRangeWithLink(range, href, el)
    }
    emit(el.innerHTML)
    savedRange.current = saveSelection()
    setLinkOpen(false)
    setLinkUrl('')
    setEditingExistingLink(false)
    el.focus()
    restoreSelection(savedRange.current)
    syncMarks()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const el = rootRef.current
    if (!el) return
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
      event.preventDefault()
      run('bold')
      return
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'i') {
      event.preventDefault()
      run('italic')
      return
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      savedRange.current = saveSelection()
      openLink()
      return
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      const li = closestListItem(el)
      if (li && !listItemIsEmpty(li)) return
      if (li && listItemIsEmpty(li)) {
        event.preventDefault()
        li.remove()
        emit(el.innerHTML)
        onSplit?.('')
        return
      }
      if (!splitOnEnter) return
      event.preventDefault()
      const { before, after } = splitAtCaret(el)
      el.innerHTML = before
      emit(before)
      onSplit?.(after)
      return
    }
    if (event.key !== 'Backspace') return
    const sel = window.getSelection()
    if (!sel || !sel.isCollapsed) return
    const range = sel.getRangeAt(0)
    if (range.startOffset !== 0) return
    if (!richTextIsEmpty(el.innerHTML)) return
    event.preventDefault()
    onEmptyBackspace?.()
  }

  return (
    <div ref={wrapRef} className="space-y-1">
      {focused ? (
        <div
          className="space-y-1"
          data-testid={`rich-toolbar-${index}`}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex flex-wrap items-center gap-1">
            <FormatButton
              label={t('cms.editor.formatBold')}
              pressed={marks.bold}
              onMouseDown={keepSelection}
              onClick={() => run('bold')}
            >
              <Bold className="size-3.5" />
            </FormatButton>
            <FormatButton
              label={t('cms.editor.formatItalic')}
              pressed={marks.italic}
              onMouseDown={keepSelection}
              onClick={() => run('italic')}
            >
              <Italic className="size-3.5" />
            </FormatButton>
            <FormatButton
              label={t('cms.editor.formatLink')}
              pressed={marks.link || linkOpen}
              onMouseDown={keepSelection}
              onClick={openLink}
            >
              <Link2 className="size-3.5" />
            </FormatButton>
            <FormatButton
              label={t('cms.editor.formatList')}
              pressed={marks.list}
              onMouseDown={keepSelection}
              onClick={() => run('insertUnorderedList')}
            >
              <List className="size-3.5" />
            </FormatButton>
          </div>
          {linkOpen ? (
            <div className="flex min-w-[12rem] items-center gap-1">
              <input
                ref={linkInputRef}
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    event.stopPropagation()
                    applyLink()
                    return
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    setLinkOpen(false)
                    setEditingExistingLink(false)
                    rootRef.current?.focus()
                    restoreSelection(savedRange.current)
                  }
                }}
                placeholder={t('cms.editor.linkPlaceholder')}
                className="h-7 min-w-0 flex-1 border border-[#E8E4DC] bg-white px-2 text-xs outline-none focus:border-[#0C2686]"
                aria-label={t('cms.editor.formatLink')}
              />
              <button
                type="button"
                className="h-7 px-2 text-[10px] font-semibold uppercase tracking-wider text-[#0C2686]"
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  applyLink()
                }}
              >
                {t('cms.editor.linkApply')}
              </button>
              {editingExistingLink || marks.link ? (
                <button
                  type="button"
                  className="h-7 px-2 text-[10px] font-semibold uppercase tracking-wider text-stone-500"
                  onMouseDown={keepSelection}
                  onClick={() => {
                    const el = rootRef.current
                    const range = usableRange()
                    if (!el || !range) return
                    unlinkRange(range, el)
                    emit(el.innerHTML)
                    setLinkOpen(false)
                    setLinkUrl('')
                    setEditingExistingLink(false)
                    el.focus()
                    syncMarks()
                  }}
                >
                  {t('cms.editor.formatUnlink')}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      <div
        ref={rootRef}
        data-body-index={index}
        data-placeholder={placeholder}
        role="textbox"
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        className={cn(
          'rich-editor min-h-[2.5rem] w-full bg-transparent text-sm leading-relaxed outline-none empty:before:pointer-events-none empty:before:text-stone-400 empty:before:content-[attr(data-placeholder)]',
          '[&_a]:text-[#0C2686] [&_a]:underline [&_strong]:font-semibold [&_em]:italic [&_b]:font-semibold [&_i]:italic',
          '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
          className,
        )}
        onFocus={() => {
          setFocused(true)
          onFocus()
        }}
        onBlur={() => {
          if (blurTimer.current) clearTimeout(blurTimer.current)
          blurTimer.current = setTimeout(() => {
            if (wrapRef.current?.contains(document.activeElement)) return
            setFocused(false)
            setLinkOpen(false)
            setEditingExistingLink(false)
            const el = rootRef.current
            if (!el) return
            const safe = sanitizeRichText(el.innerHTML)
            if (el.innerHTML !== safe) el.innerHTML = safe
            emit(safe)
          }, 0)
        }}
        onInput={() => {
          holdMarks.current = false
          emit()
          syncMarks()
        }}
        onKeyUp={(event) => {
          if (
            event.key === 'ArrowLeft' ||
            event.key === 'ArrowRight' ||
            event.key === 'ArrowUp' ||
            event.key === 'ArrowDown' ||
            event.key === 'Home' ||
            event.key === 'End'
          ) {
            holdMarks.current = false
          }
          syncMarks()
        }}
        onMouseUp={() => {
          holdMarks.current = false
          if (selectionInside(rootRef.current)) {
            savedRange.current = saveSelection()
          }
          syncMarks()
        }}
        onKeyDown={onKeyDown}
        onPaste={(event) => {
          const text = event.clipboardData.getData('text/plain')
          const chunks = text
            .replace(/\r\n/g, '\n')
            .split(/\n\s*\n/)
            .map((chunk) => chunk.replace(/\n+/g, ' ').trim())
            .filter(Boolean)
          if (chunks.length > 1 && onPasteChunks) {
            event.preventDefault()
            onPasteChunks(chunks)
            return
          }
          event.preventDefault()
          document.execCommand('insertText', false, text)
          emit()
        }}
      />
    </div>
  )
}

function FormatButton({
  label,
  pressed,
  children,
  onMouseDown,
  onClick,
}: {
  label: string
  pressed?: boolean
  children: ReactNode
  onMouseDown: (event: MouseEvent) => void
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed ? 'true' : 'false'}
      title={label}
      onMouseDown={onMouseDown}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onClick()
      }}
      className={cn(
        'inline-flex size-7 items-center justify-center rounded-md border',
        pressed
          ? 'border-[#0C2686] bg-[#0C2686] text-white'
          : 'border-[#E8E4DC] bg-white text-stone-600 hover:border-[#0C2686] hover:text-[#0C2686]',
      )}
    >
      {children}
    </button>
  )
}
