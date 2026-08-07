import { CmsPageHeader, ComingSoon } from '@/cms/components/CmsUI'
import { HeartHandshake } from 'lucide-react'

export default function CmsDonationsPage() {
  return (
    <div>
      <CmsPageHeader
        title="Donations & Grants"
        description="Track financial backing for field reporting, reading rooms, and looms."
        badge="Coming Soon"
      />
      <ComingSoon
        icon={HeartHandshake}
        title="Donations Dashboard"
        blurb="Donation tracking, campaign totals, and contributor logs will live here once payments are connected."
      />
    </div>
  )
}
