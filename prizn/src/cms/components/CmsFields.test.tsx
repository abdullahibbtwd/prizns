import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  CmsCheckbox,
  CmsField,
  CmsInput,
  CmsLabel,
  CmsRadio,
  CmsTextarea,
} from './CmsFields'

describe('CmsFields', () => {
  it('renders labeled inputs', () => {
    render(
      <CmsField label="Title" htmlFor="title">
        <CmsInput id="title" defaultValue="Story" />
      </CmsField>,
    )
    expect(screen.getByLabelText('Title')).toHaveValue('Story')
  })

  it('renders textarea and standalone label', () => {
    render(
      <>
        <CmsLabel htmlFor="body">Body</CmsLabel>
        <CmsTextarea id="body" defaultValue="Paragraph" />
      </>,
    )
    expect(screen.getByLabelText('Body')).toHaveValue('Paragraph')
  })

  it('toggles radio and checkbox choices', async () => {
    const user = userEvent.setup()
    const onRadio = vi.fn()
    const onCheck = vi.fn()

    render(
      <>
        <CmsRadio
          checked={false}
          onChange={onRadio}
          label="Published"
          description="Live on site"
        />
        <CmsCheckbox checked={false} onChange={onCheck} label="Featured" />
      </>,
    )

    expect(screen.getByText('Published')).toBeInTheDocument()
    expect(screen.getByText('Live on site')).toBeInTheDocument()

    await user.click(screen.getByRole('radio'))
    await user.click(screen.getByRole('checkbox'))
    expect(onRadio).toHaveBeenCalled()
    expect(onCheck).toHaveBeenCalled()
  })
})
