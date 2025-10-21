import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/authService'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Welcome from '@/pages/Welcome'
import EnterpriseDashboard from '@/pages/EnterpriseDashboard'
import EnterpriseJobs from '@/pages/EnterpriseJobs'
import EnterpriseJobDetails from '@/pages/EnterpriseJobDetails'
import EnterpriseCreateJob from '@/pages/EnterpriseCreateJob'
import EnterpriseData from '@/pages/EnterpriseData'
import EnterpriseAnalytics from '@/pages/EnterpriseAnalytics'
import EnterpriseSettings from '@/pages/EnterpriseSettings'
import Jobs from '@/pages/Jobs'
import JobDetails from '@/pages/JobDetails'
import ProfessionalCreateJob from '@/pages/ProfessionalCreateJob'
import Data from '@/pages/Data'
import Profile from '@/pages/Profile'
import TestScraping from '@/pages/TestScraping'
import AuthTest from '@/pages/AuthTest'

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
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth-test" element={<AuthTest />} />
        <Route path="/force-logout" element={<ForceLogout />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<EnterpriseDashboard />} />
      <Route path="/jobs" element={<EnterpriseJobs />} />
      <Route path="/jobs/:id" element={<EnterpriseJobDetails />} />
      <Route path="/jobs/create" element={<EnterpriseCreateJob />} />
      <Route path="/data" element={<EnterpriseData />} />
      <Route path="/analytics" element={<EnterpriseAnalytics />} />
      <Route path="/settings" element={<EnterpriseSettings />} />
      <Route path="/test" element={<Layout><TestScraping /></Layout>} />
      <Route path="/profile" element={<Layout><Profile /></Layout>} />
      <Route path="/auth-test" element={<AuthTest />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
