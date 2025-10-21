import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  Download, 
  Search, 
  ExternalLink,
  RefreshCw,
  Briefcase,
  LogOut,
  User,
  MapPin,
  DollarSign,
  Building2,
  Calendar,
  Database,
  Heart
} from 'lucide-react'
import { dataService } from '@/services/dataService'
import { jobService } from '@/services/jobService'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import { api } from '@/services/api'
import { useAuthStore } from '@/store/authStore'

export default function EnterpriseData() {
  const { user, logout } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedJob, setSelectedJob] = useState('')
  const [showSavedOnly, setShowSavedOnly] = useState(false)
  const [savedJobs, setSavedJobs] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('savedJobs')
    return saved ? new Set(JSON.parse(saved)) : new Set()
  })

  const { data: scrapedData, isLoading, refetch } = useQuery({
    queryKey: ['data', selectedJob],
    queryFn: () => dataService.getData({ jobId: selectedJob, limit: 100 })
  })

  const { data: jobs } = useQuery({
    queryKey: ['jobs-list'],
    queryFn: () => jobService.getJobs({ limit: 100 })
  })

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const response = await api.get(`/export?format=${format}${selectedJob ? `&jobId=${selectedJob}` : ''}`, {
        responseType: 'blob'
      })
      
      const blob = new Blob([response.data], { 
        type: format === 'csv' ? 'text/csv' : 'application/json' 
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `scraped-data-${Date.now()}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success(`Exported as ${format.toUpperCase()}`)
    } catch (error) {
      toast.error('Export failed')
    }
  }

  const parseData = (data: any) => {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data)
      } catch (e) {
        return null
      }
    }
    return data
  }

  // Save/unsave job functions
  const toggleSaveJob = (jobKey: string) => {
    setSavedJobs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(jobKey)) {
        newSet.delete(jobKey)
      } else {
        newSet.add(jobKey)
      }
      localStorage.setItem('savedJobs', JSON.stringify([...newSet]))
      return newSet
    })
  }

  const isJobSaved = (jobKey: string) => savedJobs.has(jobKey)

  const allData = scrapedData?.data || []
  const filteredData = allData.filter(item => {
    const parsed = parseData(item.data)
    if (!parsed) return false
    
    // Filter by saved status if showSavedOnly is true
    const jobKey = `${item.id}-${parsed.title || 'untitled'}`
    if (showSavedOnly && !isJobSaved(jobKey)) return false
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return JSON.stringify(parsed).toLowerCase().includes(searchLower)
    }
    
    return true
  })

  // Better job detection - check if MOST items have job-specific fields
  const isJobData = filteredData.length > 0 && (() => {
    let jobCount = 0
    const sampleSize = Math.min(5, filteredData.length)
    
    for (let i = 0; i < sampleSize; i++) {
      const item = parseData(filteredData[i]?.data)
      // Check for job-specific field combinations
      if (item && (
        (item.title && item.company) || // Job APIs
        (item.title && item.salary) ||
        (item.position && item.organization) ||
        item.source === 'Remotive' ||
        item.source === 'The Muse' ||
        item.source === 'Adzuna'
      )) {
        jobCount++
      }
    }
    
    // If more than 60% are job-like, treat as job data
    return (jobCount / sampleSize) > 0.6
  })()

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/dashboard" className="text-2xl font-bold text-slate-900">
              JobHunter <span className="text-teal-600">Pro</span>
            </Link>

            <nav className="hidden md:flex items-center space-x-8">
              <Link to="/dashboard" className="text-slate-600 hover:text-slate-900 font-medium">Dashboard</Link>
              <Link to="/jobs" className="text-slate-600 hover:text-slate-900 font-medium">Job Searches</Link>
              <Link to="/data" className="text-slate-900 font-semibold">Results</Link>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            {isJobData ? 'Job Search Results' : 'Scraped Data'}
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            {isJobData ? 'View and export your job listings' : 'View and export your scraped results'}
          </p>
        </div>

        {/* Filters & Actions */}
        <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search data..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                />
              </div>
              
              <select
                value={selectedJob}
                onChange={(e) => setSelectedJob(e.target.value)}
                className="px-3 sm:px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-sm"
              >
                <option value="">All Jobs</option>
                {jobs?.data?.map((job: any) => (
                  <option key={job.id} value={job.id}>{job.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowSavedOnly(!showSavedOnly)}
                className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm ${
                  showSavedOnly
                    ? 'bg-teal-600 text-white'
                    : 'border border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Heart className={`h-4 w-4 ${showSavedOnly ? 'fill-current' : ''}`} />
                <span>Saved{savedJobs.size > 0 ? ` (${savedJobs.size})` : ''}</span>
              </button>
              <button
                onClick={() => refetch()}
                className="flex items-center space-x-2 px-3 sm:px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm"
              >
                <Download className="h-4 w-4" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => handleExport('json')}
                className="flex items-center space-x-2 px-3 sm:px-4 py-2 border border-teal-600 text-teal-600 rounded-lg hover:bg-teal-50 transition-colors text-sm"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export JSON</span>
                <span className="sm:hidden">JSON</span>
              </button>
            </div>
          </div>
        </div>

        {/* Data Display */}
        {isLoading ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <RefreshCw className="h-8 w-8 text-teal-600 mx-auto mb-3 animate-spin" />
            <p className="text-slate-600">Loading data...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-8 sm:p-12 text-center">
            <Briefcase className="h-10 w-10 sm:h-12 sm:w-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600 mb-2">No data yet</p>
            <p className="text-sm text-slate-500">Run a scraping job to see results here</p>
          </div>
        ) : isJobData ? (
          // Job Listings - Responsive View
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider w-4"></th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Job Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Company</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Location</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Salary</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Source</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredData.map((item: any, index: number) => {
                      const job = parseData(item.data)
                      if (!job) return null
                      const jobKey = `${item.id}-${job.title || 'untitled'}`
                      
                      return (
                        <tr key={index} className="hover:bg-slate-50 transition-colors">
                          <td className="px-2 py-3 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleSaveJob(jobKey)
                              }}
                              className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                              title={isJobSaved(jobKey) ? "Remove from saved" : "Save job"}
                            >
                              <Heart
                                className={`h-4 w-4 transition-colors ${
                                  isJobSaved(jobKey)
                                    ? 'fill-red-500 text-red-500'
                                    : 'text-slate-400 hover:text-red-500'
                                }`}
                              />
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-start space-x-2">
                              <Briefcase className="h-4 w-4 text-teal-600 mt-0.5 flex-shrink-0" />
                              <span className="text-sm font-medium text-slate-900">{job.title || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-2">
                              <Building2 className="h-4 w-4 text-slate-400" />
                              <span className="text-sm text-slate-700">{job.company || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-2">
                              <MapPin className="h-4 w-4 text-slate-400" />
                              <span className="text-sm text-slate-600">{job.location || 'Remote'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-2">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              <span className="text-sm text-slate-700">{job.salary || 'Not specified'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded">
                              {job.type || 'Full-time'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-slate-500">{job.source || 'Unknown'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <a
                              href={job.url || item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 text-teal-600 hover:text-teal-700 text-sm"
                            >
                              <span>Apply</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
                <p className="text-sm text-slate-600">
                  Showing <span className="font-medium">{filteredData.length}</span> {filteredData.length === 1 ? 'job' : 'jobs'}
                </p>
              </div>
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="lg:hidden grid grid-cols-1 gap-4">
              {filteredData.map((item: any, index: number) => {
                const job = parseData(item.data)
                if (!job) return null
                const jobKey = `${item.id}-${job.title || 'untitled'}`

                return (
                  <div key={index} className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900 flex items-start space-x-2 flex-1">
                            <Briefcase className="h-4 w-4 text-teal-600 mt-1 flex-shrink-0" />
                            <span>{job.title || 'N/A'}</span>
                          </h3>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleSaveJob(jobKey)
                            }}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0"
                            title={isJobSaved(jobKey) ? "Remove from saved" : "Save job"}
                          >
                            <Heart
                              className={`h-5 w-5 transition-colors ${
                                isJobSaved(jobKey)
                                  ? 'fill-red-500 text-red-500'
                                  : 'text-slate-400 hover:text-red-500'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded ml-2 flex-shrink-0">
                        {job.type || 'Full-time'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-600 flex items-center space-x-1 mb-3">
                      <Building2 className="h-3 w-3" />
                      <span>{job.company || 'N/A'}</span>
                    </p>

                    <div className="space-y-2 mb-3">
                      <div className="flex items-center space-x-2 text-sm text-slate-600">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        <span>{job.location || 'Remote'}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-slate-700">
                        <DollarSign className="h-3 w-3 text-green-600" />
                        <span>{job.salary || 'Not specified'}</span>
                      </div>
                      {job.source && (
                        <div className="text-xs text-slate-500">
                          Source: {job.source}
                        </div>
                      )}
                    </div>

                    <a
                      href={job.url || item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-teal-600 hover:text-teal-700 text-sm font-medium"
                    >
                      <span>Apply Now</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )
              })}

              <div className="text-center py-3 text-sm text-slate-600">
                Showing <span className="font-medium">{filteredData.length}</span> {filteredData.length === 1 ? 'job' : 'jobs'}
              </div>
            </div>
          </>
        ) : (
          // Generic Data Cards (for non-job data like Reddit, HN, etc.)
          <div className="grid grid-cols-1 gap-4">
            {filteredData.map((item: any, index: number) => {
              const data = parseData(item.data)
              if (!data) return null

              return (
                <div key={index} className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Database className="h-4 w-4 text-slate-400" />
                      <span className="text-xs text-slate-500">
                        {formatDistanceToNow(new Date(item.scrapedAt), { addSuffix: true })}
                      </span>
                    </div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-600 hover:text-teal-700"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  
                  <div className="space-y-2">
                    {Object.entries(data).slice(0, 10).map(([key, value]: [string, any]) => (
                      <div key={key} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
                        <span className="text-xs font-medium text-slate-500 uppercase sm:min-w-[120px]">
                          {key.replace(/_/g, ' ')}:
                        </span>
                        <span className="text-sm text-slate-900 flex-1 break-words">
                          {typeof value === 'string' 
                            ? value.length > 200 ? value.substring(0, 200) + '...' : value 
                            : JSON.stringify(value)}
                        </span>
                      </div>
                    ))}
                    {Object.keys(data).length > 10 && (
                      <p className="text-xs text-slate-500 italic">
                        ... and {Object.keys(data).length - 10} more fields
                      </p>
                    )}
                  </div>
                </div>
              )
            })}

            <div className="text-center py-3 text-sm text-slate-600">
              Showing <span className="font-medium">{filteredData.length}</span> {filteredData.length === 1 ? 'result' : 'results'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
