import { useForm } from 'react-hook-form'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StoryBodyEditor } from './StoryBodyEditor'
import { renderPage } from '@/test/render-page'
import type { ArticleFormValues, BodyBlock } from '@/lib/cms-types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

function EditorHarness({
  body = [{ type: 'paragraph', textBg: 'Village morning.' }],
  gallery = [],
  onDropMediaIds,
}: {
  body?: BodyBlock[]
  gallery?: Array<{ id: string; url: string; kind?: 'image' | 'video' }>
  onDropMediaIds?: (mediaIds: string[]) => void
}) {
  const form = useForm<ArticleFormValues>({
    defaultValues: { body } as ArticleFormValues,
  })
  const fields = form.watch('body').map((_, i) => ({ id: `row-${i}` }))
  return (
    <StoryBodyEditor
      form={form}
      fields={fields}
      hideFirstParagraph={false}
      gallery={gallery}
      insert={(index, value) => {
        const next = [...form.getValues('body')]
        next.splice(index, 0, value)
        form.setValue('body', next)
      }}
      update={(index, value) => {
        const next = [...form.getValues('body')]
        next[index] = value
        form.setValue('body', next)
      }}
      remove={() => undefined}
      move={() => undefined}
      onAddImages={async () => undefined}
      replaceBody={(next) => form.setValue('body', next)}
      onDropMediaIds={onDropMediaIds}
    />
  )
}

