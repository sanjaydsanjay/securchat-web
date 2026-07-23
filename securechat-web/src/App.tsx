import { lazy, Suspense, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useChatStore } from '@/stores/chatStore'
import { useAuthStore } from '@/stores/authStore'
import { useAuth } from '@/hooks/useAuth'
import { Loader } from '@/components/shared/Loader'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

const LoginPage = lazy(() => import('@/pages/LoginPage'))
const AuthCallbackPage = lazy(() => import('@/pages/AuthCallbackPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'))
const ChatPage = lazy(() => import('@/pages/ChatPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const PremiumPage = lazy(() => import('@/pages/PremiumPage'))
const StarredPage = lazy(() => import('@/pages/StarredPage'))
const BlockedPage = lazy(() => import('@/pages/BlockedPage'))
const BannedAccountPage = lazy(() => import('@/pages/BannedAccountPage'))
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))
const IntroPage = lazy(() => import('@/pages/IntroPage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 30000,
    },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader size="lg" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/intro" replace />
  }

  if (user.is_banned) {
    return <Navigate to="/banned" replace />
  }

  const trialExpired = !user.is_premium && !user.is_trial_active && user.plan_name === 'TRIAL EXPIRED'
  if (trialExpired && location.pathname !== '/premium') {
    return <Navigate to="/premium" replace />
  }

  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader size="lg" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function ChatRoute() {
  const { id } = useParams()
  const setActiveChatId = useChatStore((s) => s.setActiveChatId)

  useEffect(() => {
    setActiveChatId(id || null)
    return () => { setActiveChatId(null) }
  }, [id, setActiveChatId])

  return <ChatPage />
}

function AppRoutes() {
  const { user, loading } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.has('code') && !location.pathname.includes('/auth/callback')) {
      navigate(`/auth/callback${location.search}${location.hash}`, { replace: true })
    }
  }, [location, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader size="lg" />
      </div>
    )
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950"><Loader size="lg" /></div>}>
      <Routes>
        {/* Public routes */}
        <Route path="/intro" element={<IntroPage />} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/chat/:id" element={<ProtectedRoute><ChatRoute /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/premium" element={<ProtectedRoute><PremiumPage /></ProtectedRoute>} />
        <Route path="/starred" element={<ProtectedRoute><StarredPage /></ProtectedRoute>} />
        <Route path="/blocked" element={<ProtectedRoute><BlockedPage /></ProtectedRoute>} />
        <Route path="/banned" element={<BannedAccountPage />} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  useAuth()

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--color-surface-elevated)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
          },
        }}
      />
    </QueryClientProvider>
  )
}
