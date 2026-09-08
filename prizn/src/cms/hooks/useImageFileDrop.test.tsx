import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useImageFileDrop } from './useImageFileDrop'

function DropHarness({
  disabled,
  onImages,
}: {
  disabled?: boolean
  onImages: (files: File[]) => void
}) {
  const drop = useImageFileDrop({ disabled, onImages })
  return (
    <div data-testid="zone" {...drop.props}>
      {drop.active ? 'hover' : 'idle'}
    </div>
  )
}

describe('useImageFileDrop', () => {
  it('highlights on file drag and passes image files on drop', () => {
    const onImages = vi.fn()
    render(<DropHarness onImages={onImages} />)
    const zone = screen.getByTestId('zone')
    const file = new File(['img'], 'hero.jpg', { type: 'image/jpeg' })
    const dataTransfer = {
      files: [file],
      items: [{ kind: 'file', type: file.type, getAsFile: () => file }],
      types: ['Files'],
      dropEffect: 'copy',
    }

    fireEvent.dragEnter(zone, { dataTransfer })
    expect(screen.getByText('hover')).toBeInTheDocument()

    fireEvent.drop(zone, { dataTransfer })
    expect(onImages).toHaveBeenCalledWith([file])
    expect(screen.getByText('idle')).toBeInTheDocument()
  })

  it('ignores drops while disabled', () => {
    const onImages = vi.fn()
    render(<DropHarness disabled onImages={onImages} />)
    fireEvent.drop(screen.getByTestId('zone'), {
      dataTransfer: {
        files: [new File(['img'], 'hero.jpg', { type: 'image/jpeg' })],
        types: ['Files'],
      },
    })
    expect(onImages).not.toHaveBeenCalled()
  })
})
