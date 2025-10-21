import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  ArrowLeft,
  Play,
  Pause,
  Trash2,
  Edit,
  RefreshCw,
  Database,
  Settings,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  AlertTriangle,
  Globe,
  Calendar,
  BarChart3,
  Download,
  Eye,
  ExternalLink,
  Briefcase,
  MoreVertical,
  LogOut,
  User
} from 'lucide-react'
import { jobService } from '@/services/jobService'
import { formatDistanceToNow } from 'date-fns'
import type { Job } from '@/types'
import { useAuthStore } from '@/store/authStore'

// Enhanced component to display scraped data with beautiful design
const DataDisplay = ({ data }: { data: any }) => {
  // Parse data if it's a JSON string
  let parsedData = data
  if (typeof data === 'string') {
    try {
      parsedData = JSON.parse(data)
    } catch (e) {
      console.error('Failed to parse data:', e)
    }
  }

  if (!parsedData || typeof parsedData !== 'object') {
    return (
      <div className="text-center py-8">
        <Database className="h-12 w-12 text-slate-400 mx-auto mb-3" />
        <p className="text-sm text-slate-600">No data available</p>
      </div>
    )
  }

  const formatFieldName = (key: string) => {
    return key
      .replace(/[._]/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim()
  }

  const formatValue = (value: any) => {
    if (typeof value === 'string') {
      return value.trim()
    }
    if (Array.isArray(value)) {
      return value.length
    }
    return JSON.stringify(value)
  }

  return (
    <div className="space-y-4">
      {Object.entries(parsedData).map(([key, value]) => (
        <div key={key} className="bg-gradient-to-r from-teal-50 to-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
              <h3 className="font-semibold text-slate-900">
                {formatFieldName(key)}
              </h3>
            </div>
            {Array.isArray(value) && (
              <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs font-medium rounded-full">
                {value.length} items
              </span>
            )}
          </div>

          <div className="bg-white rounded-lg p-3 border border-slate-200">
            {Array.isArray(value) ? (
              <div className="space-y-3">
                {value.slice(0, 3).map((item, index) => (
                  <div key={index} className="group">
                    <div className="flex items-start space-x-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 bg-teal-100 text-teal-600 text-xs font-medium rounded-full flex-shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-900 break-words">
                          {typeof item === 'string' ? item.trim() : JSON.stringify(item, null, 2)}
                        </div>
                      </div>
                    </div>
                      {index < value.length - 1 && (
                        <div className="ml-7 mt-2 border-b border-slate-200"></div>
                      )}
                  </div>
                ))}
                {value.length > 3 && (
                  <div className="text-center pt-2">
                    <span className="text-xs text-teal-600 font-medium">
                      +{value.length - 3} more items
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-slate-900 break-words">
                {formatValue(value)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

const EnterpriseJobDetails = () => {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('overview')
  const { user, logout } = useAuthStore()

  const { data: job, isLoading, error, refetch } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobService.getJob(id!),
    enabled: !!id
  })

  // Cast job to proper type
  const jobData = job as Job | undefined

  // Handle success/error with useEffect
  useEffect(() => {
    if (jobData) {
      console.log('âœ… Job loaded:', jobData);
    }
    if (error) {
      console.error('âŒ Job loading error:', error);
    }
  }, [jobData, error])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-emerald-600" />
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'RUNNING':
        return <Activity className="h-5 w-5 text-teal-600 animate-pulse" />
      case 'PAUSED':
        return <Pause className="h-5 w-5 text-amber-500" />
      default:
        return <Clock className="h-5 w-5 text-slate-500" />
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading job details...</p>
        </div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Job Not Found</h2>
          <p className="text-slate-600 mb-4">The job you're looking for doesn't exist or has been deleted.</p>
          <Link to="/jobs" className="btn btn-primary">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Link>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Eye className="h-4 w-4" /> },
    { id: 'data', label: 'Data', icon: <Database className="h-4 w-4" /> },
    { id: 'executions', label: 'Executions', icon: <Activity className="h-4 w-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> }
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/dashboard" className="text-2xl font-bold text-slate-900">
              JobHunter <span className="text-teal-600">Pro</span>
            </Link>

            <nav className="hidden md:flex items-center space-x-8">
              <Link to="/dashboard" className="text-slate-600 hover:text-slate-900 font-medium">Dashboard</Link>
              <Link to="/jobs" className="text-slate-900 font-semibold">Job Searches</Link>
              <Link to="/data" className="text-slate-600 hover:text-slate-900 font-medium">Results</Link>
              <Link to="/analytics" className="text-slate-600 hover:text-slate-900 font-medium">Analytics</Link>
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
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-slate-600 mb-6">
          <Link to="/jobs" className="hover:text-slate-900">Jobs</Link>
          <span>/</span>
          <span className="text-slate-900">{jobData?.name}</span>
        </div>

        {/* Job Header */}
        <div className="card rounded-2xl overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-8">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  {getStatusIcon(jobData?.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h1 className="text-2xl font-bold text-white">{jobData?.name}</h1>
                    {getStatusBadge(jobData?.status)}
                  </div>
                  <p className="text-white/80 mb-4">
                    {jobData?.description || 'No description provided'}
                  </p>
                  <div className="flex items-center space-x-6 text-white/80 text-sm">
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4" />
                      <a
                        href={jobData?.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-white transition-colors"
                      >
                        {jobData?.url}
                      </a>
                      <ExternalLink className="h-3 w-3" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>Created {formatDistanceToNow(new Date(jobData?.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <button className="btn bg-white/20 text-white hover:bg-white/30">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </button>
                <button className="btn bg-white/20 text-white hover:bg-white/30">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </button>
                <button className="btn bg-white/20 text-white hover:bg-white/30">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="card mb-8">
          <div className="border-b border-slate-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-teal-600 text-teal-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Job Configuration */}
            <div className="lg:col-span-2">
              <div className="card">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-xl font-semibold text-slate-900">Job Configuration</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="label">Job Name</label>
                      <p className="text-slate-900">{jobData?.name}</p>
                    </div>
                    <div>
                      <label className="label">Description</label>
                      <p className="text-slate-900">{jobData?.description || 'No description'}</p>
                    </div>
                    <div>
                      <label className="label">Target URL</label>
                      <a
                        href={jobData?.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-600 hover:text-teal-700 flex items-center space-x-1"
                      >
                        <span>{jobData?.url}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    {jobData?.schedule && (
                      <div>
                        <label className="label">Schedule</label>
                        <p className="text-slate-900">{jobData?.schedule}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Job Statistics */}
            <div className="space-y-6">
              <div className="card">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-xl font-semibold text-slate-900">Statistics</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Status</span>
                      {getStatusBadge(jobData?.status)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Created</span>
                      <span className="text-slate-900">
                        {formatDistanceToNow(new Date(jobData?.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Last Updated</span>
                      <span className="text-slate-900">
                        {formatDistanceToNow(new Date(jobData?.updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Next Run</span>
                      <span className="text-slate-900">
                        {jobData?.nextRunAt 
                          ? formatDistanceToNow(new Date(jobData?.nextRunAt), { addSuffix: true })
                          : 'Not scheduled'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="card">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-xl font-semibold text-slate-900">Quick Actions</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <button className="w-full btn btn-primary">
                      <Play className="h-4 w-4 mr-2" />
                      Run Now
                    </button>
                    <button className="w-full btn btn-outline">
                      <Pause className="h-4 w-4 mr-2" />
                      Pause Job
                    </button>
                    <button className="w-full btn btn-outline">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Job
                    </button>
                    <button className="w-full btn btn-outline text-red-600 hover:text-red-700 hover:border-red-300">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Job
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="card">
              <div className="p-4 md:p-6 border-b border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h2 className="text-lg md:text-xl font-semibold text-slate-900">Job Results</h2>
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <button className="btn btn-outline text-sm">
                      <Download className="h-4 w-4 mr-1 md:mr-2" />
                      <span className="hidden sm:inline">Export</span>
                    </button>
                    <button className="btn btn-primary text-sm">
                      <RefreshCw className="h-4 w-4 mr-1 md:mr-2" />
                      <span className="hidden sm:inline">Refresh</span>
                    </button>
                  </div>
                </div>
              </div>
            <div className="p-6">
              {jobData?.scrapedData && jobData?.scrapedData.length > 0 ? (
                <div className="space-y-6">
                  {jobData?.scrapedData.map((data: any, index: number) => (
                    <div key={index} className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 p-4 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Database className="h-4 w-4 text-slate-600" />
                            <span className="text-sm font-medium text-slate-900">
                              Data #{index + 1}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">
                            Scraped {formatDistanceToNow(new Date(data.scrapedAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <div className="p-6">
                        <DataDisplay data={data.data} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Database className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Data Yet</h3>
                  <p className="text-slate-600 mb-6">This job hasn't been executed yet or no data was scraped.</p>
                  <button className="btn btn-primary">
                    <Play className="h-4 w-4 mr-2" />
                    Run Job Now
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'executions' && (
          <div className="card">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Execution History</h2>
            </div>
            <div className="p-6">
              {jobData?.executions && jobData?.executions.length > 0 ? (
                <div className="space-y-4">
                  {jobData?.executions.map((execution: any, index: number) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(execution.status)}
                          <div>
                            <h3 className="font-medium text-slate-900">
                              Execution #{execution.executionNumber}
                            </h3>
                            <p className="text-sm text-slate-600">
                              Started {formatDistanceToNow(new Date(execution.startedAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(execution.status)}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">Duration:</span>
                          <p className="font-medium text-slate-900">
                            {execution.duration ? `${execution.duration}ms` : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500">Data Points:</span>
                          <p className="font-medium text-slate-900">{execution.dataPoints || 0}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Pages Scraped:</span>
                          <p className="font-medium text-slate-900">{execution.pagesScraped || 0}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Status:</span>
                          <p className="font-medium text-slate-900">{execution.status}</p>
                        </div>
                      </div>
                      {execution.error && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-700">{execution.error}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Executions Yet</h3>
                  <p className="text-slate-600 mb-6">This job hasn't been executed yet.</p>
                  <button className="btn btn-primary">
                    <Play className="h-4 w-4 mr-2" />
                    Run Job Now
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="card">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Job Settings</h2>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="label">Job Name</label>
                  <input
                    type="text"
                    defaultValue={jobData?.name}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea
                    defaultValue={jobData?.description || ''}
                    className="input"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="label">Target URL</label>
                  <input
                    type="url"
                    defaultValue={jobData?.url}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Schedule (Cron Expression)</label>
                  <input
                    type="text"
                    defaultValue={jobData?.schedule || ''}
                    className="input"
                    placeholder="0 */6 * * * (every 6 hours)"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button className="btn btn-outline">Cancel</button>
                  <button className="btn btn-primary">Save Changes</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EnterpriseJobDetails
















