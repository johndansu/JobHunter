import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle, XCircle, Clock, Database, LogOut, Filter, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { adminService } from '@/services/adminService'
import toast from 'react-hot-toast'

export default function AdminHealth() {
  const { user, logout } = useAuthStore()
  const queryClient = useQueryClient()
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [resolvedFilter, setResolvedFilter] = useState<string>('unresolved')
  const [page, setPage] = useState(1)

  // Fetch system health
  const { data: systemHealth } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => adminService.getSystemHealth(),
    enabled: !!user && user.role === 'ADMIN',
    refetchInterval: 30000
  })

  // Fetch error logs
  const { data: errorsData, isLoading } = useQuery({
    queryKey: ['error-logs', page, severityFilter, resolvedFilter],
    queryFn: () => adminService.getErrors({
      page,
      limit: 20,
      severity: severityFilter === 'all' ? undefined : severityFilter,
      resolved: resolvedFilter === 'all' ? undefined : resolvedFilter === 'resolved'
    }),
    enabled: !!user && user.role === 'ADMIN'
  })

  // Resolve error mutation
  const resolveErrorMutation = useMutation({
    mutationFn: (errorId: string) => adminService.resolveError(errorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-logs'] })
      queryClient.invalidateQueries({ queryKey: ['system-health'] })
      toast.success('Error marked as resolved')
    },
    onError: () => {
      toast.error('Failed to resolve error')
    }
  })

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900'
      case 'error': return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900'
      case 'warning': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900'
      case 'info': return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900'
      default: return 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 dark:text-green-400'
      case 'warning': return 'text-yellow-600 dark:text-yellow-400'
      case 'critical': return 'text-red-600 dark:text-red-400'
      default: return 'text-slate-600 dark:text-slate-400'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/dashboard" className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              JobHunter <span className="text-teal-600">Pro</span>
            </Link>

            <nav className="hidden md:flex items-center space-x-6">
              <Link to="/dashboard" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium">Dashboard</Link>
              <Link to="/users" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium">Users</Link>
              <Link to="/admin/analytics" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium">Analytics</Link>
              <Link to="/admin/health" className="text-slate-900 dark:text-slate-100 font-semibold">Health</Link>
              <Link to="/admin/security" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium">Security</Link>
              <Link to="/admin/announcements" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium">Announcements</Link>
              
              <div className="flex items-center space-x-4 ml-4 pl-4 border-l border-slate-200 dark:border-slate-700">
                <span className="text-sm text-slate-600 dark:text-slate-400">{user?.username}</span>
                <button onClick={logout} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            System Health & Error Monitoring
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Monitor system health, manage errors, and track database performance
          </p>
        </div>

        {/* Health Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${
                systemHealth?.status === 'healthy' ? 'bg-green-100 dark:bg-green-900' :
                systemHealth?.status === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900' :
                'bg-red-100 dark:bg-red-900'
              }`}>
                {systemHealth?.status === 'healthy' ? (
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-300" />
                ) : systemHealth?.status === 'warning' ? (
                  <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-300" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-300" />
                )}
              </div>
            </div>
            <div className={`text-3xl font-bold mb-1 capitalize ${getStatusColor(systemHealth?.status || 'unknown')}`}>
              {systemHealth?.status || 'Unknown'}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">System Status</div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-300" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              {systemHealth?.errors.unresolved || 0}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Unresolved Errors</div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Clock className="h-6 w-6 text-blue-600 dark:text-blue-300" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              {systemHealth?.errors.last24h || 0}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Errors (24h)</div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${
                systemHealth?.database.connected ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'
              }`}>
                <Database className={`h-6 w-6 ${
                  systemHealth?.database.connected ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'
                }`} />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              {systemHealth?.database.responseTime || 0}ms
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">DB Response Time</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-slate-400" />
            <span className="font-semibold text-slate-900 dark:text-slate-100">Filters:</span>
            
            <div className="relative">
              <select
                value={severityFilter}
                onChange={(e) => {
                  setSeverityFilter(e.target.value)
                  setPage(1)
                }}
                className="appearance-none bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 pr-10 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent cursor-pointer"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={resolvedFilter}
                onChange={(e) => {
                  setResolvedFilter(e.target.value)
                  setPage(1)
                }}
                className="appearance-none bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 pr-10 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent cursor-pointer"
              >
                <option value="unresolved">Unresolved Only</option>
                <option value="resolved">Resolved Only</option>
                <option value="all">All Status</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Error Logs Table */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Error Logs
            </h2>
          </div>
          
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            </div>
          ) : errorsData?.data.length ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Severity</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Message</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Endpoint</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {errorsData.data.map((error) => (
                      <tr key={error.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                        <td className="px-6 py-4">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold capitalize ${getSeverityColor(error.severity)}`}>
                            {error.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100">
                          {error.errorType}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 max-w-md truncate">
                          {error.message}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-mono">
                          {error.endpoint || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                          {new Date(error.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          {error.resolved ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                              <CheckCircle className="h-3 w-3" />
                              Resolved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300">
                              <Clock className="h-3 w-3" />
                              Open
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {!error.resolved && (
                            <button
                              onClick={() => resolveErrorMutation.mutate(error.id)}
                              disabled={resolveErrorMutation.isPending}
                              className="text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 disabled:opacity-50"
                            >
                              Mark Resolved
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {errorsData.pagination && errorsData.pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Page {errorsData.pagination.page} of {errorsData.pagination.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= errorsData.pagination.totalPages}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
              No errors found
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

