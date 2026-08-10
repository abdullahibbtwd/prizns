import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/lib/auth'
import { RequireAuth } from '@/cms/RequireAuth'
import { CmsLayout } from '@/cms/CmsLayout'
import CmsLoginPage from '@/cms/pages/LoginPage'
import CmsDashboard from '@/cms/pages/Dashboard'
import CmsStoriesPage from '@/cms/pages/StoriesPage'
import CmsStoryEditorPage from '@/cms/pages/StoryEditorPage'
import CmsAuthorsPage from '@/cms/pages/AuthorsPage'
import CmsAuthorEditorPage from '@/cms/pages/AuthorEditorPage'
import CmsSeriesPage from '@/cms/pages/SeriesPage'
import CmsSeriesEditorPage from '@/cms/pages/SeriesEditorPage'
import CmsSubmissionsPage from '@/cms/pages/SubmissionsPage'
import CmsSubmissionDetailPage from '@/cms/pages/SubmissionDetailPage'
import CmsDonationsPage from '@/cms/pages/DonationsPage'
import CmsPartnershipsPage from '@/cms/pages/PartnershipsPage'
import CmsNewsletterPage from '@/cms/pages/NewsletterPage'
import CmsTagsPage from '@/cms/pages/TagsPage'
import CmsUsersPage from '@/cms/pages/UsersPage'
import CmsAnalyticsPage from '@/cms/pages/AnalyticsPage'
import CmsSocialPage from '@/cms/pages/SocialPage'
import {
  CmsAiPage,
  CmsMediaPage,
  CmsSeoPage,
  CmsSettingsPage,
  CmsShopPage,
} from '@/cms/pages/ContentPages'
import CmsProductsPage from '@/cms/pages/ProductsPage'
import CmsOrdersPage from '@/cms/pages/OrdersPage'

export default function CmsApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<CmsLoginPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<CmsLayout />}>
            <Route index element={<CmsDashboard />} />
            <Route path="stories" element={<CmsStoriesPage />} />
            <Route path="stories/:id" element={<CmsStoryEditorPage />} />
            <Route path="series" element={<CmsSeriesPage />} />
            <Route path="series/:id" element={<CmsSeriesEditorPage />} />
            <Route path="tags" element={<CmsTagsPage />} />
            <Route path="authors" element={<CmsAuthorsPage />} />
            <Route path="authors/:id" element={<CmsAuthorEditorPage />} />
            <Route path="media" element={<CmsMediaPage />} />
            <Route path="submissions" element={<CmsSubmissionsPage />} />
            <Route path="submissions/:id" element={<CmsSubmissionDetailPage />} />
            <Route path="donations" element={<CmsDonationsPage />} />
            <Route path="partnerships" element={<CmsPartnershipsPage />} />
            <Route path="newsletter" element={<CmsNewsletterPage />} />
            <Route path="social" element={<CmsSocialPage />} />
            <Route path="seo" element={<CmsSeoPage />} />
            <Route path="analytics" element={<CmsAnalyticsPage />} />
            <Route path="shop" element={<CmsShopPage />} />
            <Route path="orders" element={<CmsOrdersPage />} />
            <Route path="products" element={<CmsProductsPage />} />
            <Route path="users" element={<CmsUsersPage />} />
            <Route path="roles" element={<Navigate to="/cms/users" replace />} />
            <Route path="settings" element={<CmsSettingsPage />} />
            <Route path="ai" element={<CmsAiPage />} />
            <Route path="*" element={<Navigate to="/cms" replace />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  )
}
