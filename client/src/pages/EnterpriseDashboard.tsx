import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  Plus, 
  Activity, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  BarChart3,
  Briefcase,
  Globe,
  Database,
  Settings,
  Search,
  Filter,
  Download,
  Play,
  Pause,
  MoreVertical,
  RefreshCw,
  LogOut,
  User,
  Users
} from 'lucide-react'
import { jobService } from '@/services/jobService'
import { dataService } from '@/services/dataService'
import { formatDistanceToNow } from 'date-fns'
import { api } from '@/services/api'
import { useAuthStore } from '@/store/authStore'

const EnterpriseDashboard = () => {
  const [timeRange, setTimeRange] = useState('7d')
  const { user, logout } = useAuthStore()

  // Fetch dashboard data only ifis authenticated
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-analytics', timeRange],
    queryFn: async () => {
      const response = await api.get(`/analytics/dashboard?timeRange=${timeRange}`)
      return response.data.data
    },
    enabled: !!user, // Only run if user is authenticated
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false
  })

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['dashboard-jobs'],
    queryFn: () => jobService.getJobs({ limit: 5 }),
    enabled: !!user, // Only run if user is authenticated
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false
  })

  const { data: recentData, isLoading: dataLoading } = useQuery({
    queryKey: ['dashboard-data'],
    queryFn: () => dataService.getData({ limit: 10 }),
    enabled: !!user, // Only run if user is authenticated
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false
  })

  const metrics = [
    {
      title: "Total Requests",
      value: stats?.totalRequests?.toLocaleString() || "0",
      change: "+12.5%",
      changeType: "positive",
      icon: <Activity className="h-5 w-5" />,
      color: "text-primary"
    },
    {
      title: "Success Rate",
      value: `${stats?.successRate || 0}%`,
      change: "+0.3%",
      changeType: "positive",
      icon: <CheckCircle className="h-5 w-5" />,
      color: "text-success"
    },
    {
      title: "Avg Response Time",
      value: `${stats?.avgResponseTime || 0}s`,
      change: "-15.2%",
      changeType: "positive",
      icon: <Activity className="h-5 w-5" />,
      color: "text-info"
    },
    {
      title: "Active Jobs",
      value: stats?.activeJobs || 0,
      change: "+2",
      changeType: "positive",
      icon: <Globe className="h-5 w-5" />,
      color: "text-warning"
    },
    {
      title: "Data Points",
      value: stats?.totalDataPoints?.toLocaleString() || "0",
      change: "+8.1%",
      changeType: "positive",
      icon: <Database className="h-5 w-5" />,
      color: "text-primary"
    },
    {
      title: "This Month",
      value: `$${stats?.costThisMonth || 0}`,
      change: "+$45.23",
      changeType: "negative",
      icon: <BarChart3 className="h-5 w-5" />,
      color: "text-foreground"
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-success" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-error" />
      case 'RUNNING':
        return <Activity className="h-4 w-4 text-primary animate-pulse" />
      case 'PAUSED':
        return <Pause className="h-4 w-4 text-warning" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="status-success">Completed</span>
      case 'FAILED':
        return <span className="status-error">Failed</span>
      case 'RUNNING':
        return <span className="status-info">Running</span>
      case 'PAUSED':
        return <span className="status-warning">Paused</span>
      default:
        return <span className="status-info">Pending</span>
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/dashboard" className="text-2xl font-bold text-slate-900">
              JobHunter <span className="text-teal-600">Pro</span>
            </Link>

            <nav className="hidden md:flex items-center space-x-8">
              <Link to="/dashboard" className="text-slate-900 font-semibold">Dashboard</Link>
              <Link to="/jobs" className="text-slate-600 hover:text-slate-900 font-medium">Job Searches</Link>
              <Link to="/data" className="text-slate-600 hover:text-slate-900 font-medium">Results</Link>
              <Link to="/analytics" className="text-slate-600 hover:text-slate-900 font-medium">Analytics</Link>
              <Link to="/users" className="text-slate-600 hover:text-slate-900 font-medium">Users</Link>
              <Link to="/settings" className="text-slate-600 hover:text-slate-900 font-medium">Settings</Link>
              
              <div className="flex items-center space-x-4 ml-4 pl-4 border-l border-slate-200">
                <span className="text-sm text-slate-600">{user?.username}</span>
                <button
                  onClick={logout}
                  className="text-slate-600 hover:text-slate-900"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      <div className="container py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Monitor your job search performance and track your results
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
            
            <Link to="/jobs/create" className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all duration-200 inline-flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              New Job
            </Link>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          {metrics.map((metric, index) => (
            <div key={index} className="metric-card">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg bg-muted ${metric.color}`}>
                  {metric.icon}
                </div>
                <span className={`text-xs font-medium ${
                  metric.changeType === 'positive' ? 'text-success' : 'text-error'
                }`}>
                  {metric.change}
                </span>
              </div>
              <div className="metric-value">{metric.value}</div>
              <div className="metric-label">{metric.title}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Jobs */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-foreground">Recent Jobs</h2>
                  <Link to="/jobs" className="btn btn-ghost btn-sm">
                    View All
                  </Link>
                </div>
              </div>
              
              <div className="p-6">
                {jobsLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <div className="h-10 w-10 bg-muted rounded-lg animate-pulse"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded animate-pulse"></div>
                          <div className="h-3 bg-muted rounded w-2/3 animate-pulse"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {jobs?.data?.slice(0, 5).map((job: any) => (
                      <div key={job.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-muted rounded-lg">
                            {getStatusIcon(job.status)}
                          </div>
                          <div>
                            <h3 className="font-medium text-foreground">{job.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          {getStatusBadge(job.status)}
                          <button className="p-1 text-muted-foreground hover:text-foreground">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions & Recent Data */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="card">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-semibold text-foreground">Quick Actions</h2>
              </div>
              <div className="p-6 space-y-3">
                <Link to="/jobs/create" className="btn btn-primary w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Job
                </Link>
                <Link to="/data" className="btn btn-outline w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Link>
                <Link to="/analytics" className="btn btn-outline w-full justify-start">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics
                </Link>
                <Link to="/users" className="btn btn-outline w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Users
                </Link>
                <Link to="/settings" className="btn btn-outline w-full justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </div>
            </div>

            {/* Recent Data */}
            <div className="card">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-semibold text-foreground">Recent Data</h2>
              </div>
              <div className="p-6">
                {dataLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-3">
                        <div className="h-8 w-8 bg-muted rounded animate-pulse"></div>
                        <div className="flex-1 space-y-1">
                          <div className="h-3 bg-muted rounded animate-pulse"></div>
                          <div className="h-2 bg-muted rounded w-1/2 animate-pulse"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentData?.data?.slice(0, 5).map((item: any) => (
                      <div key={item.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Database className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {item.job?.name || 'Unknown Job'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(item.scrapedAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Performance Chart Placeholder */}
        <div className="mt-8">
          <div className="card">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Performance Overview</h2>
                <div className="flex items-center space-x-2">
                  <button className="btn btn-ghost btn-sm">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <select className="input w-32">
                    <option>Success Rate</option>
                    <option>Response Time</option>
                    <option>Requests</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Performance chart will be displayed here</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EnterpriseDashboard









