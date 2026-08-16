import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useSearchParams } from 'react-router-dom'
import { renderPage } from '@/test/render-page'
import { ListingFilters } from './ListingFilters'
import { patchListingParams } from '@/lib/listing-filters'

function FilterHarness() {
  const [params, setParams] = useSearchParams()
  return (
    <>
      <div data-testid="qs">{params.toString()}</div>
      <ListingFilters
        lang="en"
        location={{
          value: params.get('location') || '',
          options: [{ value: 'vidin', label: 'Vidin' }],
          onChange: (value) =>
            setParams(patchListingParams(params, { location: value })),
        }}
        topic={{
          value: params.get('topic') || '',
          options: [{ value: 'test', label: 'test' }],
          onChange: (value) =>
            setParams(patchListingParams(params, { topic: value })),
        }}
      />
    </>
  )
}

describe('ListingFilters', () => {
  it('writes filters to the URL and keeps earlier ones', async () => {
    const user = userEvent.setup()
    renderPage(<FilterHarness />, { route: '/stories' })

    await user.click(screen.getAllByRole('button', { name: 'All' })[0]!)
    await user.click(screen.getByRole('option', { name: 'Vidin' }))
    expect(screen.getByTestId('qs')).toHaveTextContent('location=vidin')

    await user.click(screen.getAllByRole('button', { name: 'All' })[0]!)
    await user.click(screen.getByRole('option', { name: 'test' }))
    expect(screen.getByTestId('qs').textContent).toContain('location=vidin')
    expect(screen.getByTestId('qs').textContent).toContain('topic=test')
  })
})

describe('patchListingParams', () => {
  it('drops empty values and the old view flag', () => {
    const current = new URLSearchParams('view=series&location=vidin')
    const next = patchListingParams(current, { location: '', topic: 'test' })
    expect(next.get('view')).toBeNull()
    expect(next.get('location')).toBeNull()
    expect(next.get('topic')).toBe('test')
  })
})
