import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderPage } from '@/test/render-page'
import CmsDashboard from './Dashboard'

const { authUser } = vi.hoisted(() => ({
  authUser: {
    name: 'Ada Editor',
    email: 'ada@prizni.bg',
    role: 'EDITOR' as string,
    roles: ['EDITOR'] as string[],
  },
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: authUser,
    loading: false,
  }),
}))

const getDashboardChecklist = vi.fn()
const getAnalyticsSummary = vi.fn()
const listCmsTodos = vi.fn()
const createCmsTodo = vi.fn()
const updateCmsTodo = vi.fn()
const deleteCmsTodo = vi.fn()

vi.mock('@/lib/dashboard-api', () => ({
  getDashboardChecklist: (...args: unknown[]) => getDashboardChecklist(...args),
  listCmsTodos: (...args: unknown[]) => listCmsTodos(...args),
  createCmsTodo: (...args: unknown[]) => createCmsTodo(...args),
  updateCmsTodo: (...args: unknown[]) => updateCmsTodo(...args),
  deleteCmsTodo: (...args: unknown[]) => deleteCmsTodo(...args),
}))

vi.mock('@/lib/analytics-api', () => ({
  getAnalyticsSummary: (...args: unknown[]) => getAnalyticsSummary(...args),
}))

describe('CmsDashboard', () => {
  beforeEach(() => {
    authUser.role = 'EDITOR'
    authUser.roles = ['EDITOR']
    getDashboardChecklist.mockResolvedValue({
      draftArticles: 2,
      reviewArticles: 1,
      pendingSubmissions: 0,
      publishedToday: 3,
      scheduledArticles: 1,
      failedTranslations: 0,
    })
    getAnalyticsSummary.mockResolvedValue({
      visitors: 1200,
      visitorsTrendPct: 5,
      pageviews: 3400,
      avgDwellLabel: '2m',
      daily: [{ views: 10 }, { views: 20 }],
      topStories: [],
    })
    listCmsTodos.mockResolvedValue([
      { id: 'todo-1', title: 'Review photos', done: false, dueAt: null },
    ])
    createCmsTodo.mockResolvedValue({ id: 'todo-2' })
    updateCmsTodo.mockResolvedValue({})
    deleteCmsTodo.mockResolvedValue(undefined)
  })

  it('greets the signed-in editor and shows stats', async () => {
    renderPage(<CmsDashboard />)
    expect(await screen.findByText(/Ada/)).toBeInTheDocument()
    expect(screen.getByText('cms.dashboard.traffic')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('1,200')).toBeInTheDocument()
    })
  })

  it('adds a personal todo', async () => {
    const user = userEvent.setup()
    renderPage(<CmsDashboard />)
    await screen.findByText('Review photos')

    await user.type(
      screen.getByPlaceholderText('cms.dashboard.todoPlaceholder'),
      'Call printer',
    )
    await user.click(screen.getByRole('button', { name: 'cms.dashboard.add' }))

    await waitFor(() => {
      expect(createCmsTodo).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Call printer' }),
      )
    })
  })

  it('switches analytics timeframe', async () => {
    const user = userEvent.setup()
    renderPage(<CmsDashboard />)
    await screen.findByText(/Ada/)

    await user.click(screen.getByRole('button', { name: 'cms.dashboard.week' }))
    await waitFor(() => {
      expect(getAnalyticsSummary).toHaveBeenCalledWith('week')
    })
  })

  it('hides traffic analytics for authors', async () => {
    authUser.role = 'AUTHOR'
    authUser.roles = ['AUTHOR']
    renderPage(<CmsDashboard />)
    expect(await screen.findByText(/Ada/)).toBeInTheDocument()
    expect(screen.queryByText('cms.dashboard.traffic')).not.toBeInTheDocument()
    expect(screen.getByText('cms.dashboard.drafts')).toBeInTheDocument()
  })
})
