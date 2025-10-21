import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { 
  Database, 
  ArrowRight, 
  CheckCircle, 
  Zap, 
  Shield, 
  Globe,
  BarChart3,
  Users,
  Star,
  TrendingUp,
  Activity
} from 'lucide-react'

const Welcome = () => {
  const { user } = useAuthStore()

  const features = [
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Extract data at scale with our optimized scraping engine",
      color: "text-teal-600",
      bgColor: "bg-teal-100"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level security with proxy rotation and rate limiting",
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      icon: Globe,
      title: "Global Scale",
      description: "Scrape any website worldwide with our distributed infrastructure",
      color: "text-emerald-600",
      bgColor: "bg-emerald-100"
    },
    {
      icon: Database,
      title: "Smart Analytics",
      description: "Real-time monitoring and comprehensive data insights",
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    }
  ]

  const stats = [
    { name: 'Pages Scraped Daily', value: '10M+', icon: Globe },
    { name: 'Enterprise Customers', value: '500+', icon: Users },
    { name: 'Uptime SLA', value: '99.9%', icon: CheckCircle },
    { name: 'Data Points Processed', value: '1B+', icon: Database }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-teal-600 rounded-full flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">WebScraper Pro</span>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    Welcome back, {user.firstName || user.username || 'User'}!
                  </span>
                  <Link to="/dashboard" className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all duration-200">
                    Go to Dashboard
                  </Link>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link to="/login" className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                    Sign In
                  </Link>
                  <Link to="/register" className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all duration-200">
                    Get Started Free
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16 space-y-16">

        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
            Welcome to
            <span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent"> WebScraper Pro</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Extract data at scale with our advanced proxy rotation and real-time monitoring.
          </p>

          {!user && (
            <div className="flex items-center justify-center space-x-4 mb-12">
              <Link to="/register" className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-teal-700 hover:to-emerald-700 transition-all duration-200 inline-flex items-center">
                Start Free Trial
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
              <Link to="/login" className="bg-white border border-gray-300 text-gray-700 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-50 transition-colors">
                Sign In
              </Link>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
            {stats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <div key={index} className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.name}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Features Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Why Choose WebScraper Pro?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Built for developers and businesses who need reliable, scalable data extraction
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
                <div className={`p-3 rounded-xl ${feature.bgColor} w-fit mb-4`}>
                  <Icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            )
          })}
        </div>

        {/* Quick Start Section */}
        {user && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Get Started Quickly</h2>
              <p className="text-lg text-gray-600">Choose your next step to begin extracting data</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link
                to="/jobs/create"
                className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white p-6 rounded-lg hover:from-teal-700 hover:to-emerald-700 transition-all duration-200 text-center"
              >
                <div className="p-3 bg-white/20 rounded-lg w-fit mx-auto mb-4">
                  <Database className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Create Your First Job</h3>
                <p className="text-sm opacity-90">Set up a scraping job in minutes</p>
              </Link>
              
              <Link
                to="/jobs"
                className="bg-white border border-gray-300 text-gray-700 p-6 rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                <div className="p-3 bg-gray-100 rounded-lg w-fit mx-auto mb-4">
                  <Activity className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">View Existing Jobs</h3>
                <p className="text-sm text-gray-600">Monitor your current scraping jobs</p>
              </Link>
              
              <Link
                to="/data"
                className="bg-white border border-gray-300 text-gray-700 p-6 rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                <div className="p-3 bg-gray-100 rounded-lg w-fit mx-auto mb-4">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Explore Your Data</h3>
                <p className="text-sm text-gray-600">View and export scraped data</p>
              </Link>
            </div>
          </div>
        )}

        {/* CTA Section */}
        {!user && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Ready to Start Scraping?
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands of developers and businesses using WebScraper Pro
            </p>
            <Link
              to="/register"
              className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-12 py-4 rounded-lg font-semibold text-lg hover:from-teal-700 hover:to-emerald-700 transition-all duration-200 inline-flex items-center"
            >
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}

export default Welcome