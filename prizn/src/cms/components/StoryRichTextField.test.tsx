import { useState, type FormEvent } from 'react'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StoryRichTextField } from './StoryRichTextField'
import { renderPage } from '@/test/render-page'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

function selectAll(el: HTMLElement) {
  el.focus()
  const range = document.createRange()
  range.selectNodeContents(el)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

function Harness({
  initial = 'Village morning.',
  onSubmit,
}: {
  initial?: string
  onSubmit?: (event: FormEvent) => void
}) {
  const [value, setValue] = useState(initial)
  return (
    <form onSubmit={onSubmit}>
      <StoryRichTextField
        value={value}
        index={0}
        placeholder="Write"
        onChange={setValue}
        onFocus={() => undefined}
      />
    </form>
  )
}

describe('StoryRichTextField', () => {
  it('shows bold as pressed when the selection is already bold', async () => {
    const user = userEvent.setup()
    renderPage(<Harness initial="<strong>Village morning.</strong>" />)
    const editor = screen.getByRole('textbox')
    await user.click(editor)
    selectAll(editor)
    document.dispatchEvent(new Event('selectionchange'))
    expect(
      screen.getByRole('button', { name: 'cms.editor.formatBold' }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('unpresses bold immediately when clicked at the end of bold text', async () => {
    const user = userEvent.setup()
    renderPage(<Harness initial="<strong>Village morning.</strong>" />)
    const editor = screen.getByRole('textbox')
    await user.click(editor)
    const strong = editor.querySelector('strong')
    const text = strong?.firstChild as Text
    const range = document.createRange()
    range.setStart(text, text.length)
    range.collapse(true)
    const sel = window.getSelection()!
    sel.removeAllRanges()
    sel.addRange(range)
    document.dispatchEvent(new Event('selectionchange'))
    const bold = screen.getByRole('button', { name: 'cms.editor.formatBold' })
    expect(bold).toHaveAttribute('aria-pressed', 'true')
    await user.click(bold)
    expect(bold).toHaveAttribute('aria-pressed', 'false')
  })

  it('turns highlighted words into a hyperlink', async () => {
    const user = userEvent.setup()
    renderPage(<Harness />)
    const editor = screen.getByRole('textbox')
    await user.click(editor)
    selectAll(editor)
    await user.click(screen.getByRole('button', { name: 'cms.editor.formatLink' }))
    const url = await screen.findByPlaceholderText('cms.editor.linkPlaceholder')
    await user.clear(url)
    await user.type(url, 'prizn.bg')
    await user.click(screen.getByRole('button', { name: 'cms.editor.linkApply' }))
    const link = editor.querySelector('a')
    expect(link).toBeTruthy()
    expect(link).toHaveAttribute('href', 'https://prizn.bg')
    expect(link).toHaveTextContent('Village morning.')
  })

  it('does not submit a parent form when applying a link', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn((event: FormEvent) => event.preventDefault())
    renderPage(<Harness onSubmit={onSubmit} />)
    const editor = screen.getByRole('textbox')
    await user.click(editor)
    selectAll(editor)
    await user.click(screen.getByRole('button', { name: 'cms.editor.formatLink' }))
    const url = await screen.findByPlaceholderText('cms.editor.linkPlaceholder')
    await user.type(url, 'prizn.bg{Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(editor.querySelector('a')).toHaveAttribute('href', 'https://prizn.bg')
  })
})
