import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, DollarSign, Clock, TrendingUp, AlertCircle, ChevronDown, LogOut, Globe, Zap } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { adminService } from '@/services/adminService'

export default function AdminAnalytics() {
  const { user, logout } = useAuthStore()
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('30d')

  // Fetch API usage stats
  const { data: apiUsage, isLoading } = useQuery({
    queryKey: ['api-usage', timeRange],
    queryFn: () => adminService.getApiUsageStats(timeRange),
    enabled: !!user && user.role === 'ADMIN',
    refetchInterval: 60000
  })

  // Fetch user activity
  const { data: userActivity } = useQuery({
    queryKey: ['user-activity', timeRange],
    queryFn: () => adminService.getUserActivityStats(timeRange),
    enabled: !!user && user.role === 'ADMIN'
  })

  const timeRanges: Array<{ value: typeof timeRange; label: string }> = [
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/dashboard" className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              JobHunter <span className="text-teal-600">Pro</span>
            </Link>

            <nav className="hidden md:flex items-center space-x-6">
              <Link to="/dashboard" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium">Dashboard</Link>
              <Link to="/users" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium">Users</Link>
              <Link to="/admin/analytics" className="text-slate-900 dark:text-slate-100 font-semibold">Analytics</Link>
              <Link to="/admin/health" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium">Health</Link>
              <Link to="/admin/security" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium">Security</Link>
              <Link to="/admin/announcements" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium">Announcements</Link>
              
              <div className="flex items-center space-x-4 ml-4 pl-4 border-l border-slate-200 dark:border-slate-700">
                <span className="text-sm text-slate-600 dark:text-slate-400">{user?.username}</span>
                <button onClick={logout} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              API Analytics & Cost Tracking
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Monitor API usage, costs, and performance metrics
            </p>
          </div>

          {/* Time Range Selector */}
          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
              className="appearance-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 pr-10 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
            >
              {timeRanges.map(range => (
                <option key={range.value} value={range.value}>{range.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-300" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              {isLoading ? '...' : apiUsage?.summary.totalCalls.toLocaleString() || 0}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Total API Calls</div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-300" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              ${isLoading ? '...' : apiUsage?.totalEstimatedCost.toFixed(2) || '0.00'}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Estimated Cost</div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Clock className="h-6 w-6 text-purple-600 dark:text-purple-300" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              {isLoading ? '...' : Math.round(apiUsage?.summary.providers.reduce((sum, p) => sum + p.avgResponseTime, 0) / (apiUsage?.summary.providers.length || 1)) || 0}ms
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Avg Response Time</div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-300" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              {isLoading ? '...' : apiUsage?.recentFailures.length || 0}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Recent Failures</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* API Providers Breakdown */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <Globe className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  API Providers
                </h2>
              </div>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              ) : apiUsage?.summary.providers.length ? (
                <div className="space-y-4">
                  {apiUsage.summary.providers.map((provider, index) => (
                    <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100 capitalize text-lg">
                            {provider.name.replace('_', ' ')}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {provider.calls.toLocaleString()} calls
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            ${provider.estimatedCost.toFixed(4)}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">estimated</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Avg Response</p>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{provider.avgResponseTime}ms</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">% of Total</p>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {((provider.calls / apiUsage.summary.totalCalls) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  No API usage data yet
                </div>
              )}
            </div>
          </div>

          {/* User Activity Metrics */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  User Activity
                </h2>
              </div>
            </div>
            <div className="p-6">
              {userActivity ? (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Logins</span>
                      <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{userActivity.totalLogins}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Activity Breakdown</h3>
                    {userActivity.activityBreakdown.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400 capitalize">{activity.action}</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{activity.count}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Most Active Users</h3>
                    <div className="space-y-2">
                      {userActivity.topUsers.slice(0, 5).map((user, index) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.username}</span>
                          <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
                            {user.activityCount} actions
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  Loading activity data...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent API Failures */}
        {apiUsage?.recentFailures && apiUsage.recentFailures.length > 0 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Recent API Failures
                </h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Provider</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Endpoint</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Error</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {apiUsage.recentFailures.slice(0, 10).map((failure, index) => (
                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-100 capitalize">
                        {failure.provider.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-mono">
                        {failure.endpoint}
                      </td>
                      <td className="px-6 py-4 text-sm text-red-600 dark:text-red-400">
                        {failure.errorMessage}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {new Date(failure.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

