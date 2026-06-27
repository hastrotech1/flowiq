import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/lib/constants'
import { ToastProvider } from '@/components/ui/Toast'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { PageErrorBoundary } from '@/components/ui/ErrorBoundary'

// ── Lazy-load all pages for code-splitting ─────────────────
const AuthPage         = lazy(() => import('@/pages/Auth'))
const AuthCallbackPage = lazy(() => import('@/pages/AuthCallback'))
const DashboardPage    = lazy(() => import('@/pages/Dashboard'))
const StatementsPage   = lazy(() => import('@/pages/Statements'))
const TransactionsPage = lazy(() => import('@/pages/Transactions'))
const CategoriesPage   = lazy(() => import('@/pages/Categories'))
const InsightsPage     = lazy(() => import('@/pages/Insights'))
const ReportsPage      = lazy(() => import('@/pages/Reports'))
const SettingsPage     = lazy(() => import('@/pages/Settings'))

// ════════════════════════════════════════════════════════════
// PROTECTED ROUTE
// ════════════════════════════════════════════════════════════

/**
 * Route guard. Renders nothing while session check is pending
 * (avoids a flash to /auth on hard reload when user IS logged in).
 * Redirects to /auth when no session is found.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isChecked } = useAuth()

  // Session check still in-flight — show branded loading screen
  if (!isChecked) return <LoadingScreen />

  // No session — redirect to auth
  if (!user) return <Navigate to={ROUTES.auth} replace />

  return <>{children}</>
}

/**
 * Minimal page-change loading fallback.
 * Only visible during lazy chunk download (usually < 100ms on fast connections).
 */
function PageLoader() {
  return (
    <div className="min-h-[100dvh] bg-surface-gray flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-green-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// APP ROOT
// ════════════════════════════════════════════════════════════

/**
 * Root application component.
 * Wraps routes with:
 *   - ToastProvider (notifications available everywhere)
 *   - PageErrorBoundary (catches render errors at route level)
 *   - Suspense (lazy page loading)
 *
 * AppLayout (sidebar/nav) lives inside each protected page,
 * allowing per-page TopBar customisation.
 */
export default function App() {
  return (
    <ToastProvider>
      <PageErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ── Public ── */}
            <Route path={ROUTES.auth} element={<AuthPage />} />
            {/* OAuth callback — verifies Appwrite session before navigating to app */}
            <Route path="/auth/callback" element={<AuthCallbackPage />} />

            {/* ── Root redirect ── */}
            <Route path="/" element={<Navigate to={ROUTES.dashboard} replace />} />

            {/* ── Protected ── */}
            <Route path={ROUTES.dashboard}
              element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path={ROUTES.statements}
              element={<ProtectedRoute><StatementsPage /></ProtectedRoute>} />
            <Route path={ROUTES.transactions}
              element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
            <Route path={ROUTES.categories}
              element={<ProtectedRoute><CategoriesPage /></ProtectedRoute>} />
            <Route path={ROUTES.insights}
              element={<ProtectedRoute><InsightsPage /></ProtectedRoute>} />
            <Route path={ROUTES.reports}
              element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
            <Route path={ROUTES.settings}
              element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

            {/* ── 404 fallback ── */}
            <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
          </Routes>
        </Suspense>
      </PageErrorBoundary>
    </ToastProvider>
  )
}
