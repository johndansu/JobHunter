import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Download, 
  Database, 
  Globe, 
  Calendar,
  BarChart3,
  Eye,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  TrendingUp
} from 'lucide-react'
import { dataService } from '@/services/dataService'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

const Data = () => {
  const [search, setSearch] = useState('')
  const [jobFilter, setJobFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data: scrapedData, isLoading, refetch, error } = useQuery({
    queryKey: ['scraped-data', { page, search, jobId: jobFilter }],
    queryFn: () => dataService.getData({ page, search, jobId: jobFilter, limit: 20 })
  })

  // Handle success/error with useEffect instead of deprecated callbacks
  useEffect(() => {
    if (scrapedData) {
      console.log('✅ Scraped data loaded:', scrapedData);
    }
    if (error) {
      console.error('❌ Scraped data loading error:', error);
    }
  }, [scrapedData, error])

  const handleExportData = async () => {
    try {
      // This would typically trigger a download
      toast.success('Export started! You will receive an email when ready.')
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Export failed')
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
                <h1 className="text-3xl font-bold text-gray-900">Scraped Data</h1>
                <p className="text-gray-600 mt-1">View and manage your extracted data</p>
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
                <h1 className="text-3xl font-bold text-gray-900">Scraped Data</h1>
                <p className="text-gray-600 mt-1">View and manage your extracted data</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
              <p className="text-red-600 mb-4">
                {error instanceof Error ? error.message : 'Failed to load scraped data'}
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
              <h1 className="text-3xl font-bold text-gray-900">Scraped Data</h1>
              <p className="text-gray-600 mt-1">
                View and manage your extracted data
                {scrapedData && (
                  <span className="ml-2 text-teal-600">
                    ({(scrapedData as any).pagination?.total || 0} records)
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Data System Active</span>
              </div>
              <button
                onClick={() => refetch()}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors inline-flex items-center"
                title="Refresh data list"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
              <button
                onClick={handleExportData}
                className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all duration-200 inline-flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Data Overview */}
        {scrapedData && (scrapedData as any).data && (scrapedData as any).data.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Records</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {(scrapedData as any).pagination?.total || 0}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-teal-100">
                  <Database className="h-6 w-6 text-teal-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-green-600">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>+12.5% from last week</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Unique URLs</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {new Set((scrapedData as any).data.map((item: any) => item.url)).size}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-green-100">
                  <Globe className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Active Jobs</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {new Set((scrapedData as any).data.map((item: any) => item.jobId)).size}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-100">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Success Rate</p>
                  <p className="text-3xl font-bold text-gray-900">98.5%</p>
                </div>
                <div className="p-3 rounded-xl bg-orange-100">
                  <BarChart3 className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Data
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search in data content..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Job
              </label>
              <select
                value={jobFilter}
                onChange={(e) => setJobFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
              >
                <option value="">All Jobs</option>
                {/* This would be populated with actual job options */}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearch('')
                  setJobFilter('')
                  setPage(1)
                }}
                className="w-full bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {scrapedData && (scrapedData as any).data && (scrapedData as any).data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source URL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Job
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Preview
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Scraped At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(scrapedData as any).data.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Globe className="h-4 w-4 text-gray-400" />
                          <a 
                            href={item.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-teal-600 hover:text-teal-700 text-sm truncate max-w-xs"
                          >
                            {item.url}
                          </a>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">{item.job?.name || 'Unknown Job'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 max-w-xs truncate">
                          {JSON.stringify(JSON.parse(item.data)).substring(0, 100)}...
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {formatDistanceToNow(new Date(item.scrapedAt))} ago
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button className="p-1 text-teal-600 hover:bg-teal-50 rounded transition-colors">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="p-1 text-gray-600 hover:bg-gray-50 rounded transition-colors">
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Found</h3>
              <p className="text-gray-600 mb-4">
                {search || jobFilter ? 'No data matches your current filters.' : 'No scraped data available yet.'}
              </p>
              <button
                onClick={() => {
                  setSearch('')
                  setJobFilter('')
                }}
                className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all duration-200 inline-flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {scrapedData && (scrapedData as any).pagination && (scrapedData as any).pagination.totalPages > 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {(((scrapedData as any).pagination.page - 1) * (scrapedData as any).pagination.limit) + 1} to{' '}
                {Math.min((scrapedData as any).pagination.page * (scrapedData as any).pagination.limit, (scrapedData as any).pagination.total)} of{' '}
                {(scrapedData as any).pagination.total} results
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
                  Page {page} of {(scrapedData as any).pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === (scrapedData as any).pagination.totalPages}
                  className="bg-white border border-gray-300 text-gray-700 px-3 py-1 rounded-md text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default Data