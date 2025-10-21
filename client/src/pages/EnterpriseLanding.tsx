import { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  ArrowRight, 
  Check, 
  Star, 
  Zap, 
  Briefcase, 
  Globe, 
  Search, 
  MapPin, 
  DollarSign,
  Play,
  Menu,
  X,
  Users,
  TrendingUp,
  Building2,
  Clock
} from 'lucide-react'

const EnterpriseLanding = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const features = [
    {
      icon: <Search className="h-6 w-6" />,
      title: "Multi-Source Job Search",
      description: "Search across multiple job boards and career sites simultaneously",
      color: "text-teal-600",
      bgColor: "bg-teal-100"
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Instant Results",
      description: "Get real-time job listings from top APIs and job boards",
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      icon: <MapPin className="h-6 w-6" />,
      title: "Remote & Location Filter",
      description: "Find remote jobs or filter by your preferred location",
      color: "text-emerald-600",
      bgColor: "bg-emerald-100"
    },
    {
      icon: <DollarSign className="h-6 w-6" />,
      title: "Salary Information",
      description: "See salary ranges and compensation details upfront",
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    },
    {
      icon: <Building2 className="h-6 w-6" />,
      title: "Company Details",
      description: "Get information about hiring companies and job types",
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: "Save Time",
      description: "No more jumping between multiple job sites - one search does it all",
      color: "text-indigo-600",
      bgColor: "bg-indigo-100"
    }
  ]

  const stats = [
    { name: 'Job Listings', value: '10M+', icon: Briefcase },
    { name: 'Companies', value: '500K+', icon: Building2 },
    { name: 'Daily Updates', value: '100K+', icon: TrendingUp },
    { name: 'Job Boards', value: '50+', icon: Globe }
  ]

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Software Engineer',
      content: 'Found my dream remote job in just 2 days. This platform aggregates everything I need in one place.',
      rating: 5
    },
    {
      name: 'Michael Rodriguez',
      role: 'Product Manager',
      content: 'The salary transparency and multi-source search saved me weeks of job hunting. Highly recommend!',
      rating: 5
    },
    {
      name: 'Jennifer Kim',
      role: 'Data Analyst',
      content: 'No more switching between Indeed, LinkedIn, and other sites. This is the future of job search.',
      rating: 5
    }
  ]

  const jobTypes = [
    'Software Engineer',
    'Product Manager',
    'Data Scientist',
    'Marketing Manager',
    'Sales Executive',
    'Designer',
    'Customer Success',
    'DevOps Engineer'
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="h-8 w-8 bg-teal-600 rounded-full flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-gray-900">JobHunter Pro</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 transition-colors">How It Works</a>
              <a href="#testimonials" className="text-gray-600 hover:text-gray-900 transition-colors">Success Stories</a>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <Link to="/login" className="text-gray-600 hover:text-gray-900 transition-colors">
                Sign In
              </Link>
              <Link to="/register" className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all duration-200">
                Start Job Search
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
                <a href="#how-it-works" className="block px-3 py-2 text-gray-600 hover:text-gray-900">How It Works</a>
                <a href="#testimonials" className="block px-3 py-2 text-gray-600 hover:text-gray-900">Success Stories</a>
                <div className="pt-4 space-y-2">
                  <Link to="/login" className="block px-3 py-2 text-gray-600 hover:text-gray-900">
                    Sign In
                  </Link>
                  <Link to="/register" className="block px-3 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all duration-200 text-center">
                    Start Job Search
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12 sm:space-y-16">

        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-gray-900 mb-4 sm:mb-6">
            Find Your Dream Job
            <span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent"> Faster</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 max-w-3xl mx-auto px-4">
            Search across 50+ job boards at once. Get instant results with salary, location, 
            and company details. Stop wasting time jumping between sites.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12 px-4">
            <Link to="/register" className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg hover:from-teal-700 hover:to-emerald-700 transition-all duration-200 inline-flex items-center justify-center">
              Start Searching Jobs
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 ml-2" />
            </Link>
            <button className="bg-white border border-gray-300 text-gray-700 px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg hover:bg-gray-50 transition-colors inline-flex items-center justify-center">
              <Play className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              See How It Works
            </button>
          </div>

          {/* Popular Searches */}
          <div className="max-w-4xl mx-auto px-4">
            <p className="text-sm text-gray-500 mb-3 sm:mb-4">Popular searches:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {jobTypes.map((type, index) => (
                <span key={index} className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:border-teal-500 hover:text-teal-600 transition-colors cursor-pointer">
                  {type}
                </span>
              ))}
            </div>
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

        {/* How It Works */}
        <div id="how-it-works" className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Job Search Made Simple
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-12">
            Just describe what you're looking for in plain English
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-teal-600">1</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Describe Your Job</h3>
              <p className="text-gray-600">Type what you're looking for: "Remote software engineer jobs" or "Marketing manager in NYC"</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-teal-600">2</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">We Search Everything</h3>
              <p className="text-gray-600">Our platform searches 50+ job boards, career sites, and APIs instantly</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-teal-600">3</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Get Results Fast</h3>
              <p className="text-gray-600">See all jobs in one clean table with salary, location, and direct apply links</p>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Why Job Seekers Love Us
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Everything you need to find the perfect job in one place
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
        <div id="testimonials" className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Success Stories
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-12">
            Join thousands who found their dream jobs with us
          </p>
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
            Ready to Find Your Dream Job?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of job seekers who found better opportunities faster
          </p>
          <Link
            to="/register"
            className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-12 py-4 rounded-lg font-semibold text-lg hover:from-teal-700 hover:to-emerald-700 transition-all duration-200 inline-flex items-center"
          >
            Start Searching Now - It's Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>

      </div>
    </div>
  )
}

export default EnterpriseLanding


