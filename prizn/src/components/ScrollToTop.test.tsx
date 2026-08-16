import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ScrollToTop } from './ScrollToTop'

describe('ScrollToTop', () => {
  it('scrolls to the top on a new location', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    render(
      <MemoryRouter initialEntries={['/stories']}>
        <ScrollToTop />
        <Routes>
          <Route path="/stories" element={<div>Stories</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
    scrollTo.mockRestore()
  })
})
