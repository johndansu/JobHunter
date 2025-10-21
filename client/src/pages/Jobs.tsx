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
  Database
} from 'lucide-react'
import { jobService } from '@/services/jobService'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import ScrapingProgress from '@/components/ScrapingProgress'
import type { PaginatedResponse, Job } from '@/types'

const Jobs = () => {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [scrapingJobId, setScrapingJobId] = useState<string | null>(null)
  const [showProgress, setShowProgress] = useState(false)

  const { data: jobs, isLoading, refetch, error } = useQuery({
    queryKey: ['jobs', { page, search, status: statusFilter }],
    queryFn: () => jobService.getJobs({ page, search, status: statusFilter, limit: 10 })
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

  const handleStartJob = async (jobId: string) => {
    try {
      await jobService.startJob(jobId)
      setScrapingJobId(jobId)
      setShowProgress(true)
      toast.success('Job started successfully!')
      refetch()
    } catch (error) {
      console.error('Failed to start job:', error)
      toast.error('Failed to start job')
    }
  }

  const handleStopJob = async (jobId: string) => {
    try {
      await jobService.stopJob(jobId)
      toast.success('Job stopped successfully!')
      refetch()
    } catch (error) {
      console.error('Failed to stop job:', error)
      toast.error('Failed to stop job')
    }
  }

  const handleDeleteJob = async (jobId: string) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      try {
        await jobService.deleteJob(jobId)
        toast.success('Job deleted successfully!')
        refetch()
      } catch (error) {
        console.error('Failed to delete job:', error)
        toast.error('Failed to delete job')
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Scraping Jobs</h1>
                <p className="text-gray-600 mt-1">Manage your web scraping jobs</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Scraping Jobs</h1>
                <p className="text-gray-600 mt-1">Manage your web scraping jobs</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center py-12">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Jobs</h3>
              <p className="text-gray-600 mb-4">
                {error instanceof Error ? error.message : 'Failed to load jobs'}
              </p>
              <button
                onClick={() => refetch()}
                className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all duration-200 inline-flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </button>
            </div>
          </div>
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
              <h1 className="text-3xl font-bold text-gray-900">Scraping Jobs</h1>
              <p className="text-gray-600 mt-1">
                Manage your web scraping jobs
                {jobs && (
                  <span className="ml-2 text-teal-600">
                    ({jobsData?.data?.length || 0} jobs loaded)
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Job System Active</span>
              </div>
              <button
                onClick={() => refetch()}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors inline-flex items-center"
                title="Refresh jobs list"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
              <Link
                to="/jobs/create"
                className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all duration-200 flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Job
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Jobs
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or URL..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="RUNNING">Running</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
                <option value="PAUSED">Paused</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearch('')
                  setStatusFilter('')
                  setPage(1)
                }}
                className="w-full bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Jobs List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {jobs && jobsData?.data && jobsData?.data.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {jobsData?.data.map((job) => (
                <div key={job.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{job.name}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                        {getStatusIcon(job.status)}
                      </div>
                      
                      {job.description && (
                        <p className="text-gray-600 mb-2">{job.description}</p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>URL: {job.url}</span>
                        <span>Created: {formatDistanceToNow(new Date(job.createdAt))} ago</span>
                        {job.lastRunAt && (
                          <span>Last run: {formatDistanceToNow(new Date(job.lastRunAt))} ago</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {job.status === 'PENDING' || job.status === 'PAUSED' ? (
                        <button
                          onClick={() => handleStartJob(job.id)}
                          className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all duration-200 flex items-center"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Start
                        </button>
                      ) : job.status === 'RUNNING' ? (
                        <button
                          onClick={() => handleStopJob(job.id)}
                          className="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-colors flex items-center"
                        >
                          <Pause className="h-4 w-4 mr-2" />
                          Stop
                        </button>
                      ) : null}
                      
                      <Link
                        to={`/jobs/${job.id}`}
                        className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Link>
                      
                      <Link
                        to={`/jobs/${job.id}/edit`}
                        className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Link>
                      
                      <button
                        onClick={() => handleDeleteJob(job.id)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Jobs Found</h3>
              <p className="text-gray-600 mb-4">
                {search || statusFilter ? 'No jobs match your current filters.' : 'Get started by creating your first scraping job.'}
              </p>
              <Link
                to="/jobs/create"
                className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all duration-200 inline-flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Job
              </Link>
            </div>
          )}
        </div>

        {/* Pagination */}
        {jobs && jobsData?.pagination && jobsData?.pagination.totalPages > 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((jobsData?.pagination.page - 1) * jobsData?.pagination.limit) + 1} to{' '}
                {Math.min(jobsData?.pagination.page * jobsData?.pagination.limit, jobsData?.pagination.total)} of{' '}
                {jobsData?.pagination.total} jobs
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="bg-white border border-gray-300 text-gray-700 px-3 py-1 rounded-md text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-2 text-sm text-gray-600">
                  Page {page} of {jobsData?.pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === jobsData?.pagination.totalPages}
                  className="bg-white border border-gray-300 text-gray-700 px-3 py-1 rounded-md text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Scraping Progress Modal */}
      {showProgress && scrapingJobId && (
        <ScrapingProgress
          jobId={scrapingJobId!}
          isVisible={showProgress}
          onClose={() => {
            setShowProgress(false)
            setScrapingJobId(null)
            refetch()
          }}
        />
      )}
    </div>
  )
}

export default Jobs
