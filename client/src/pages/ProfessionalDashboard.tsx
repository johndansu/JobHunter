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
  Play,
  ArrowRight,
  Users,
  DollarSign
} from 'lucide-react'
import { authService } from '@/services/authService'
import { jobService } from '@/services/jobService'
import { dataService } from '@/services/dataService'
import { formatDistanceToNow } from 'date-fns'

const ProfessionalDashboard = () => {
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
        return 'bg-green-100 text-green-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      case 'RUNNING':
        return 'bg-teal-100 text-teal-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (statsLoading || jobsLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-surface border-b border-border px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-secondary-200 rounded w-64 mb-2"></div>
              <div className="h-4 bg-secondary-200 rounded w-96"></div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="h-4 bg-secondary-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-secondary-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface border-b border-border px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text-primary">Enterprise Dashboard</h1>
              <p className="text-text-muted mt-1">Monitor and manage your data extraction operations</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-success bg-green-50 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                <span>All Systems Operational</span>
              </div>
              <Link
                to="/jobs/create"
                className="btn btn-primary px-6 py-2 rounded-lg font-semibold flex items-center"
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
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-muted mb-1">Active Jobs</p>
                <p className="text-3xl font-bold text-text-primary">
                  {userStats?.jobs?.active || 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-primary-100">
                <Briefcase className="h-6 w-6 text-primary-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-success">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>+12.5% from last month</span>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-muted mb-1">Data Points</p>
                <p className="text-3xl font-bold text-text-primary">
                  {(userStats?.data?.totalDataPoints || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-success/10">
                <Database className="h-6 w-6 text-success" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-success">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>+8.2% from last month</span>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-muted mb-1">Success Rate</p>
                <p className="text-3xl font-bold text-text-primary">
                  {userStats?.jobs?.total 
                    ? Math.round((userStats.jobs.completed / userStats.jobs.total) * 100)
                    : 0}%
                </p>
              </div>
              <div className="p-3 rounded-xl bg-warning/10">
                <TrendingUp className="h-6 w-6 text-warning" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-success">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>+2.1% from last month</span>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-muted mb-1">Monthly Savings</p>
                <p className="text-3xl font-bold text-text-primary">$12.4K</p>
              </div>
              <div className="p-3 rounded-xl bg-secondary-100">
                <DollarSign className="h-6 w-6 text-secondary-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-success">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>+15.3% from last month</span>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Jobs */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="px-6 py-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-text-primary">Recent Scraping Jobs</h3>
                  <Link
                    to="/jobs"
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center"
                  >
                    View All
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </div>
              </div>
              <div className="p-6">
                {jobs?.data?.length ? (
                  <div className="space-y-4">
                    {jobs.data.map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg hover:bg-secondary-100 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(job.status)}
                            <div>
                              <p className="font-semibold text-text-primary">{job.name}</p>
                              <p className="text-sm text-text-muted">
                                {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                            {job.status}
                          </span>
                          <button className="text-text-muted hover:text-text-primary">
                            <Settings className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="bg-primary-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <Briefcase className="h-8 w-8 text-primary-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-text-primary mb-2">No scraping jobs yet</h4>
                    <p className="text-text-muted mb-4">Create your first job to start extracting data</p>
                    <Link
                      to="/jobs/create"
                      className="btn btn-primary inline-flex items-center px-4 py-2 rounded-lg"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Job
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions & Recent Data */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="card">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-lg font-semibold text-text-primary">Quick Actions</h3>
              </div>
              <div className="p-6 space-y-3">
                <Link
                  to="/jobs/create"
                  className="flex items-center p-3 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                >
                  <Plus className="h-5 w-5 text-primary-600 mr-3" />
                  <span className="font-medium text-text-primary">Create New Job</span>
                </Link>
                <Link
                  to="/test-scraping"
                  className="flex items-center p-3 bg-success/10 rounded-lg hover:bg-success/20 transition-colors"
                >
                  <Play className="h-5 w-5 text-success mr-3" />
                  <span className="font-medium text-text-primary">Test Scraping</span>
                </Link>
                <Link
                  to="/data"
                  className="flex items-center p-3 bg-secondary-50 rounded-lg hover:bg-secondary-100 transition-colors"
                >
                  <BarChart3 className="h-5 w-5 text-secondary-600 mr-3" />
                  <span className="font-medium text-text-primary">View Analytics</span>
                </Link>
              </div>
            </div>

            {/* Recent Data */}
            <div className="card">
              <div className="px-6 py-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-text-primary">Recent Data</h3>
                  <Link
                    to="/data"
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    View All
                  </Link>
                </div>
              </div>
              <div className="p-6">
                {recentData?.data?.length ? (
                  <div className="space-y-3">
                    {recentData.data.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                        <div>
                          <p className="font-medium text-text-primary">{item.job?.name}</p>
                          <p className="text-sm text-text-muted">
                            {formatDistanceToNow(new Date(item.scrapedAt), { addSuffix: true })}
                          </p>
                        </div>
                        <Database className="h-4 w-4 text-text-muted" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Database className="h-8 w-8 text-text-muted mx-auto mb-2" />
                    <p className="text-sm text-text-muted">No data yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Enterprise Features */}
        <div className="bg-gradient-to-r from-primary-600 to-success rounded-xl p-8 text-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-white/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Enterprise Security</h3>
              <p className="text-white/80">Bank-level encryption and compliance</p>
            </div>
            <div className="text-center">
              <div className="bg-white/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Globe className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Global Infrastructure</h3>
              <p className="text-white/80">99.9% uptime with worldwide coverage</p>
            </div>
            <div className="text-center">
              <div className="bg-white/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">24/7 Support</h3>
              <p className="text-white/80">Dedicated account managers</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfessionalDashboard
