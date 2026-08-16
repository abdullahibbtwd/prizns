import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CmsModal } from './CmsModal'

describe('CmsModal', () => {
  it('renders nothing when closed', () => {
    render(
      <CmsModal open={false} onClose={() => {}} title="Hidden">
        Body
      </CmsModal>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows title, description, and children when open', () => {
    render(
      <CmsModal
        open
        onClose={() => {}}
        title="Edit tag"
        description="Update the Bulgarian name"
      >
        <p>Form fields</p>
      </CmsModal>,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Edit tag')).toBeInTheDocument()
    expect(screen.getByText('Update the Bulgarian name')).toBeInTheDocument()
    expect(screen.getByText('Form fields')).toBeInTheDocument()
  })

  it('closes on overlay click and Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <CmsModal open onClose={onClose} title="Close me">
        Body
      </CmsModal>,
    )

    await user.click(screen.getAllByLabelText('Close')[0]!)
    expect(onClose).toHaveBeenCalled()

    onClose.mockClear()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})
