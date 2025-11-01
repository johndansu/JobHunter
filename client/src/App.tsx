import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/authService'
import { SpeedInsights } from '@vercel/speed-insights/react'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import Register from '@/pages/Register'

// Critical pages - load immediately
import JobBoardLanding from '@/pages/JobBoardLanding'
import BrowseJobs from '@/pages/BrowseJobs'
import SavedJobs from '@/pages/SavedJobs'

// Lazy load admin pages (heavy with charts/analytics)
const EnterpriseDashboard = lazy(() => import('@/pages/EnterpriseDashboard'))
const EnterpriseJobs = lazy(() => import('@/pages/EnterpriseJobs'))
const EnterpriseJobDetails = lazy(() => import('@/pages/EnterpriseJobDetails'))
const EnterpriseCreateJob = lazy(() => import('@/pages/EnterpriseCreateJob'))
const EnterpriseData = lazy(() => import('@/pages/EnterpriseData'))
const EnterpriseAnalytics = lazy(() => import('@/pages/EnterpriseAnalytics'))
const EnterpriseSettings = lazy(() => import('@/pages/EnterpriseSettings'))
const EnterpriseUsers = lazy(() => import('@/pages/EnterpriseUsers'))
const AdminAnalytics = lazy(() => import('@/pages/AdminAnalytics'))
const AdminHealth = lazy(() => import('@/pages/AdminHealth'))
const AdminSecurity = lazy(() => import('@/pages/AdminSecurity'))
const AdminAnnouncements = lazy(() => import('@/pages/AdminAnnouncements'))

// Lazy load legacy pages
const Jobs = lazy(() => import('@/pages/Jobs'))
const JobDetails = lazy(() => import('@/pages/JobDetails'))
const ProfessionalCreateJob = lazy(() => import('@/pages/ProfessionalCreateJob'))
const Data = lazy(() => import('@/pages/Data'))
const Profile = lazy(() => import('@/pages/Profile'))
const TestScraping = lazy(() => import('@/pages/TestScraping'))
const AuthTest = lazy(() => import('@/pages/AuthTest'))

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
      <p className="text-slate-600 dark:text-slate-400">Loading...</p>
    </div>
  </div>
)

// Temporary component to force logout and clear auth state
const ForceLogout = () => {
  const { logout } = useAuthStore()
  
  useEffect(() => {
    logout()
    localStorage.removeItem('auth-storage') // Clear persisted state
    window.location.href = '/login'
  }, [logout])
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Clearing authentication...</p>
      </div>
    </div>
  )
}

function App() {
  const { user, setUser, setToken } = useAuthStore()

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('token')
        if (token) {
          setToken(token) // Set token in store
          try {
            const userData = await authService.getCurrentUser()
            setUser(userData)
          } catch (error) {
            console.error('Failed to get current user:', error)
            // Token might be invalid, clear it
            localStorage.removeItem('token')
            setToken(null)
            setUser(null)
          }
        } else {
          // No token, ensure user is null
          setUser(null)
          setToken(null)
        }
      } catch (error) {
        console.error('Auth initialization failed:', error)
        localStorage.removeItem('token')
        setToken(null)
        setUser(null)
      }
    }

    initAuth()
  }, [setUser, setToken])


  if (!user) {
    return (
      <>
        <Routes>
          <Route path="/" element={<JobBoardLanding />} />
          <Route path="/browse" element={<Navigate to="/login" replace />} />
          <Route path="/saved" element={<Navigate to="/login" replace />} />
          <Route path="/profile" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth-test" element={<AuthTest />} />
          <Route path="/force-logout" element={<ForceLogout />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <SpeedInsights />
      </>
    )
  }

  // Check if user is admin
  const isAdmin = user.role === 'ADMIN'

  if (isAdmin) {
    // Admin gets dashboard theme
    return (
      <>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<EnterpriseDashboard />} />
            <Route path="/jobs" element={<EnterpriseJobs />} />
            <Route path="/jobs/:id" element={<EnterpriseJobDetails />} />
            <Route path="/jobs/create" element={<EnterpriseCreateJob />} />
            <Route path="/data" element={<EnterpriseData />} />
            <Route path="/analytics" element={<EnterpriseAnalytics />} />
            <Route path="/users" element={<EnterpriseUsers />} />
            <Route path="/settings" element={<EnterpriseSettings />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/health" element={<AdminHealth />} />
            <Route path="/admin/security" element={<AdminSecurity />} />
            <Route path="/admin/announcements" element={<AdminAnnouncements />} />
            <Route path="/test" element={<Layout><TestScraping /></Layout>} />
            <Route path="/profile" element={<Layout><Profile /></Layout>} />
            <Route path="/auth-test" element={<AuthTest />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
        <SpeedInsights />
      </>
    )
  }

  // Regular users get simple job board theme
  return (
    <>
      <Routes>
        <Route path="/" element={<JobBoardLanding />} />
        <Route path="/browse" element={<BrowseJobs />} />
        <Route path="/saved" element={<SavedJobs />} />
        <Route path="/profile" element={<Layout><Profile /></Layout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <SpeedInsights />
    </>
  )
}

export default App
