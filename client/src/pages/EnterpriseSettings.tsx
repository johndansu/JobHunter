import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Shield,
  CreditCard,
  Key,
  Globe,
  Database,
  Settings,
  Save,
  Eye,
  EyeOff,
  Check,
  X,
  AlertTriangle,
  Info,
  Briefcase,
  Lock,
  Mail,
  Phone,
  Building,
  Calendar,
  User,
  Bell,
  LogOut
} from 'lucide-react'
import { authService } from '@/services/authService'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'

const EnterpriseSettings = () => {
  const [activeTab, setActiveTab] = useState('profile')
  const [showPassword, setShowPassword] = useState(false)
  const queryClient = useQueryClient()
  const { logout } = useAuthStore()

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: authService.getCurrentUser
  })

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => authService.updateProfile(data),
    onSuccess: () => {
      toast.success('Profile updated successfully')
      queryClient.invalidateQueries({ queryKey: ['current-'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update profile')
    }
  })

  const updatePasswordMutation = useMutation({
    mutationFn: (data: any) => authService.updatePassword(data),
    onSuccess: () => {
      toast.success('Password updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update password')
    }
  })

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="h-4 w-4" /> },
    { id: 'billing', label: 'Billing', icon: <CreditCard className="h-4 w-4" /> },
    { id: 'api', label: 'API Keys', icon: <Key className="h-4 w-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
    { id: 'advanced', label: 'Advanced', icon: <Settings className="h-4 w-4" /> }
  ]

  const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      company: formData.get('company') as string,
      phone: formData.get('phone') as string
    }
    updateProfileMutation.mutate(data)
  }

  const handlePasswordSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      currentPassword: formData.get('currentPassword') as string,
      newPassword: formData.get('newPassword') as string,
      confirmPassword: formData.get('confirmPassword') as string
    }
    updatePasswordMutation.mutate(data)
  }

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
              <Link to="/jobs" className="text-slate-600 hover:text-slate-900 font-medium">Job Searches</Link>
              <Link to="/data" className="text-slate-600 hover:text-slate-900 font-medium">Results</Link>
              <Link to="/analytics" className="text-slate-600 hover:text-slate-900 font-medium">Analytics</Link>
              <Link to="/settings" className="text-slate-900 font-semibold">Settings</Link>
              
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
        {/* Page Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm md:text-base text-slate-600 mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="card p-4">
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-teal-100 text-teal-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="card">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-xl font-semibold text-slate-900">Profile Information</h2>
                  <p className="text-slate-600 mt-1">Update your personal information and contact details.</p>
                </div>
                <div className="p-6">
                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="label label-required">Full Name</label>
                        <input
                          type="text"
                          name="name"
                          defaultValue={user?.name || ''}
                          className="input"
                          required
                        />
                      </div>
                      <div>
                        <label className="label label-required">Email Address</label>
                        <input
                          type="email"
                          name="email"
                          defaultValue={user?.email || ''}
                          className="input"
                          required
                        />
                      </div>
                      <div>
                        <label className="label">Company</label>
                        <input
                          type="text"
                          name="company"
                          defaultValue={user?.company || ''}
                          className="input"
                          placeholder="Your company name"
                        />
                      </div>
                      <div>
                        <label className="label">Phone Number</label>
                        <input
                          type="tel"
                          name="phone"
                          defaultValue={user?.phone || ''}
                          className="input"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        className="btn btn-primary"
                      >
                        {updateProfileMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                {/* Password Change */}
                <div className="card">
                  <div className="p-6 border-b border-slate-200">
                    <h2 className="text-xl font-semibold text-slate-900">Change Password</h2>
                    <p className="text-slate-600 mt-1">Update your password to keep your account secure.</p>
                  </div>
                  <div className="p-6">
                    <form onSubmit={handlePasswordSubmit} className="space-y-6">
                      <div>
                        <label className="label label-required">Current Password</label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            name="currentPassword"
                            className="input pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="label label-required">New Password</label>
                        <div className="relative">
                          <input
                            type="password"
                            name="newPassword"
                            className="input pr-10"
                            required
                            minLength={8}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="label label-required">Confirm New Password</label>
                        <input
                          type="password"
                          name="confirmPassword"
                          className="input"
                          required
                          minLength={8}
                        />
                      </div>
                      
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={updatePasswordMutation.isPending}
                          className="btn btn-primary"
                        >
                          {updatePasswordMutation.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Updating...
                            </>
                          ) : (
                            <>
                              <Lock className="h-4 w-4 mr-2" />
                              Update Password
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Two-Factor Authentication */}
                <div className="card">
                  <div className="p-6 border-b border-slate-200">
                    <h2 className="text-xl font-semibold text-slate-900">Two-Factor Authentication</h2>
                    <p className="text-slate-600 mt-1">Add an extra layer of security to your account.</p>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <Shield className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900">2FA is disabled</h3>
                          <p className="text-sm text-slate-600">Secure your account with two-factor authentication</p>
                        </div>
                      </div>
                      <button className="btn btn-outline">
                        Enable 2FA
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Billing Tab */}
            {activeTab === 'billing' && (
              <div className="space-y-6">
                {/* Current Plan */}
                <div className="card">
                  <div className="p-6 border-b border-slate-200">
                    <h2 className="text-xl font-semibold text-slate-900">Current Plan</h2>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">Professional Plan</h3>
                        <p className="text-slate-600">$99/month â€¢ 100K requests â€¢ 10 concurrent jobs</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-slate-900">$99</div>
                        <div className="text-sm text-slate-600">per month</div>
                      </div>
                    </div>
                    
                    <div className="mt-6 flex space-x-4">
                      <button className="btn btn-outline">Change Plan</button>
                      <button className="btn btn-primary">Upgrade Plan</button>
                    </div>
                  </div>
                </div>

                {/* Billing History */}
                <div className="card">
                  <div className="p-6 border-b border-slate-200">
                    <h2 className="text-xl font-semibold text-slate-900">Billing History</h2>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {[
                        { date: '2024-01-15', amount: '$99.00', status: 'Paid' },
                        { date: '2023-12-15', amount: '$99.00', status: 'Paid' },
                        { date: '2023-11-15', amount: '$99.00', status: 'Paid' }
                      ].map((invoice, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                          <div>
                            <p className="font-medium text-slate-900">{invoice.date}</p>
                            <p className="text-sm text-slate-600">Professional Plan</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-slate-900">{invoice.amount}</p>
                            <span className="status-success">{invoice.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* API Keys Tab */}
            {activeTab === 'api' && (
              <div className="card">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-xl font-semibold text-slate-900">API Keys</h2>
                  <p className="text-slate-600 mt-1">Manage your API keys for programmatic access.</p>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">Production API Key</p>
                        <p className="text-sm text-slate-600">sk_live_â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢</p>
                      </div>
                      <div className="flex space-x-2">
                        <button className="btn btn-sm btn-outline">Copy</button>
                        <button className="btn btn-sm btn-outline">Regenerate</button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">Test API Key</p>
                        <p className="text-sm text-slate-600">sk_test_â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢</p>
                      </div>
                      <div className="flex space-x-2">
                        <button className="btn btn-sm btn-outline">Copy</button>
                        <button className="btn btn-sm btn-outline">Regenerate</button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <button className="btn btn-primary">
                      <Key className="h-4 w-4 mr-2" />
                      Create New API Key
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="card">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-xl font-semibold text-slate-900">Notification Preferences</h2>
                  <p className="text-slate-600 mt-1">Choose how you want to be notified about your job searches.</p>
                </div>
                <div className="p-6">
                  <div className="space-y-6">
                    {[
                      { title: 'Job Completion', description: 'Get notified when jobs finish successfully', enabled: true },
                      { title: 'Job Failures', description: 'Get notified when jobs fail or encounter errors', enabled: true },
                      { title: 'Usage Alerts', description: 'Get notified when approaching usage limits', enabled: true },
                      { title: 'Weekly Reports', description: 'Receive weekly performance summaries', enabled: false },
                      { title: 'System Updates', description: 'Get notified about platform updates and maintenance', enabled: true }
                    ].map((notification, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-slate-900">{notification.title}</h3>
                          <p className="text-sm text-slate-600">{notification.description}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked={notification.enabled} />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Tab */}
            {activeTab === 'advanced' && (
              <div className="space-y-6">
                {/* Data Retention */}
                <div className="card">
                  <div className="p-6 border-b border-slate-200">
                    <h2 className="text-xl font-semibold text-slate-900">Data Retention</h2>
                    <p className="text-slate-600 mt-1">Configure how long to keep your job search results.</p>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="label">Retention Period</label>
                        <select className="input">
                          <option value="30">30 days</option>
                          <option value="90">90 days</option>
                          <option value="180">180 days</option>
                          <option value="365">1 year</option>
                          <option value="forever">Forever</option>
                        </select>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-amber-800">Important</p>
                            <p className="text-sm text-amber-700 mt-1">
                              Data older than the retention period will be permanently deleted and cannot be recovered.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Export Settings */}
                <div className="card">
                  <div className="p-6 border-b border-slate-200">
                    <h2 className="text-xl font-semibold text-slate-900">Export Settings</h2>
                    <p className="text-slate-600 mt-1">Configure default export preferences.</p>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="label">Default Export Format</label>
                        <select className="input">
                          <option value="json">JSON</option>
                          <option value="csv">CSV</option>
                          <option value="xml">XML</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">Default Export Limit</label>
                        <select className="input">
                          <option value="1000">1,000 records</option>
                          <option value="10000">10,000 records</option>
                          <option value="100000">100,000 records</option>
                          <option value="all">All records</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default EnterpriseSettings












