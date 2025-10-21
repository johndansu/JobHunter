import { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  ArrowRight, 
  Check, 
  Star, 
  Zap, 
  Shield, 
  Globe, 
  BarChart3, 
  Code, 
  Database,
  Play,
  ChevronDown,
  Menu,
  X,
  Users,
  TrendingUp
} from 'lucide-react'

const EnterpriseLanding = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const features = [
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Lightning Fast",
      description: "Extract data at scale with our high-performance infrastructure",
      color: "text-teal-600",
      bgColor: "bg-teal-100"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Enterprise Security",
      description: "Bank-level security with SOC 2 compliance and data encryption",
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "Global Scale",
      description: "Distributed infrastructure across 50+ countries",
      color: "text-emerald-600",
      bgColor: "bg-emerald-100"
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Advanced Analytics",
      description: "Real-time insights and comprehensive reporting dashboard",
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    },
    {
      icon: <Code className="h-6 w-6" />,
      title: "Developer API",
      description: "RESTful API with comprehensive documentation and SDKs",
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    {
      icon: <Database className="h-6 w-6" />,
      title: "Data Pipeline",
      description: "Automated data processing and export to your preferred format",
      color: "text-indigo-600",
      bgColor: "bg-indigo-100"
    }
  ]

  const stats = [
    { name: 'Pages Scraped Daily', value: '50M+', icon: Globe },
    { name: 'Enterprise Customers', value: '1000+', icon: Users },
    { name: 'Uptime SLA', value: '99.99%', icon: Check },
    { name: 'Data Points Processed', value: '10B+', icon: Database }
  ]

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'CTO, TechCorp',
      content: 'Reduced our data collection time from weeks to hours. The ROI has been incredible.',
      rating: 5
    },
    {
      name: 'Michael Rodriguez',
      role: 'VP Analytics, DataFlow Inc',
      content: 'The most reliable scraping platform we\'ve used. Zero downtime in 2 years.',
      rating: 5
    },
    {
      name: 'Jennifer Kim',
      role: 'Head of Research, MarketIntel',
      content: 'Transformed our competitive intelligence program. A complete game changer.',
      rating: 5
    }
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
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
              <a href="#docs" className="text-gray-600 hover:text-gray-900 transition-colors">Docs</a>
              <a href="#support" className="text-gray-600 hover:text-gray-900 transition-colors">Support</a>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <Link to="/login" className="text-gray-600 hover:text-gray-900 transition-colors">
                Sign In
              </Link>
              <Link to="/register" className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all duration-200">
                Start Free Trial
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 bg-white">
              <div className="px-2 pt-2 pb-3 space-y-1">
                <a href="#features" className="block px-3 py-2 text-gray-600 hover:text-gray-900">Features</a>
                <a href="#pricing" className="block px-3 py-2 text-gray-600 hover:text-gray-900">Pricing</a>
                <a href="#docs" className="block px-3 py-2 text-gray-600 hover:text-gray-900">Docs</a>
                <a href="#support" className="block px-3 py-2 text-gray-600 hover:text-gray-900">Support</a>
                <div className="pt-4 space-y-2">
                  <Link to="/login" className="block px-3 py-2 text-gray-600 hover:text-gray-900">
                    Sign In
                  </Link>
                  <Link to="/register" className="block px-3 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all duration-200 text-center">
                    Start Free Trial
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16 space-y-16">

        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
            Enterprise-Grade
            <span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent"> Web Scraping</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            The most reliable web scraping platform for developers and businesses. 
            Extract data from any website with enterprise-grade infrastructure.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link to="/register" className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-teal-700 hover:to-emerald-700 transition-all duration-200 inline-flex items-center">
              Start Free Trial
              <ArrowRight className="h-5 w-5 ml-2" />
            </Link>
            <button className="bg-white border border-gray-300 text-gray-700 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-50 transition-colors inline-flex items-center">
              <Play className="h-5 w-5 mr-2" />
              Watch Demo
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">{stat.name}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-teal-100">
                    <Icon className="h-6 w-6 text-teal-600" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Features Section */}
        <div id="features" className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Built for Enterprise Scale
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Everything you need to extract, process, and analyze web data at scale
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
              <div className={`p-3 rounded-xl ${feature.bgColor} w-fit mb-4`}>
                <div className={feature.color}>
                  {feature.icon}
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Trusted by Industry Leaders
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-600 mb-4 italic">"{testimonial.content}"</p>
              <div>
                <div className="font-semibold text-gray-900">{testimonial.name}</div>
                <div className="text-gray-500 text-sm">{testimonial.role}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Ready to Scale Your Data Operations?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of companies using our platform to extract insights from the web
          </p>
          <Link
            to="/register"
            className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-12 py-4 rounded-lg font-semibold text-lg hover:from-teal-700 hover:to-emerald-700 transition-all duration-200 inline-flex items-center"
          >
            Start Your Free Trial
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>

      </div>
    </div>
  )
}

export default EnterpriseLanding


