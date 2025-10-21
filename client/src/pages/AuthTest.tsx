import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/authService'
import { api } from '@/services/api'
import toast from 'react-hot-toast'

const AuthTest = () => {
  const { user, token, logout } = useAuthStore()
  const [testResult, setTestResult] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const testLogin = async () => {
    setIsLoading(true)
    try {
      const response = await authService.login({
        email: 'admin@webscraperpro.com',
        password: 'admin123'
      })
      toast.success('Login successful!')
      setTestResult('Login successful - Token: ' + response.token.substring(0, 20) + '...')
    } catch (error: any) {
      toast.error('Login failed: ' + (error.response?.data?.error || error.message))
      setTestResult('Login failed: ' + (error.response?.data?.error || error.message))
    } finally {
      setIsLoading(false)
    }
  }

  const testAPI = async () => {
    setIsLoading(true)
    try {
      const response = await api.get('/users/stats')
      toast.success('API test successful!')
      setTestResult('API test successful - Data: ' + JSON.stringify(response.data.data, null, 2))
    } catch (error: any) {
      toast.error('API test failed: ' + (error.response?.data?.error || error.message))
      setTestResult('API test failed: ' + (error.response?.data?.error || error.message))
    } finally {
      setIsLoading(false)
    }
  }

  const testLogout = () => {
    logout()
    toast.success('Logged out successfully!')
    setTestResult('Logged out successfully!')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Authentication Test Page</h1>
        
        {/* Current Auth Status */}
        <div className="card p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Current Authentication Status</h2>
          <div className="space-y-2">
            <p><strong>User:</strong> {user ? JSON.stringify(user, null, 2) : 'Not logged in'}</p>
            <p><strong>Token:</strong> {token ? token.substring(0, 20) + '...' : 'No token'}</p>
            <p><strong>Token in localStorage:</strong> {localStorage.getItem('token') ? 'Present' : 'Not present'}</p>
          </div>
        </div>

        {/* Test Actions */}
        <div className="card p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          <div className="flex space-x-4 mb-4">
            <button 
              onClick={testLogin}
              disabled={isLoading || !!user}
              className="btn btn-primary"
            >
              Test Login (admin@webscraperpro.com)
            </button>
            <button 
              onClick={testAPI}
              disabled={isLoading || !user}
              className="btn btn-secondary"
            >
              Test API Call
            </button>
            <button 
              onClick={testLogout}
              disabled={isLoading || !user}
              className="btn btn-outline"
            >
              Test Logout
            </button>
          </div>
          {isLoading && <p className="text-teal-600">Loading...</p>}
        </div>

        {/* Test Result */}
        {testResult && (
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4">Test Result</h2>
            <pre className="bg-slate-100 p-4 rounded-lg text-sm overflow-auto">
              {testResult}
            </pre>
          </div>
        )}

        {/* Quick Links */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
          <div className="flex space-x-4">
            <a href="/login" className="btn btn-outline">Go to Login Page</a>
            <a href="/register" className="btn btn-outline">Go to Register Page</a>
            <a href="/dashboard" className="btn btn-outline">Go to Dashboard</a>
            <a href="/" className="btn btn-outline">Go to Welcome Page</a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthTest
