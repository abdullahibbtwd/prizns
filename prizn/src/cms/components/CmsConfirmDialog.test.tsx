import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CmsConfirmDialog } from './CmsConfirmDialog'

describe('CmsConfirmDialog', () => {
  it('renders nothing when closed', () => {
    render(
      <CmsConfirmDialog
        open={false}
        onClose={() => {}}
        onConfirm={() => {}}
        title="Delete story"
      />,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('confirms and cancels from the dialog', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onConfirm = vi.fn()
    render(
      <CmsConfirmDialog
        open
        onClose={onClose}
        onConfirm={onConfirm}
        title="Delete story"
        description="This cannot be undone."
        confirmLabel="cms.common.delete"
        cancelLabel="cms.common.cancel"
      />,
    )

    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'cms.common.cancel' }))
    expect(onClose).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'cms.common.delete' }))
    expect(onConfirm).toHaveBeenCalled()
  })
})
