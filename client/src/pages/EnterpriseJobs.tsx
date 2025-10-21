import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Play, 
  Pause, 
  Trash2, 
  Edit,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  RefreshCw,
  Database,
  Settings,
  BarChart3,
  Globe,
  Zap,
  ChevronLeft,
  ChevronRight
,
  LogOut,
  User
} from 'lucide-react'
import { jobService } from '@/services/jobService'
import { formatDistanceToNow } from 'date-fns'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import type { PaginatedResponse, Job } from '@/types'

const EnterpriseJobs = () => {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const { user, logout } = useAuthStore()

  const { data: jobs, isLoading, refetch, error } = useQuery({
    queryKey: ['jobs', { page, search, status: statusFilter }],
    queryFn: () => jobService.getJobs({ page, search, status: statusFilter, limit: 20 }),
    enabled: !!user // Only run if user is authenticated
  })

  // Cast to proper type
  const jobsData = jobs as PaginatedResponse<Job> | undefined

  // Handle success/error with useEffect
  useEffect(() => {
    if (jobsData) {
      console.log('âœ… Jobs loaded:', jobsData);
    }
    if (error) {
      console.error('âŒ Jobs loading error:', error);
    }
  }, [jobsData, error])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-emerald-600" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'RUNNING':
        return <Activity className="h-4 w-4 text-teal-600 animate-pulse" />
      case 'PAUSED':
        return <Pause className="h-4 w-4 text-amber-500" />
      default:
        return <Clock className="h-4 w-4 text-slate-500" />
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-emerald-600 bg-emerald-50'
      case 'FAILED':
        return 'text-red-600 bg-red-50'
      case 'RUNNING':
        return 'text-teal-600 bg-teal-50'
      case 'PAUSED':
        return 'text-amber-600 bg-amber-50'
      default:
        return 'text-slate-600 bg-slate-50'
    }
  }

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
                <Link to="/jobs" className="nav-item-active">Jobs</Link>
                <Link to="/data" className="nav-item">Data</Link>
                <Link to="/analytics" className="nav-item">Analytics</Link>
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
            <h1 className="text-3xl font-bold text-slate-900">Scraping Jobs</h1>
            <p className="text-slate-600 mt-1">
              Manage and monitor your web scraping jobs
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => refetch()}
              className="btn btn-outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
            
            <Link to="/jobs/create" className="btn btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              New Job
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search jobsData?..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-full sm:w-48"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="RUNNING">Running</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
              <option value="PAUSED">Paused</option>
            </select>
            
            <button className="btn btn-outline">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </button>
          </div>
        </div>

        {/* Jobs List */}
        <div className="card">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">
                All Jobs ({jobs?.data?.length || 0} jobs loaded)
              </h2>
              
              {error && (
                <div className="flex items-center space-x-2 text-red-600">
                  <span className="text-sm">Failed to load jobs</span>
                  <button 
                    onClick={() => refetch()}
                    className="btn btn-sm btn-outline"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-6">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4">
                    <div className="h-12 w-12 bg-slate-200 rounded-lg animate-pulse"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 rounded animate-pulse"></div>
                      <div className="h-3 bg-slate-200 rounded w-2/3 animate-pulse"></div>
                    </div>
                    <div className="h-8 w-20 bg-slate-200 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : jobs?.data?.length > 0 ? (
              <div className="space-y-4">
                {jobsData?.data.map((job: any) => (
                  <div key={job.id} className="card-hover p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-slate-100 rounded-lg">
                          {getStatusIcon(job.status)}
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-slate-900">{job.name}</h3>
                            {getStatusBadge(job.status)}
                          </div>
                          
                          <p className="text-sm text-slate-600 mb-2">
                            {job.description || 'No description provided'}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-xs text-slate-500">
                            <div className="flex items-center space-x-1">
                              <Globe className="h-3 w-3" />
                              <span className="truncate max-w-xs">{job.url}</span>
                            </div>
                            <span>Created {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</span>
                            {job.schedule && (
                              <span className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>Scheduled</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Link 
                          to={`/jobs/${job.id}`}
                          className="btn btn-sm btn-outline"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Link>
                        
                        <button className="btn btn-sm btn-outline">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </button>
                        
                        <button className="btn btn-sm btn-outline">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="p-4 bg-slate-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                  <Database className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">No Jobs Found</h3>
                <p className="text-slate-600 mb-6">
                  {search || statusFilter 
                    ? 'No jobs match your current filters. Try adjusting your search criteria.'
                    : 'Create your first scraping job to get started with data extraction.'
                  }
                </p>
                <Link to="/jobs/create" className="btn btn-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Job
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Pagination */}
        {jobs?.data?.length > 0 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-slate-600">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, jobsData?.total || 0)} of {jobsData?.total || 0} jobs
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="btn btn-sm btn-outline disabled:opacity-50"
              >
                Previous
              </button>
              
              <span className="px-3 py-1 text-sm text-slate-600">
                Page {page}
              </span>
              
              <button
                onClick={() => setPage(page + 1)}
                disabled={!jobsData?.hasMore}
                className="btn btn-sm btn-outline disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EnterpriseJobs














