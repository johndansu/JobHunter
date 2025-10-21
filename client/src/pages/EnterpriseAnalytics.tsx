import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  BarChart3,
  TrendingUp,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  Globe,
  Database,
  Settings,
  RefreshCw,
  Download,
  Calendar,
  DollarSign,
  Target
,
  LogOut,
  User
} from 'lucide-react'
import { api } from '@/services/api'
import { useAuthStore } from '@/store/authStore'

const EnterpriseAnalytics = () => {
  const [timeRange, setTimeRange] = useState('7d')
  const { user, logout } = useAuthStore()

  // Fetch analytics data only if user is authenticated
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics', timeRange],
    queryFn: async () => {
      const response = await api.get(`/analytics/dashboard?timeRange=${timeRange}`)
      return response.data.data
    },
    enabled: !!user, // Only run if user is authenticated
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false
  })

  const { data: usageStats, isLoading: usageLoading } = useQuery({
    queryKey: ['usage-stats'],
    queryFn: async () => {
      const response = await api.get('/analytics/usage')
      return response.data.data
    },
    enabled: !!user, // Only run if user is authenticated
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false
  })

  const metrics = [
    {
      title: "Total Requests",
      value: analytics?.totalRequests?.toLocaleString() || "0",
      change: "+12.5%",
      changeType: "positive",
      icon: <Activity className="h-5 w-5" />,
      color: "text-teal-600"
    },
    {
      title: "Success Rate",
      value: `${analytics?.successRate || 0}%`,
      change: "+0.3%",
      changeType: "positive",
      icon: <CheckCircle className="h-5 w-5" />,
      color: "text-emerald-600"
    },
    {
      title: "Avg Response Time",
      value: `${analytics?.avgResponseTime || 0}s`,
      change: "-15.2%",
      changeType: "positive",
      icon: <Zap className="h-5 w-5" />,
      color: "text-cyan-600"
    },
    {
      title: "Active Jobs",
      value: analytics?.activeJobs || 0,
      change: "+2",
      changeType: "positive",
      icon: <Globe className="h-5 w-5" />,
      color: "text-amber-500"
    },
    {
      title: "Data Points",
      value: analytics?.totalDataPoints?.toLocaleString() || "0",
      change: "+8.1%",
      changeType: "positive",
      icon: <Database className="h-5 w-5" />,
      color: "text-teal-600"
    },
    {
      title: "This Month",
      value: `$${analytics?.costThisMonth || 0}`,
      change: "+$45.23",
      changeType: "negative",
      icon: <DollarSign className="h-5 w-5" />,
      color: "text-slate-900"
    }
  ]

  const usageMetrics = [
    {
      title: "Requests This Month",
      value: usageStats?.requestsThisMonth?.toLocaleString() || "0",
      limit: usageStats?.planLimits?.maxRequests || 100000,
      percentage: usageStats?.usagePercentages?.requests || 0,
      icon: <Activity className="h-5 w-5" />,
      color: "text-teal-600"
    },
    {
      title: "Data Points This Month",
      value: usageStats?.dataPointsThisMonth?.toLocaleString() || "0",
      limit: usageStats?.planLimits?.maxDataPoints || 1000000,
      percentage: usageStats?.usagePercentages?.dataPoints || 0,
      icon: <Database className="h-5 w-5" />,
      color: "text-emerald-600"
    },
    {
      title: "Concurrent Jobs",
      value: `${usageStats?.usagePercentages?.concurrentJobs || 0}%`,
      limit: 100,
      percentage: usageStats?.usagePercentages?.concurrentJobs || 0,
      icon: <Globe className="h-5 w-5" />,
      color: "text-amber-500"
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-40">
        <div className="container">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-teal-600 rounded-full flex items-center justify-center">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-slate-900">ScrapePro</span>
              </div>
              
              <nav className="hidden md:flex items-center space-x-6">
                <Link to="/dashboard" className="nav-item">Dashboard</Link>
                <Link to="/jobs" className="nav-item">Jobs</Link>
                <Link to="/data" className="nav-item">Data</Link>
                <Link to="/analytics" className="nav-item-active">Analytics</Link>
                <Link to="/settings" className="nav-item">Settings</Link>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <User className="h-4 w-4" />
                <span className="hidden md:block">{user?.username}</span>
              </div>
              <button
                onClick={logout}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
            <p className="text-slate-600 mt-1">
              Monitor your scraping performance and usage metrics
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              className="input w-32"
            >
              <option value="24h">Last 24h</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            
            <button className="btn btn-outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </button>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          {metrics.map((metric, index) => (
            <div key={index} className="metric-card">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg bg-slate-100 ${metric.color}`}>
                  {metric.icon}
                </div>
                <span className={`text-xs font-medium ${
                  metric.changeType === 'positive' ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {metric.change}
                </span>
              </div>
              <div className="metric-value">{metric.value}</div>
              <div className="metric-label">{metric.title}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Usage Metrics */}
          <div className="card">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Usage Overview</h2>
            </div>
            <div className="p-6">
              {usageLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="h-10 w-10 bg-slate-200 rounded-lg animate-pulse"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 rounded animate-pulse"></div>
                        <div className="h-3 bg-slate-200 rounded w-2/3 animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {usageMetrics.map((metric, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className={`p-1.5 rounded-lg bg-slate-100 ${metric.color}`}>
                            {metric.icon}
                          </div>
                          <span className="text-sm font-medium text-slate-900">{metric.title}</span>
                        </div>
                        <span className="text-sm text-slate-600">
                          {metric.value} / {metric.limit.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            metric.percentage > 90 ? 'bg-red-500' : 
                            metric.percentage > 75 ? 'bg-amber-500' : 'bg-teal-500'
                          }`}
                          style={{ width: `${Math.min(metric.percentage, 100)}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {metric.percentage.toFixed(1)}% of limit used
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Performance Chart */}
          <div className="card">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Performance Trends</h2>
            </div>
            <div className="p-6">
              <div className="h-64 bg-slate-100/50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">Performance chart will be displayed here</p>
                  <p className="text-sm text-slate-500 mt-2">
                    Shows success rate, response time, and request volume over time
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Top URLs */}
          <div className="card">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Top URLs</h2>
            </div>
            <div className="p-6">
              {analyticsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <div className="h-8 w-8 bg-slate-200 rounded animate-pulse"></div>
                      <div className="flex-1 space-y-1">
                        <div className="h-3 bg-slate-200 rounded animate-pulse"></div>
                        <div className="h-2 bg-slate-200 rounded w-1/2 animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : analytics?.topUrls?.length > 0 ? (
                <div className="space-y-3">
                  {analytics.topUrls.slice(0, 5).map((url: any, index: number) => (
                    <div key={index} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-50">
                      <div className="h-8 w-8 bg-teal-100 rounded-lg flex items-center justify-center">
                        <span className="text-xs font-medium text-teal-600">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {new URL(url.url).hostname}
                        </p>
                        <p className="text-xs text-slate-500">{url.count} requests</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Globe className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">No URL data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Error Analysis */}
          <div className="card">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Error Analysis</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-emerald-100">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="text-sm text-slate-900">Success Rate</span>
                  </div>
                  <span className="text-sm font-medium text-emerald-600">
                    {analytics?.successRate || 0}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-red-100">
                      <XCircle className="h-4 w-4 text-red-600" />
                    </div>
                    <span className="text-sm text-slate-900">Error Rate</span>
                  </div>
                  <span className="text-sm font-medium text-red-600">
                    {analytics?.errorRate || 0}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-cyan-100">
                      <Zap className="h-4 w-4 text-cyan-600" />
                    </div>
                    <span className="text-sm text-slate-900">Avg Response Time</span>
                  </div>
                  <span className="text-sm font-medium text-slate-900">
                    {analytics?.avgResponseTime || 0}s
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* System Health */}
          <div className="card">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">System Health</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-green-100">
                      <Activity className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-sm text-slate-900">System Status</span>
                  </div>
                  <span className="status-success">Healthy</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-teal-100">
                      <Globe className="h-4 w-4 text-teal-600" />
                    </div>
                    <span className="text-sm text-slate-900">Active Jobs</span>
                  </div>
                  <span className="text-sm font-medium text-slate-900">
                    {analytics?.activeJobs || 0}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-purple-100">
                      <Database className="h-4 w-4 text-purple-600" />
                    </div>
                    <span className="text-sm text-slate-900">Data Volume</span>
                  </div>
                  <span className="text-sm font-medium text-slate-900">
                    {analytics?.dataVolume || 0} MB
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EnterpriseAnalytics









