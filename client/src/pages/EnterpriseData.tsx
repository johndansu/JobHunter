import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  Download, 
  Search, 
  Trash2, 
  Database,
  ExternalLink,
  RefreshCw,
  Filter,
  MoreVertical,
  Eye,
  FileText,
  BarChart3,
  Zap,
  Globe,
  Calendar,
  Clock
,
  LogOut,
  User
} from 'lucide-react'
import { dataService } from '@/services/dataService'
import { jobService } from '@/services/jobService'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import { api } from '@/services/api'
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

const EnterpriseData = () => {
  const [search, setSearch] = useState('')
  const [jobFilter, setJobFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const { user, logout } = useAuthStore()

  const { data: scrapedData, isLoading, refetch, error } = useQuery({
    queryKey: ['data', { page, search, jobId: jobFilter }],
    queryFn: () => dataService.getData({ page, search, jobId: jobFilter, limit: 20 }),
    enabled: !!user // Only run if user is authenticated
  })

  const { data: jobs } = useQuery({
    queryKey: ['jobs-for-filter'],
    queryFn: () => jobService.getJobs({ limit: 100 }),
    enabled: !!user // Only run if user is authenticated
  })

  const handleExport = async (format: string = 'json') => {
    try {
      const params = new URLSearchParams({
        format,
        limit: '10000'
      })
      
      if (jobFilter) params.append('jobId', jobFilter)
      if (search) params.append('search', search)
      
      const response = await api.get(`/export/data?${params}`, {
        responseType: 'blob'
      })
      
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `scraped-data-${Date.now()}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success(`Data exported as ${format.toUpperCase()}`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Export failed')
    }
  }

  const handleSelectAll = () => {
    if (selectedItems.length === (scrapedData as any)?.data?.length) {
      setSelectedItems([])
    } else {
      setSelectedItems((scrapedData as any)?.data?.map((item: any) => item.id) || [])
    }
  }

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-40">
        <div className="container">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-teal-600 rounded-full flex items-center justify-center">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-slate-900">ScrapePro</span>
              </div>
              
              <nav className="hidden md:flex items-center space-x-6">
                <Link to="/dashboard" className="nav-item">Dashboard</Link>
                <Link to="/jobs" className="nav-item">Jobs</Link>
                <Link to="/data" className="nav-item-active">Data</Link>
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
            <h1 className="text-3xl font-bold text-slate-900">Scraped Data</h1>
            <p className="text-slate-600 mt-1">
              View and manage your extracted data
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
            
            <div className="relative">
              <button className="btn btn-primary">
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 hidden">
                <button 
                  onClick={() => handleExport('json')}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  Export as JSON
                </button>
                <button 
                  onClick={() => handleExport('csv')}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  Export as CSV
                </button>
                <button 
                  onClick={() => handleExport('xml')}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  Export as XML
                </button>
              </div>
            </div>
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
                  placeholder="Search data..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>
            
            <select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              className="input w-full sm:w-48"
            >
              <option value="">All Jobs</option>
              {jobs?.data?.map((job: any) => (
                <option key={job.id} value={job.id}>{job.name}</option>
              ))}
            </select>
            
            <button className="btn btn-outline">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </button>
          </div>
        </div>

        {/* Data List */}
        <div className="card">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">
                Scraped Data ({(scrapedData as any)?.data?.length || 0} items loaded)
              </h2>
              
              {error && (
                <div className="flex items-center space-x-2 text-red-600">
                  <span className="text-sm">Failed to load data</span>
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
              <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="card p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="h-12 w-12 bg-slate-200 rounded-lg animate-pulse"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 rounded animate-pulse"></div>
                        <div className="h-3 bg-slate-200 rounded w-2/3 animate-pulse"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-200 rounded animate-pulse"></div>
                      <div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (scrapedData as any)?.data?.length > 0 ? (
              <div className="space-y-6">
                {(scrapedData as any).data.map((item: any) => (
                  <div key={item.id} className="card rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="p-2 bg-white/20 rounded-lg">
                              <Database className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-white">
                                {item.job?.name || 'Unknown Job'}
                              </h3>
                              <p className="text-white/80 text-sm">
                                Scraped {formatDistanceToNow(new Date(item.scrapedAt), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-2 text-white/80 hover:text-white transition-colors"
                          >
                            <span className="truncate max-w-md">{item.url}</span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button className="btn btn-sm bg-white/20 text-white hover:bg-white/30">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </button>
                          <button className="btn btn-sm bg-white/20 text-white hover:bg-white/30">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Data Content */}
                    <div className="p-6">
                      <DataDisplay data={item.data} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card rounded-2xl p-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="p-4 bg-slate-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                    <Database className="h-10 w-10 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">No Data Found</h3>
                  <p className="text-slate-600 mb-6">
                    {search || jobFilter 
                      ? 'No scraped data matches your current filters. Try adjusting your search or create a new scraping job.'
                      : 'Run some jobs to see scraped data here. Create your first scraping job to get started!'
                    }
                  </p>
                  <div className="flex justify-center space-x-4">
                    <Link to="/jobs/create" className="btn btn-primary">
                      Create Job
                    </Link>
                    {(search || jobFilter) && (
                      <button
                        onClick={() => {
                          setSearch('')
                          setJobFilter('')
                        }}
                        className="btn btn-outline"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pagination */}
        {(scrapedData as any)?.data?.length > 0 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-slate-600">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, (scrapedData as any)?.total || 0)} of {(scrapedData as any)?.total || 0} items
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
                disabled={!(scrapedData as any)?.hasMore}
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

export default EnterpriseData









