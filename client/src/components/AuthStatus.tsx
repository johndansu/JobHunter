import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { User, LogOut, Settings, Bell } from 'lucide-react'

const AuthStatus = () => {
  const { user, logout } = useAuthStore()
  const [showDropdown, setShowDropdown] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
      window.location.href = '/'
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center space-x-4">
        <Link to="/login" className="btn btn-outline btn-sm">
          Sign In
        </Link>
        <Link to="/register" className="btn btn-primary btn-sm">
          Get Started
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-4">
      <button className="relative p-2 text-slate-500 hover:text-slate-900">
        <Bell className="h-5 w-5" />
        <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
      </button>
      
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center space-x-2 hover:bg-slate-100 rounded-lg p-2 transition-colors"
        >
          <div className="h-8 w-8 bg-teal-600 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-slate-900">
              {user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : user.username || user.email
              }
            </p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
            <Link
              to="/profile"
              className="flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
              onClick={() => setShowDropdown(false)}
            >
              <Settings className="h-4 w-4" />
              <span>Profile Settings</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthStatus
