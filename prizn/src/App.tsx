import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CookieConsentBanner } from '@/components/CookieConsentBanner'
import { ReaderSignInModal } from '@/components/ReaderSignInModal'
import { ScrollToTop } from '@/components/ScrollToTop'
import {
  AnalyticsProvider,
  AnalyticsTracker,
} from '@/hooks/usePageAnalytics'
import { ReaderAuthProvider } from '@/lib/reader-auth'
import { LocaleRoot } from '@/LocaleRoot'
import CmsApp from '@/cms/CmsApp'

export default function App() {
  return (
    <BrowserRouter>
      <ReaderAuthProvider>
        <AnalyticsProvider>
          <ScrollToTop />
          <AnalyticsTracker />
          <div className="print-hidden">
            <CookieConsentBanner />
          </div>
          <ReaderSignInModal />
          <Routes>
            <Route path="/cms/*" element={<CmsApp />} />
            <Route path="/en/*" element={<LocaleRoot lang="en" />} />
            <Route path="/*" element={<LocaleRoot lang="bg" />} />
          </Routes>
        </AnalyticsProvider>
      </ReaderAuthProvider>
    </BrowserRouter>
  )
}