describe('StoryBodyEditor', () => {
  it('turns an empty paragraph into a pull quote', async () => {
    const user = userEvent.setup()
    renderPage(<EditorHarness body={[{ type: 'paragraph', textBg: '' }]} />)

    await user.click(screen.getByRole('button', { name: 'cms.editor.pullquote' }))
    expect(
      screen.getByRole('button', { name: 'cms.editor.changeBlockType' }),
    ).toHaveTextContent('cms.editor.pullquote')
  })

  it('inserts a note after a paragraph that already has text', async () => {
    const user = userEvent.setup()
    renderPage(<EditorHarness />)

    await user.click(screen.getByRole('button', { name: 'cms.editor.note' }))

    expect(screen.getByText('Village morning.')).toBeInTheDocument()
    const types = screen.getAllByRole('button', {
      name: 'cms.editor.changeBlockType',
    })
    expect(types).toHaveLength(2)
    expect(types[0]).toHaveTextContent('cms.editor.paragraph')
    expect(types[1]).toHaveTextContent('cms.editor.note')
  })

  it('changes a written paragraph from the type menu on that row', async () => {
    const user = userEvent.setup()
    renderPage(<EditorHarness />)

    await user.click(
      screen.getByRole('button', { name: 'cms.editor.changeBlockType' }),
    )
    await user.click(screen.getByRole('option', { name: 'cms.editor.pullquote' }))
    expect(screen.getByText('Village morning.').closest('[contenteditable]')).toHaveClass('italic')
  })

  it('shows a drag handle on paragraphs and images', () => {
    renderPage(
      <EditorHarness
        body={[
          { type: 'paragraph', textBg: 'First.' },
          {
            type: 'image',
            mediaId: 'local-1',
            url: 'https://example.com/rock.jpg',
            captionBg: 'Rocks',
          },
          { type: 'paragraph', textBg: 'After the photo.' },
        ]}
      />,
    )

    expect(screen.getAllByRole('button', { name: 'cms.editor.dragBlock' })).toHaveLength(3)
    expect(screen.getByTestId('drag-block-1')).toBeInTheDocument()
  })

  it('hides the hero image from the article body', () => {
    renderPage(
      <EditorHarness
        gallery={[{ id: 'hero', url: 'https://example.com/hero.jpg' }]}
        body={[
          { type: 'paragraph', textBg: 'Lead.' },
          {
            type: 'image',
            mediaId: 'hero',
            url: 'https://example.com/hero.jpg',
            captionBg: '',
          },
        ]}
      />,
    )

    expect(screen.queryByTestId('drag-block-1')).not.toBeInTheDocument()
    expect(screen.getByText('Lead.')).toBeInTheDocument()
  })

  it('hides the hero video from the article body', () => {
    renderPage(
      <EditorHarness
        gallery={[
          {
            id: 'hero-vid',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            kind: 'video',
          },
        ]}
        body={[
          { type: 'paragraph', textBg: 'Lead.' },
          {
            type: 'video',
            mediaId: 'hero-vid',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            captionBg: '',
          },
        ]}
      />,
    )

    expect(screen.queryByTestId('drag-block-1')).not.toBeInTheDocument()
    expect(screen.getByText('Lead.')).toBeInTheDocument()
  })

  it('shows an extra video in the article body', () => {
    renderPage(
      <EditorHarness
        gallery={[
          { id: 'hero', url: 'https://example.com/hero.jpg', kind: 'image' },
          {
            id: 'clip',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            kind: 'video',
          },
        ]}
        body={[
          { type: 'paragraph', textBg: 'Lead.' },
          {
            type: 'video',
            mediaId: 'clip',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            captionBg: 'Clip',
          },
        ]}
      />,
    )

    expect(screen.getByTestId('drag-block-1')).toBeInTheDocument()
    expect(screen.getByText('cms.editor.videoMedia')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Clip')).toBeInTheDocument()
  })

  it('shows bold italic link and list on a focused paragraph', async () => {
    const user = userEvent.setup()
    renderPage(<EditorHarness />)
    await user.click(screen.getByText('Village morning.'))
    expect(screen.getByTestId('rich-toolbar-0')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'cms.editor.formatBold' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'cms.editor.formatItalic' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'cms.editor.formatLink' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'cms.editor.formatList' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('lets the editor mark extra photos and preview a collage layout', async () => {
    const user = userEvent.setup()
    renderPage(
      <EditorHarness
        gallery={[
          { id: 'hero', url: 'https://example.com/hero.jpg' },
          { id: 'a', url: 'https://example.com/a.jpg' },
          { id: 'b', url: 'https://example.com/b.jpg' },
        ]}
        body={[
          { type: 'paragraph', textBg: 'Lead.' },
          {
            type: 'image',
            mediaId: 'a',
            url: 'https://example.com/a.jpg',
            captionBg: '',
          },
          {
            type: 'image',
            mediaId: 'b',
            url: 'https://example.com/b.jpg',
            captionBg: '',
          },
        ]}
      />,
    )

    await user.click(screen.getByTestId('collage-select-1'))
    await user.click(screen.getByTestId('collage-select-2'))
    await user.click(screen.getAllByRole('button', { name: 'cms.editor.collageCreate' })[0]!)

    expect(screen.getByTestId('story-collage-editor')).toBeInTheDocument()
    expect(screen.getByTestId('collage-layout-hero-strip')).toBeInTheDocument()
    expect(screen.getByTestId('collage-layout-portrait-pair')).toBeInTheDocument()
    expect(screen.getByTestId('collage-layout-big-stack')).toBeInTheDocument()
    expect(screen.getByTestId('collage-layout-mosaic')).toBeInTheDocument()
    expect(screen.getByTestId('collage-layout-filmstrip')).toBeInTheDocument()
    expect(screen.getByTestId('collage-layout-equal-wide')).toBeInTheDocument()
    expect(screen.getByTestId('collage-layout-equal-tall')).toBeInTheDocument()
  })

  it('asks the gallery to drop extras deleted from the body', async () => {
    const user = userEvent.setup()
    const onDropMediaIds = vi.fn()
    renderPage(
      <EditorHarness
        onDropMediaIds={onDropMediaIds}
        gallery={[
          { id: 'hero', url: 'https://example.com/hero.jpg' },
          { id: 'a', url: 'https://example.com/a.jpg' },
        ]}
        body={[
          { type: 'paragraph', textBg: 'Lead.' },
          {
            type: 'image',
            mediaId: 'a',
            url: 'https://example.com/a.jpg',
            captionBg: '',
          },
        ]}
      />,
    )

    const removes = screen.getAllByRole('button', { name: 'cms.editor.removeBlock' })
    await user.click(removes[1]!)
    expect(onDropMediaIds).toHaveBeenCalledWith(['a'])
  })
})
