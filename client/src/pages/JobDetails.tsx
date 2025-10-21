import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Edit, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Activity,
  Database,
  Globe,
  Calendar,
  Settings,
  BarChart3,
  Download,
  Eye
} from 'lucide-react'
import { jobService } from '@/services/jobService'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

const JobDetails = () => {
  const { id } = useParams<{ id: string }>()
  const [isLoading, setIsLoading] = useState(false)

  const { data: job, isLoading: jobLoading, refetch } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobService.getJob(id!),
    enabled: !!id,
  })

  const { data: executions } = useQuery({
    queryKey: ['job-executions', id],
    queryFn: () => jobService.getJobExecutions(id!),
    enabled: !!id,
  })

  const handleStartJob = async () => {
    if (!job) return
    setIsLoading(true)
    try {
      await jobService.startJob(job.id)
      toast.success('Job started successfully!')
      refetch()
    } catch (error) {
      console.error('Failed to start job:', error)
      toast.error('Failed to start job')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStopJob = async () => {
    if (!job) return
    setIsLoading(true)
    try {
      await jobService.stopJob(job.id)
      toast.success('Job stopped successfully!')
      refetch()
    } catch (error) {
      console.error('Failed to stop job:', error)
      toast.error('Failed to stop job')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteJob = async () => {
    if (!job) return
    if (window.confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      try {
        await jobService.deleteJob(job.id)
        toast.success('Job deleted successfully!')
        // Navigate back to jobs list
        window.location.href = '/jobs'
      } catch (error) {
        console.error('Failed to delete job:', error)
        toast.error('Failed to delete job')
      }
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'RUNNING':
        return <Activity className="h-5 w-5 text-teal-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-600" />
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

  if (jobLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>
                <div>
                  <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-32 mt-2 animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link to="/jobs" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Job Details</h1>
                  <p className="text-gray-600 mt-1">View and manage your scraping job</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center py-12">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Job Not Found</h3>
              <p className="text-gray-600 mb-4">The job you're looking for doesn't exist or has been deleted.</p>
              <Link
                to="/jobs"
                className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all duration-200 inline-flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Jobs
              </Link>
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
            <div className="flex items-center space-x-4">
              <Link to="/jobs" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{job.name}</h1>
                <p className="text-gray-600 mt-1">
                  {job.description || 'Web scraping job details and management'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Job System Active</span>
              </div>
              <button
                onClick={() => refetch()}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors inline-flex items-center"
                title="Refresh job details"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Job Status and Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(job.status)}`}>
                  {job.status}
                </span>
                {getStatusIcon(job.status)}
              </div>
              
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Created {formatDistanceToNow(new Date(job.createdAt))} ago</span>
                </div>
                {job.lastRunAt && (
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>Last run {formatDistanceToNow(new Date(job.lastRunAt))} ago</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {job.status === 'PENDING' || job.status === 'PAUSED' ? (
                <button
                  onClick={handleStartJob}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Job
                </button>
              ) : job.status === 'RUNNING' ? (
                <button
                  onClick={handleStopJob}
                  disabled={isLoading}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Stop Job
                </button>
              ) : null}
              
              <Link
                to={`/jobs/${job.id}/edit`}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
              
              <button
                onClick={handleDeleteJob}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Job Information */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Basic Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Job Details</h2>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Globe className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Target URL</p>
                    <a 
                      href={job.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-teal-600 hover:text-teal-700 break-all"
                    >
                      {job.url}
                    </a>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Database className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Data Selectors</p>
                    <p className="text-gray-600">
                      {job.config?.selectors?.length || 0} configured selectors
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Settings className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Configuration</p>
                    <p className="text-gray-600">
                      Delay: {job.config?.delay || 1}s, Timeout: {job.config?.timeout || 30}s
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Execution History */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Execution History</h2>
              
              {executions && executions.length > 0 ? (
                <div className="space-y-4">
                  {executions.slice(0, 5).map((execution) => (
                    <div key={execution.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(execution.status)}
                        <div>
                          <p className="font-medium text-gray-900">
                            Started {formatDistanceToNow(new Date(execution.startedAt))} ago
                          </p>
                          <p className="text-sm text-gray-600">
                            {execution.pagesScraped} pages, {execution.dataPoints} data points
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(execution.status)}`}>
                          {execution.status}
                        </span>
                        {execution.duration && (
                          <p className="text-sm text-gray-600 mt-1">
                            {Math.round(execution.duration / 1000)}s
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Executions Yet</h3>
                  <p className="text-gray-600">This job hasn't been run yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                <Link
                  to={`/data?jobId=${job.id}`}
                  className="w-full bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Data
                </Link>
                
                <button className="w-full bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics
                </button>
                
                <button className="w-full bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center">
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </button>
              </div>
            </div>

            {/* Job Statistics */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Executions</span>
                  <span className="font-semibold text-gray-900">{executions?.length || 0}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Pages Scraped</span>
                  <span className="font-semibold text-gray-900">
                    {executions?.reduce((sum, ex) => sum + ex.pagesScraped, 0) || 0}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Data Points</span>
                  <span className="font-semibold text-gray-900">
                    {executions?.reduce((sum, ex) => sum + ex.dataPoints, 0) || 0}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Success Rate</span>
                  <span className="font-semibold text-gray-900">
                    {executions && executions.length > 0 
                      ? Math.round((executions.filter(ex => ex.status === 'COMPLETED').length / executions.length) * 100)
                      : 0}%
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

export default JobDetails