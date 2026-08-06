import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ScrollToTop } from '@/components/ScrollToTop'
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
import VideoPage from '@/routes/video'
import CampaignsPage from '@/routes/campaigns'
import GalleryPage from '@/routes/gallery'
import ArticlePage from '@/routes/article'
import WriteForUsPage from '@/routes/write-for-us'
import SupportUsPage from '@/routes/support'
import PartnershipsPage from '@/routes/partnerships'
import CmsApp from '@/cms/CmsApp'

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
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
        <Route path="/video" element={<VideoPage />} />
        <Route path="/video/:slug" element={<ArticlePage />} />
        <Route path="/campaigns" element={<CampaignsPage />} />
        <Route path="/campaigns/:slug" element={<ArticlePage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/gallery/:slug" element={<ArticlePage />} />
        <Route path="/write-for-us" element={<WriteForUsPage />} />
        <Route path="/support" element={<SupportUsPage />} />
        <Route path="/partnerships" element={<PartnershipsPage />} />
        <Route path="/cms/*" element={<CmsApp />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  )
}
