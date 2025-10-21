import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { 
  Briefcase, 
  Database, 
  Clock, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  Activity,
  Zap,
  Globe,
  Shield,
  Plus,
  BarChart3,
  Settings,
  Play
} from 'lucide-react'
import { authService } from '@/services/authService'
import { jobService } from '@/services/jobService'
import { dataService } from '@/services/dataService'
import { formatDistanceToNow } from 'date-fns'

const Dashboard = () => {
  const { data: userStats, isLoading: statsLoading } = useQuery({
    queryKey: ['user-stats'],
    queryFn: authService.getUserStats,
  })

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['jobs', { limit: 5 }],
    queryFn: () => jobService.getJobs({ limit: 5 }),
  })

  const { data: recentData, isLoading: dataLoading } = useQuery({
    queryKey: ['recent-data', { limit: 5 }],
    queryFn: () => dataService.getData({ limit: 5 }),
  })

  const stats = [
    {
      name: 'Total Jobs',
      value: userStats?.jobs?.total || 0,
      icon: Briefcase,
      color: 'text-teal-600',
      bgColor: 'bg-teal-100',
    },
    {
      name: 'Active Jobs',
      value: userStats?.jobs?.active || 0,
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Data Points',
      value: userStats?.data?.totalDataPoints || 0,
      icon: Database,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      name: 'Success Rate',
      value: userStats?.jobs?.total 
        ? Math.round((userStats.jobs.completed / userStats.jobs.total) * 100)
        : 0,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      suffix: '%',
    },
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'RUNNING':
        return <Activity className="h-4 w-4 text-teal-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'badge-success'
      case 'FAILED':
        return 'badge-error'
      case 'RUNNING':
        return 'badge-info'
      default:
        return 'badge-secondary'
    }
  }

  if (statsLoading || jobsLoading || dataLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Enterprise Dashboard</h1>
              <p className="text-gray-600 mt-1">Monitor and manage your data extraction operations</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>All Systems Operational</span>
              </div>
              <Link
                to="/jobs/create"
                className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all duration-200 flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Scraping Job
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.name} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">{stat.name}</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stat.value.toLocaleString()}{stat.suffix}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm text-green-600">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span>+12.5% from last month</span>
                </div>
              </div>
            )
          })}
        </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Jobs */}
        <div className="card">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-medium text-text-primary">Recent Jobs</h3>
            <p className="text-sm text-text-muted">Your latest scraping jobs</p>
          </div>
          <div className="p-6">
            {jobs?.data?.length ? (
              <div className="space-y-4">
                {jobs.data.map((job) => (
                  <div key={job.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(job.status)}
                      <div>
                        <p className="text-sm font-medium text-text-primary">{job.name}</p>
                        <p className="text-xs text-text-muted">{job.url}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`badge ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                      <span className="text-xs text-text-muted">
                        {job.lastRunAt && formatDistanceToNow(new Date(job.lastRunAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Briefcase className="mx-auto h-12 w-12 text-text-muted" />
                <h3 className="mt-2 text-sm font-medium text-text-primary">No jobs yet</h3>
                <p className="mt-1 text-sm text-text-muted">Get started by creating your first scraping job.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Data */}
        <div className="card">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-medium text-text-primary">Recent Data</h3>
            <p className="text-sm text-text-muted">Latest scraped data points</p>
          </div>
          <div className="p-6">
            {recentData?.data?.length ? (
              <div className="space-y-4">
                {recentData.data.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Database className="h-4 w-4 text-purple-600" />
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {item.job?.name || 'Unknown Job'}
                        </p>
                        <p className="text-xs text-text-muted">{item.url}</p>
                      </div>
                    </div>
                    <span className="text-xs text-text-muted">
                      {formatDistanceToNow(new Date(item.scrapedAt), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Database className="mx-auto h-12 w-12 text-text-muted" />
                <h3 className="mt-2 text-sm font-medium text-text-primary">No data yet</h3>
                <p className="mt-1 text-sm text-text-muted">Run some jobs to see scraped data here.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Executions */}
      {userStats?.recentExecutions?.length > 0 && (
        <div className="card">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-medium text-text-primary">Recent Executions</h3>
            <p className="text-sm text-text-muted">Latest job execution results</p>
          </div>
          <div className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="table-header">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-primary uppercase tracking-wider">
                      Job
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-primary uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-primary uppercase tracking-wider">
                      Pages
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-primary uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-primary uppercase tracking-wider">
                      Started
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-surface divide-y divide-border">
                  {userStats.recentExecutions.map((execution) => (
                    <tr key={execution.id} className="table-row">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-text-primary">
                            {execution.job?.name}
                          </div>
                          <div className="text-sm text-text-muted">
                            {execution.job?.url}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${getStatusColor(execution.status)}`}>
                          {execution.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                        {execution.pagesScraped}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                        {execution.duration ? `${Math.round(execution.duration / 1000)}s` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">
                        {formatDistanceToNow(new Date(execution.startedAt), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

export default Dashboard
