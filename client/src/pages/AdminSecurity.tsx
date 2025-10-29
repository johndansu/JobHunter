import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Shield, AlertTriangle, Lock, Unlock, Plus, Trash2, LogOut, X } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { adminService } from '@/services/adminService'
import toast from 'react-hot-toast'

export default function AdminSecurity() {
  const { user, logout } = useAuthStore()
  const queryClient = useQueryClient()
  const [showAddIpModal, setShowAddIpModal] = useState(false)
  const [newIpRule, setNewIpRule] = useState({ ipAddress: '', type: 'block' as 'block' | 'whitelist', reason: '' })

  // Fetch security events
  const { data: securityEvents } = useQuery({
    queryKey: ['security-events'],
    queryFn: () => adminService.getSecurityEvents({ page: 1, limit: 50, resolved: false }),
    enabled: !!user && user.role === 'ADMIN'
  })

  // Fetch IP rules
  const { data: ipRules } = useQuery({
    queryKey: ['ip-rules'],
    queryFn: () => adminService.getIpRules(),
    enabled: !!user && user.role === 'ADMIN'
  })

  // Create IP rule mutation
  const createIpRuleMutation = useMutation({
    mutationFn: (data: typeof newIpRule) => adminService.createIpRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-rules'] })
      toast.success('IP rule created successfully')
      setShowAddIpModal(false)
      setNewIpRule({ ipAddress: '', type: 'block', reason: '' })
    },
    onError: () => toast.error('Failed to create IP rule')
  })

  // Delete IP rule mutation
  const deleteIpRuleMutation = useMutation({
    mutationFn: (ruleId: string) => adminService.deleteIpRule(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-rules'] })
      toast.success('IP rule deleted')
    },
    onError: () => toast.error('Failed to delete IP rule')
  })

  // Resolve security event mutation
  const resolveEventMutation = useMutation({
    mutationFn: (eventId: string) => adminService.resolveSecurityEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-events'] })
      toast.success('Security event resolved')
    },
    onError: () => toast.error('Failed to resolve event')
  })

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
      case 'high': return 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
      case 'medium': return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
      case 'low': return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
      default: return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 dark:from-slate-900 dark:to-slate-800">
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
              <Link to="/admin/health" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium">Health</Link>
              <Link to="/admin/security" className="text-slate-900 dark:text-slate-100 font-semibold">Security</Link>
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Security & Access Control
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Monitor failed logins, manage IP blocking, and track security events
            </p>
          </div>
          <button
            onClick={() => setShowAddIpModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add IP Rule
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-300" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              {securityEvents?.data.length || 0}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Unresolved Events</div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Lock className="h-6 w-6 text-orange-600 dark:text-orange-300" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              {ipRules?.filter(r => r.type === 'block' && r.isActive).length || 0}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Blocked IPs</div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <Unlock className="h-6 w-6 text-green-600 dark:text-green-300" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              {ipRules?.filter(r => r.type === 'whitelist' && r.isActive).length || 0}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Whitelisted IPs</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Security Events */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Recent Security Events
                </h2>
              </div>
            </div>
            <div className="p-6 max-h-[600px] overflow-y-auto">
              {securityEvents?.data.length ? (
                <div className="space-y-4">
                  {securityEvents.data.map((event) => (
                    <div key={event.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${getSeverityColor(event.severity)}`}>
                              {event.severity}
                            </span>
                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {event.eventType.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 font-mono">{event.ipAddress}</p>
                        </div>
                        {!event.resolved && (
                          <button
                            onClick={() => resolveEventMutation.mutate(event.id)}
                            className="text-xs text-green-600 dark:text-green-400 hover:underline"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        {new Date(event.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  No unresolved security events
                </div>
              )}
            </div>
          </div>

          {/* IP Rules */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <Lock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  IP Access Rules
                </h2>
              </div>
            </div>
            <div className="p-6 max-h-[600px] overflow-y-auto">
              {ipRules?.length ? (
                <div className="space-y-4">
                  {ipRules.map((rule) => (
                    <div key={rule.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${
                              rule.type === 'block' ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                            }`}>
                              {rule.type}
                            </span>
                            {!rule.isActive && (
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-mono font-semibold text-slate-900 dark:text-slate-100 mb-1">
                            {rule.ipAddress}
                          </p>
                          {rule.reason && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                              {rule.reason}
                            </p>
                          )}
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Added: {new Date(rule.createdAt).toLocaleDateString()}
                          </p>
                          {rule.expiresAt && (
                            <p className="text-xs text-orange-600 dark:text-orange-400">
                              Expires: {new Date(rule.expiresAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => deleteIpRuleMutation.mutate(rule.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  No IP rules configured
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add IP Rule Modal */}
      {showAddIpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Add IP Rule</h3>
              <button onClick={() => setShowAddIpModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  IP Address
                </label>
                <input
                  type="text"
                  value={newIpRule.ipAddress}
                  onChange={(e) => setNewIpRule({ ...newIpRule, ipAddress: e.target.value })}
                  placeholder="192.168.1.1"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Rule Type
                </label>
                <select
                  value={newIpRule.type}
                  onChange={(e) => setNewIpRule({ ...newIpRule, type: e.target.value as 'block' | 'whitelist' })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="block">Block</option>
                  <option value="whitelist">Whitelist</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Reason (Optional)
                </label>
                <textarea
                  value={newIpRule.reason}
                  onChange={(e) => setNewIpRule({ ...newIpRule, reason: e.target.value })}
                  placeholder="Why is this IP being blocked/whitelisted?"
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddIpModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => createIpRuleMutation.mutate(newIpRule)}
                  disabled={!newIpRule.ipAddress || createIpRuleMutation.isPending}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
                >
                  {createIpRuleMutation.isPending ? 'Creating...' : 'Create Rule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

