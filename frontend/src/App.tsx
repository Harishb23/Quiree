import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/ui/Toast'
import { PageLoader } from './components/ui/Feedback'
import { AccountArea, GuestRoute, ProtectedRoute } from './components/routing/RouteGuards'

const PublicLayout = lazy(() => import('./layouts/PublicLayout'))
const HomePage = lazy(() => import('./pages/marketing/HomePage'))
const AboutPage = lazy(() => import('./pages/marketing/AboutPage'))
const FeaturesPage = lazy(() => import('./pages/marketing/FeaturesPage'))
const PricingPage = lazy(() => import('./pages/marketing/PricingPage'))
const ContactPage = lazy(() => import('./pages/marketing/ContactPage'))
const NotFoundPage = lazy(() => import('./pages/marketing/NotFoundPage'))
const LegalPage = lazy(() => import('./pages/marketing/LegalPage'))
const AuthLayout = lazy(() => import('./layouts/AuthLayout'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'))

const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'))
const OverviewPage = lazy(() => import('./pages/dashboard/OverviewPage'))
const MyProfilePage = lazy(() => import('./pages/dashboard/MyProfilePage'))
const ModesPage = lazy(() => import('./pages/dashboard/ModesPage'))
const ModeEditorPage = lazy(() => import('./pages/dashboard/ModeEditorPage'))
const TemplatesPage = lazy(() => import('./pages/dashboard/TemplatesPage'))
const QrCodePage = lazy(() => import('./pages/dashboard/QrCodePage'))
const SubscriptionPage = lazy(() => import('./pages/dashboard/SubscriptionPage'))
const SettingsPage = lazy(() => import('./pages/dashboard/SettingsPage'))

// Business profiles
const BusinessListPage = lazy(() => import('./pages/business/BusinessListPage'))
const BusinessWizardPage = lazy(() => import('./pages/business/BusinessWizardPage'))
const BusinessShell = lazy(() => import('./pages/business/BusinessShell'))
const BusinessDashboardPage = lazy(() => import('./pages/business/BusinessDashboardPage'))
const BusinessAnalyticsPage = lazy(() => import('./pages/business/BusinessAnalyticsPage'))
const ProductsPage = lazy(() => import('./pages/business/ProductsPage'))
const ProductEditorPage = lazy(() => import('./pages/business/ProductEditorPage'))
const ServicesPage = lazy(() => import('./pages/business/ServicesPage'))
const OffersPage = lazy(() => import('./pages/business/OffersPage'))
const GalleryPage = lazy(() => import('./pages/business/GalleryPage'))
const BusinessQrPage = lazy(() => import('./pages/business/BusinessQrPage'))
const QrCampaignsPage = lazy(() => import('./pages/business/QrCampaignsPage'))
const EnquiriesPage = lazy(() => import('./pages/business/EnquiriesPage'))
const ReviewsPage = lazy(() => import('./pages/business/ReviewsPage'))
const BusinessSettingsPage = lazy(() => import('./pages/business/BusinessSettingsPage'))

const PublicProfilePage = lazy(() => import('./pages/public/PublicProfilePage'))
const PublicBusinessPage = lazy(() => import('./pages/public/PublicBusinessPage'))
const BusinessQrResolvePage = lazy(() => import('./pages/public/BusinessQrResolvePage'))
const QrHomeScreenPage = lazy(() => import('./pages/public/QrHomeScreenPage'))

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route element={<PublicLayout />}>
                <Route index element={<HomePage />} />
                <Route path="about" element={<AboutPage />} />
                <Route path="features" element={<FeaturesPage />} />
                <Route path="pricing" element={<PricingPage />} />
                <Route path="contact" element={<ContactPage />} />
                <Route path="privacy" element={<LegalPage kind="privacy" />} />
                <Route path="terms" element={<LegalPage kind="terms" />} />              </Route>

              <Route
                element={
                  <GuestRoute>
                    <AuthLayout />
                  </GuestRoute>
                }
              >
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route path="forgot-password" element={<ForgotPasswordPage />} />
              </Route>
              {/* Reset is reachable while signed in too (link from email). */}
              <Route element={<AuthLayout />}>
                <Route path="reset-password" element={<ResetPasswordPage />} />
              </Route>

              <Route
                path="dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                {/* Personal accounts only */}
                <Route element={<AccountArea type="Personal" />}>
                <Route index element={<OverviewPage />} />
                <Route path="profile" element={<MyProfilePage />} />
                <Route path="modes" element={<ModesPage />} />
                <Route path="modes/new" element={<ModeEditorPage />} />
                <Route path="modes/:modeId" element={<ModeEditorPage />} />
                <Route path="templates" element={<TemplatesPage />} />
                <Route path="qr" element={<QrCodePage />} />
                <Route path="subscription" element={<SubscriptionPage />} />
                <Route path="settings" element={<SettingsPage />} />
                </Route>

                {/* Business accounts only */}
                <Route element={<AccountArea type="Business" />}>
                <Route path="business" element={<BusinessListPage />} />
                <Route path="business/new" element={<BusinessWizardPage />} />
                <Route path="business/:businessId" element={<BusinessShell />}>
                  <Route index element={<BusinessDashboardPage />} />
                  <Route path="profile" element={<BusinessWizardPage />} />
                  <Route path="products" element={<ProductsPage />} />
                  <Route path="products/new" element={<ProductEditorPage />} />
                  <Route path="products/:productId" element={<ProductEditorPage />} />
                  <Route path="services" element={<ServicesPage />} />
                  <Route path="offers" element={<OffersPage />} />
                  <Route path="gallery" element={<GalleryPage />} />
                  <Route path="qr" element={<BusinessQrPage />} />
                  <Route path="qr/campaigns" element={<QrCampaignsPage />} />
                  <Route path="analytics" element={<BusinessAnalyticsPage />} />
                  <Route path="enquiries" element={<EnquiriesPage />} />
                  <Route path="reviews" element={<ReviewsPage />} />
                  <Route path="settings" element={<BusinessSettingsPage />} />
                </Route>
                </Route>
              </Route>

              <Route path="p/:slug" element={<PublicProfilePage />} />
              <Route path="q/:slug" element={<QrHomeScreenPage />} />
              <Route path="business/:slug" element={<PublicBusinessPage />} />
              <Route path="bq/:code" element={<BusinessQrResolvePage />} />

              <Route element={<PublicLayout />}>
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
