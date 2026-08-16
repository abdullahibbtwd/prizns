import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CookieConsentBanner } from '@/components/CookieConsentBanner'
import { ReaderSignInModal } from '@/components/ReaderSignInModal'
import { ScrollToTop } from '@/components/ScrollToTop'
import {
  AnalyticsProvider,
  AnalyticsTracker,
} from '@/hooks/usePageAnalytics'
import { ReaderAuthProvider } from '@/lib/reader-auth'
import HomePage from '@/routes/concept-3'
import DiscoverPage from '@/routes/discover'
import PlacesPage from '@/routes/places'
import StoriesPage from '@/routes/stories'
import AuthorsPage from '@/routes/authors'
import AuthorPage from '@/routes/author'
import TraditionsPage from '@/routes/traditions'
import VoicesPage from '@/routes/voices'
import SportsPage from '@/routes/sports'
import EventsPage from '@/routes/events'
import NewsPage from '@/routes/news'
import VideoPage from '@/routes/video'
import CampaignsPage from '@/routes/campaigns'
import GalleryPage from '@/routes/gallery'
import ArticlePage from '@/routes/article'
import WriteForUsPage from '@/routes/write-for-us'
import SupportUsPage from '@/routes/support'
import PartnershipsPage from '@/routes/partnerships'
import ContactPage from '@/routes/contact'
import WhyPrizniPage from '@/routes/why-prizni'
import ShopPage from '@/routes/shop'
import ShopProductPage from '@/routes/shop/product'
import ShopCartPage from '@/routes/shop/cart'
import ShopTrackPage from '@/routes/shop/track'
import ShopSuccessPage from '@/routes/shop/success'
import AuthVerifyPage from '@/routes/auth/verify'
import ReaderMePage from '@/routes/me'
import StoryOfTheYearPage from '@/routes/story-of-the-year'
import ArchivePage from '@/routes/archive'
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
            <Route path="/" element={<HomePage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/discover/:slug" element={<ArticlePage />} />
            <Route path="/places" element={<PlacesPage />} />
            <Route path="/places/:slug" element={<ArticlePage />} />
            <Route path="/stories" element={<StoriesPage />} />
            <Route path="/stories/:slug" element={<ArticlePage />} />
            <Route path="/authors" element={<AuthorsPage />} />
            <Route path="/authors/:slug" element={<AuthorPage />} />
            <Route path="/traditions" element={<TraditionsPage />} />
            <Route path="/traditions/:slug" element={<ArticlePage />} />
            <Route path="/voices" element={<VoicesPage />} />
            <Route path="/voices/:slug" element={<ArticlePage />} />
            <Route path="/sports" element={<SportsPage />} />
            <Route path="/sports/:slug" element={<ArticlePage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/events/:slug" element={<ArticlePage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/news/:slug" element={<ArticlePage />} />
            <Route path="/video" element={<VideoPage />} />
            <Route path="/video/:slug" element={<ArticlePage />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/campaigns/:slug" element={<ArticlePage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/gallery/:slug" element={<ArticlePage />} />
            <Route path="/write-for-us" element={<WriteForUsPage />} />
            <Route path="/support" element={<SupportUsPage />} />
            <Route path="/partnerships" element={<PartnershipsPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/why-prizni" element={<WhyPrizniPage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/shop/cart" element={<ShopCartPage />} />
            <Route path="/shop/track" element={<ShopTrackPage />} />
            <Route path="/shop/success" element={<ShopSuccessPage />} />
            <Route path="/shop/:slug" element={<ShopProductPage />} />
            <Route path="/auth/verify" element={<AuthVerifyPage />} />
            <Route path="/me" element={<ReaderMePage />} />
            <Route path="/story-of-the-year" element={<StoryOfTheYearPage />} />
            <Route path="/archive" element={<ArchivePage />} />
            <Route path="/cms/*" element={<CmsApp />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </AnalyticsProvider>
      </ReaderAuthProvider>
    </BrowserRouter>
  )
}
