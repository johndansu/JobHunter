import { Link } from 'react-router-dom'
import { Users, Settings, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

const EnterpriseDashboard = () => {
  const { user, logout } = useAuthStore()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/dashboard" className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              JobHunter <span className="text-teal-600">Pro</span>
            </Link>

            <nav className="hidden md:flex items-center space-x-8">
              <Link to="/dashboard" className="text-slate-900 dark:text-slate-100 font-semibold">Dashboard</Link>
              <Link to="/users" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium">Users</Link>
              <Link to="/settings" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium">Settings</Link>
              
              <div className="flex items-center space-x-4 ml-4 pl-4 border-l border-slate-200 dark:border-slate-700">
                <span className="text-sm text-slate-600 dark:text-slate-400">{user?.username}</span>
                <button
                  onClick={logout}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
            Welcome, {user?.username}!
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 mt-2">
            Manage your JobHunter platform from here
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
          <Link 
            to="/users" 
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 hover:shadow-xl transition-all duration-200 hover:scale-105 group"
          >
            <div className="flex items-center gap-6">
              <div className="p-5 bg-teal-100 dark:bg-teal-900 rounded-xl group-hover:bg-teal-600 transition-colors duration-200">
                <Users className="h-10 w-10 text-teal-600 dark:text-teal-300 group-hover:text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Manage Users
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  View and manage all registered users
                </p>
              </div>
            </div>
          </Link>

          <Link 
            to="/settings" 
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 hover:shadow-xl transition-all duration-200 hover:scale-105 group"
          >
            <div className="flex items-center gap-6">
              <div className="p-5 bg-slate-100 dark:bg-slate-700 rounded-xl group-hover:bg-slate-600 transition-colors duration-200">
                <Settings className="h-10 w-10 text-slate-600 dark:text-slate-300 group-hover:text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Settings
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Configure platform settings
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default EnterpriseDashboard
