import { Link } from 'react-router-dom'
import { Users, Settings, LogOut, TrendingUp, UserPlus, Activity, Calendar, BarChart3, Search, Globe, AlertTriangle, Shield, Bell, Flag } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { adminService } from '@/services/adminService'

interface UserStats {
  totalUsers: number
  activeUsers: number
  admins: number
  recentRegistrations: Array<{
    id: string
    username: string
    email: string
    createdAt: string
  }>
}

const EnterpriseDashboard = () => {
  const { user, logout } = useAuthStore()

  // Fetch user statistics
  const { data: users, isLoading } = useQuery({
    queryKey: ['dashboard-users'],
    queryFn: async () => {
      const response = await api.get('/users/all')
      return response.data.data
    },
    enabled: !!user && user.role === 'ADMIN'
  })

  // Fetch platform analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['platform-analytics', '7d'],
    queryFn: () => adminService.getDashboardAnalytics('7d'),
    enabled: !!user && user.role === 'ADMIN',
    refetchInterval: 60000 // Refresh every minute
  })

  // Fetch system health
  const { data: systemHealth } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => adminService.getSystemHealth(),
    enabled: !!user && user.role === 'ADMIN',
    refetchInterval: 30000 // Refresh every 30 seconds
  })

  // Calculate statistics
  const stats: UserStats = {
    totalUsers: users?.length || 0,
    activeUsers: users?.filter((u: any) => u.isActive).length || 0,
    admins: users?.filter((u: any) => u.role === 'ADMIN').length || 0,
    recentRegistrations: users?.slice(0, 5) || []
  }

  // Calculate registration trends (last 7 days)
  const registrationTrends = () => {
    if (!users) return []
    
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      return date.toISOString().split('T')[0]
    })

    return last7Days.map(date => {
      const count = users.filter((u: any) => {
        const userDate = new Date(u.createdAt).toISOString().split('T')[0]
        return userDate === date
      }).length

      return {
        date,
        count,
        label: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }
    })
  }

  const trends = registrationTrends()
  const maxCount = Math.max(...trends.map(t => t.count), 1)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/dashboard" className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              JobHunter <span className="text-teal-600">Pro</span>
            </Link>

            <nav className="hidden md:flex items-center space-x-6">
              <Link to="/dashboard" className="text-slate-900 dark:text-slate-100 font-semibold">Dashboard</Link>
              <Link to="/users" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium">Users</Link>
              <Link to="/admin/analytics" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium">Analytics</Link>
              <Link to="/admin/health" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium">Health</Link>
              <Link to="/admin/security" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium">Security</Link>
              <Link to="/admin/announcements" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium">Announcements</Link>
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
            Welcome, {user?.username}!
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 mt-2">
            Here's what's happening with your platform today
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-teal-100 dark:bg-teal-900 rounded-lg">
                <Users className="h-6 w-6 text-teal-600 dark:text-teal-300" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              {isLoading ? '...' : stats.totalUsers}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Total Users</div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <Activity className="h-6 w-6 text-green-600 dark:text-green-300" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              {isLoading ? '...' : stats.activeUsers}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Active Users</div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Globe className="h-6 w-6 text-blue-600 dark:text-blue-300" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              {analyticsLoading ? '...' : analytics?.overview.totalApiCalls || 0}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">API Calls (7d)</div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Search className="h-6 w-6 text-purple-600 dark:text-purple-300" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              {analyticsLoading ? '...' : analytics?.overview.totalSearches || 0}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Total Searches</div>
          </div>
        </div>

        {/* Platform Health & Activity Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${
                systemHealth?.status === 'healthy' ? 'bg-green-100 dark:bg-green-900' :
                systemHealth?.status === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900' :
                'bg-red-100 dark:bg-red-900'
              }`}>
                <TrendingUp className={`h-6 w-6 ${
                  systemHealth?.status === 'healthy' ? 'text-green-600 dark:text-green-300' :
                  systemHealth?.status === 'warning' ? 'text-yellow-600 dark:text-yellow-300' :
                  'text-red-600 dark:text-red-300'
                }`} />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              {analytics?.overview.successRate.toFixed(1) || 0}%
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">API Success Rate</div>
        </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-300" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              {systemHealth?.errors.unresolved || 0}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Unresolved Errors</div>
                </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                <Shield className="h-6 w-6 text-red-600 dark:text-red-300" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              {systemHealth?.security.unresolvedEvents || 0}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Security Alerts</div>
              </div>
              
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                <Activity className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
                        </div>
                      </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              {analytics?.overview.avgResponseTime || 0}ms
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Avg Response Time</div>
                  </div>
                          </div>

        {/* Registration Trend Chart */}
        <div className="mb-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                          <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Registration Trends
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  New user signups over the last 7 days
                            </p>
                          </div>
                        </div>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {trends.map((trend, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-20 text-sm text-slate-600 dark:text-slate-400 font-medium">
                      {trend.label}
                    </div>
                    <div className="flex-1">
                      <div className="relative h-10 bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-500 to-teal-600 rounded-lg flex items-center justify-end px-3 transition-all duration-500"
                          style={{ width: `${(trend.count / maxCount) * 100}%`, minWidth: trend.count > 0 ? '2rem' : '0' }}
                        >
                          {trend.count > 0 && (
                            <span className="text-xs font-semibold text-white">
                              {trend.count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="w-12 text-right">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {trend.count}
                      </span>
                    </div>
                  </div>
                ))}
                  </div>
                )}
            {!isLoading && trends.every(t => t.count === 0) && (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                No registrations in the last 7 days
              </div>
            )}
          </div>
              </div>

        {/* Top Keywords & API Usage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Search Keywords */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <Search className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Top Search Keywords
                </h2>
              </div>
              </div>
              <div className="p-6">
              {analyticsLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-10 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                  ))}
                        </div>
              ) : analytics?.userActivity.topKeywords.length ? (
                <div className="space-y-2">
                  {analytics.userActivity.topKeywords.slice(0, 5).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                      <span className="font-medium text-slate-900 dark:text-slate-100">{item.keyword}</span>
                      <span className="px-3 py-1 bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 rounded-full text-sm font-semibold">
                        {item.count} searches
                      </span>
                      </div>
                    ))}
                  </div>
                ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  No search data yet
                </div>
              )}
            </div>
          </div>

          {/* API Provider Breakdown */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <Globe className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  API Provider Usage
                </h2>
              </div>
            </div>
            <div className="p-6">
              {analyticsLoading ? (
                  <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-10 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                  ))}
                        </div>
              ) : analytics?.apiUsage.byProvider.length ? (
                <div className="space-y-3">
                  {analytics.apiUsage.byProvider.map((provider, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-900 dark:text-slate-100 capitalize">
                          {provider.provider.replace('_', ' ')}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400">
                          {provider.calls} calls • {provider.avgResponseTime}ms avg
                        </span>
                      </div>
                      <div className="relative h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                          style={{ 
                            width: `${(provider.calls / analytics.overview.totalApiCalls) * 100}%` 
                          }}
                        />
                        </div>
                      </div>
                    ))}
                  </div>
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  No API data yet
                </div>
                )}
              </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
              <Link 
                to="/admin/analytics" 
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
              >
                View Full Analytics →
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Registrations */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Recent Registrations
              </h2>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3 animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : stats.recentRegistrations.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentRegistrations.map((u: any) => (
                    <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                      <div className="h-10 w-10 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center">
                        <span className="text-teal-700 dark:text-teal-300 font-semibold">
                          {u.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          {u.username}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                          {u.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Calendar className="h-3 w-3" />
                        {new Date(u.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  No recent registrations
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
              <Link 
                to="/users" 
                className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 text-sm font-medium"
              >
                View All Users →
              </Link>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <Link 
              to="/users" 
              className="block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-lg transition-all duration-200 hover:scale-105 group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-teal-100 dark:bg-teal-900 rounded-lg group-hover:bg-teal-600 transition-colors">
                  <Users className="h-6 w-6 text-teal-600 dark:text-teal-300 group-hover:text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Manage Users
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    View and manage all registered users
                  </p>
                </div>
              </div>
            </Link>

            <Link 
              to="/admin/analytics" 
              className="block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-lg transition-all duration-200 hover:scale-105 group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg group-hover:bg-blue-600 transition-colors">
                  <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-300 group-hover:text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Analytics & Metrics
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    API usage, costs & performance
                  </p>
                </div>
              </div>
            </Link>

            <Link 
              to="/admin/health" 
              className="block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-lg transition-all duration-200 hover:scale-105 group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg group-hover:bg-orange-600 transition-colors">
                  <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-300 group-hover:text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    System Health
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Monitor errors & resolve issues
                  </p>
                </div>
              </div>
            </Link>

            <Link 
              to="/admin/security" 
              className="block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-lg transition-all duration-200 hover:scale-105 group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg group-hover:bg-red-600 transition-colors">
                  <Shield className="h-6 w-6 text-red-600 dark:text-red-300 group-hover:text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Security & Access
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Failed logins & IP blocking
                  </p>
                </div>
              </div>
            </Link>

            <Link 
              to="/admin/announcements" 
              className="block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-lg transition-all duration-200 hover:scale-105 group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg group-hover:bg-purple-600 transition-colors">
                  <Bell className="h-6 w-6 text-purple-600 dark:text-purple-300 group-hover:text-white" />
            </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Announcements
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Manage platform notifications
                  </p>
                </div>
              </div>
            </Link>

            <Link 
              to="/settings" 
              className="block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-lg transition-all duration-200 hover:scale-105 group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg group-hover:bg-slate-600 transition-colors">
                  <Settings className="h-6 w-6 text-slate-600 dark:text-slate-300 group-hover:text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Settings
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Configure platform settings
                  </p>
              </div>
            </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EnterpriseDashboard
