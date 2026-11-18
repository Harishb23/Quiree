import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/ui/Toast'
import { PageLoader } from './components/ui/Feedback'
import { GuestRoute, ProtectedRoute } from './components/routing/RouteGuards'

const PublicLayout = lazy(() => import('./layouts/PublicLayout'))
const HomePage = lazy(() => import('./pages/marketing/HomePage'))
const AboutPage = lazy(() => import('./pages/marketing/AboutPage'))
const FeaturesPage = lazy(() => import('./pages/marketing/FeaturesPage'))
const PricingPage = lazy(() => import('./pages/marketing/PricingPage'))
const ContactPage = lazy(() => import('./pages/marketing/ContactPage'))
const NotFoundPage = lazy(() => import('./pages/marketing/NotFoundPage'))

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

const PublicProfilePage = lazy(() => import('./pages/public/PublicProfilePage'))
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
              </Route>

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

              <Route path="p/:slug" element={<PublicProfilePage />} />
              <Route path="q/:slug" element={<QrHomeScreenPage />} />

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
