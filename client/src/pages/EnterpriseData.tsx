import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Download, 
  Search, 
  ExternalLink,
  RefreshCw,
  Zap,
  LogOut,
  User,
  Briefcase,
  MapPin,
  DollarSign,
  Building2,
  Calendar
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

  const allData = scrapedData?.data || []
  const filteredData = searchTerm
    ? allData.filter(item => {
        const parsed = parseData(item.data)
        if (!parsed) return false
        const searchLower = searchTerm.toLowerCase()
        return JSON.stringify(parsed).toLowerCase().includes(searchLower)
      })
    : allData

  // Check if this is job data
  const isJobData = filteredData.length > 0 && (() => {
    const firstItem = parseData(filteredData[0]?.data)
    return firstItem?.title && firstItem?.company
  })()

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-teal-600 rounded-full flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">ScrapePro</span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <User className="h-4 w-4" />
                <span>{user?.username}</span>
              </div>
              <button
                onClick={logout}
                className="flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Scraped Data</h1>
          <p className="text-slate-600 text-sm mt-1">View and export your scraped results</p>
        </div>

        {/* Filters & Actions */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search data..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={selectedJob}
                onChange={(e) => setSelectedJob(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
              >
                <option value="">All Jobs</option>
                {jobs?.data?.map((job: any) => (
                  <option key={job.id} value={job.id}>{job.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => refetch()}
                className="flex items-center space-x-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="text-sm">Refresh</span>
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span className="text-sm">Export CSV</span>
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
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <Briefcase className="h-12 w-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600 mb-2">No data yet</p>
            <p className="text-sm text-slate-500">Run a scraping job to see results here</p>
          </div>
        ) : isJobData ? (
          // Job Listings Table
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
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
                    
                    return (
                      <tr key={index} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-start space-x-2">
                            <Briefcase className="h-4 w-4 text-teal-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm font-medium text-slate-900">{job.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <Building2 className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-700">{job.company}</span>
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
                          <span className="text-xs text-slate-500">{job.source}</span>
                        </td>
                        <td className="px-4 py-3">
                          <a
                            href={job.url}
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
        ) : (
          // Generic Data Cards (for non-job data)
          <div className="grid grid-cols-1 gap-4">
            {filteredData.map((item: any, index: number) => {
              const data = parseData(item.data)
              if (!data) return null

              return (
                <div key={index} className="bg-white rounded-lg border border-slate-200 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
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
                    {Object.entries(data).map(([key, value]: [string, any]) => (
                      <div key={key} className="flex items-start space-x-3">
                        <span className="text-xs font-medium text-slate-500 uppercase min-w-[100px]">
                          {key.replace(/_/g, ' ')}:
                        </span>
                        <span className="text-sm text-slate-900 flex-1">
                          {typeof value === 'string' ? value : JSON.stringify(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
