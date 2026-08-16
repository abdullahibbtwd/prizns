import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppProviders } from './AppProviders'

describe('AppProviders', () => {
  it('wraps children with query and helmet providers', () => {
    render(
      <AppProviders>
        <div>child content</div>
      </AppProviders>,
    )
    expect(screen.getByText('child content')).toBeInTheDocument()
  })
})
