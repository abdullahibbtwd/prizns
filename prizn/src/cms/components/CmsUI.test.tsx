import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Eye } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import {
  CmsPageHeader,
  ComingSoon,
  GhostButton,
  MiniSparkline,
  PrimaryButton,
  QuickSearchModal,
  StatCard,
  StatusPill,
} from './CmsUI'
import { renderPage } from '@/test/render-page'

const cmsGlobalSearch = vi.fn()

vi.mock('@/lib/cms-search-api', () => ({
  cmsGlobalSearch: (...args: unknown[]) => cmsGlobalSearch(...args),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { exists: (k: string) => k === 'cms.status.published' },
  }),
}))

describe('CmsUI helpers', () => {
  it('renders a known status pill with translation', () => {
    render(<StatusPill status="PUBLISHED" />)
    expect(screen.getByText('cms.status.published')).toBeInTheDocument()
  })

  it('falls back to raw status for unknown values', () => {
    render(<StatusPill status="CUSTOM" />)
    expect(screen.getByText('CUSTOM')).toBeInTheDocument()
  })

  it('draws a sparkline svg', () => {
    const { container } = render(
      <MiniSparkline data={[1, 5, 3, 8]} color="#ff0000" />,
    )
    expect(container.querySelector('polyline')).toHaveAttribute(
      'stroke',
      '#ff0000',
    )
  })

  it('renders a coming soon card', () => {
    render(
      <ComingSoon title="Analytics+" blurb="More charts are on the way." />,
    )
    expect(screen.getByText('Analytics+')).toBeInTheDocument()
    expect(screen.getByText(/roadmap/i)).toBeInTheDocument()
  })

  it('renders page header and stat card interactions', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <>
        <CmsPageHeader
          title="Stories desk"
          description="Today"
          badge="3 active"
          actions={<PrimaryButton>Action</PrimaryButton>}
        />
        <StatCard
          title="Traffic"
          value="1,200"
          trend="+5%"
          trendType="up"
          hint="Last 7 days"
          icon={Eye}
          sparklineData={[1, 3, 2, 5]}
          onClick={onClick}
        />
      </>,
    )
    expect(screen.getByText('Stories desk')).toBeInTheDocument()
    expect(screen.getByText('1,200')).toBeInTheDocument()
    await user.click(screen.getByText('Traffic').closest('.cursor-pointer')!)
    expect(onClick).toHaveBeenCalled()
  })

  it('renders ghost and primary buttons', () => {
    render(
      <>
        <PrimaryButton>Save</PrimaryButton>
        <GhostButton>Cancel</GhostButton>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('searches CMS content from the quick search modal', async () => {
    cmsGlobalSearch.mockResolvedValue({
      stories: [{ id: '1', title: 'River story', path: '/cms/stories/1' }],
      authors: [],
      submissions: [],
      tags: [],
      categories: [],
    })
    const onClose = vi.fn()
    const user = userEvent.setup()

    renderPage(<QuickSearchModal isOpen onClose={onClose} />)

    await user.type(screen.getByRole('textbox'), 'river')
    await waitFor(() => {
      expect(cmsGlobalSearch).toHaveBeenCalledWith('river')
    })
  })
})
