import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import { HelmetProvider } from 'react-helmet-async'
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom'

type PageRenderOptions = RenderOptions & {
  route?: string
  routerProps?: MemoryRouterProps
}

export function renderPage(ui: React.ReactElement, options: PageRenderOptions = {}) {
  const { route = '/', routerProps, ...renderOptions } = options
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[route]} {...routerProps}>
          {ui}
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
    renderOptions,
  )
}
