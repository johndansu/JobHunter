import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Search, 
  MapPin, 
  ArrowRight,
  CheckCircle2,
  User,
  LogOut
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { locationService } from '@/services/locationService'

export default function JobBoardLanding() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [location, setLocation] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([])
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false)

  // Debounced location search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (location.length >= 2) {
        try {
          const suggestions = await locationService.searchLocations(location)
          setLocationSuggestions(suggestions)
          setShowLocationSuggestions(true)
        } catch (error) {
          console.error('Location search error:', error)
        }
      } else {
        setLocationSuggestions([])
        setShowLocationSuggestions(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [location])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(`/browse?q=${searchQuery}&location=${location}`)
  }

  const popularSearches = [
    'Remote Developer',
    'Product Manager',
    'UI/UX Designer',
    'Data Scientist',
    'Marketing Manager',
    'Full Stack Engineer'
  ]

  const features = [
    'Real-time job updates',
    'AI-powered recommendations',
    'Salary insights',
    'Company reviews'
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Clean Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="text-2xl font-bold text-slate-900">
              Job<span className="text-teal-600">Hunter</span>
            </Link>

            <nav className="hidden md:flex items-center space-x-8">
              <Link to="/browse" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
                Browse Jobs
              </Link>
              {user && (
                <>
                  <Link to="/saved" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
                    Saved ({(() => {
                      const saved = localStorage.getItem('savedJobs')
                      return saved ? JSON.parse(saved).length : 0
                    })()})
                  </Link>
                  <div className="flex items-center space-x-4 ml-4 pl-4 border-l border-slate-200">
                    <span className="text-sm text-slate-600">{user.username}</span>
                    <button
                      onClick={logout}
                      className="text-slate-600 hover:text-slate-900"
                    >
                      <LogOut className="h-5 w-5" />
                    </button>
                  </div>
                </>
              )}
            </nav>

            {!user && (
              <div className="flex items-center space-x-4">
                <Link 
                  to="/login" 
                  className="text-slate-600 hover:text-slate-900 font-medium"
                >
                  Sign In
                </Link>
                <Link 
                  to="/register" 
                  className="bg-teal-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-teal-700 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section - Clean & Minimal */}
      <section className="pt-20 pb-16 sm:pt-32 sm:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 mb-6 tracking-tight">
              Find your next
              <span className="block text-teal-600">opportunity</span>
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed">
              Discover thousands of jobs from top companies. Your dream career is just a search away.
            </p>
          </div>

          {/* Minimal Search Bar */}
          <form onSubmit={handleSearch} className="max-w-4xl mx-auto mb-16">
            <div className="bg-slate-50 rounded-2xl p-2 border border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                <div className="md:col-span-5">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Job title or keyword"
                      className="w-full px-4 py-4 bg-white border-0 rounded-xl focus:ring-2 focus:ring-teal-500 text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="md:col-span-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      onFocus={() => locationSuggestions.length > 0 && setShowLocationSuggestions(true)}
                      placeholder="Location"
                      className="w-full px-4 py-4 bg-white border-0 rounded-xl focus:ring-2 focus:ring-teal-500 text-slate-900 placeholder:text-slate-400"
                    />
                    {/* Location Suggestions Dropdown */}
                    {showLocationSuggestions && locationSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                        {locationSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              setLocation(suggestion)
                              setShowLocationSuggestions(false)
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-teal-50 transition-colors flex items-center space-x-2"
                          >
                            <MapPin className="h-4 w-4 text-teal-600 flex-shrink-0" />
                            <span className="text-sm text-slate-700 truncate">{suggestion}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-3">
                  <button
                    type="submit"
                    className="w-full bg-teal-600 text-white px-6 py-4 rounded-xl font-semibold hover:bg-teal-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <span>Search</span>
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Popular Searches */}
            <div className="mt-6 text-center">
              <span className="text-sm text-slate-500 mr-3">Popular:</span>
              {popularSearches.slice(0, 4).map((search, index) => (
                <button
                  key={search}
                  onClick={() => {
                    setSearchQuery(search)
                    navigate(`/browse?q=${search}`)
                  }}
                  className="text-sm text-slate-600 hover:text-teal-600 transition-colors mx-2"
                >
                  {search}
                  {index < 3 && <span className="text-slate-300 ml-2">•</span>}
                </button>
              ))}
            </div>
          </form>

          {/* Stats - Minimal */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-slate-900 mb-1">10,000+</div>
              <div className="text-sm text-slate-600">Active Jobs</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-slate-900 mb-1">500+</div>
              <div className="text-sm text-slate-600">Companies</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-slate-900 mb-1">50,000+</div>
              <div className="text-sm text-slate-600">Job Seekers</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-slate-900 mb-1">95%</div>
              <div className="text-sm text-slate-600">Success Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features - Clean List */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
              Everything you need to land your dream job
            </h2>
            <div className="grid md:grid-cols-2 gap-x-12 gap-y-6">
              {features.map((feature) => (
                <div key={feature} className="flex items-center space-x-3">
                  <CheckCircle2 className="h-6 w-6 text-teal-600 flex-shrink-0" />
                  <span className="text-lg text-slate-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Companies - Minimal Logos */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm uppercase tracking-wide text-slate-500 font-medium mb-8">
              Trusted by leading companies
            </p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-8 items-center justify-items-center">
              {['Google', 'Microsoft', 'Amazon', 'Meta', 'Apple', 'Netflix'].map((company) => (
                <div
                  key={company}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <div className="text-2xl font-bold">{company.charAt(0)}</div>
                  <div className="text-xs mt-1">{company}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA - Minimal */}
      <section className="py-20 bg-teal-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to get started?
          </h2>
          <p className="text-xl text-teal-100 mb-8">
            Join thousands finding their perfect job
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/browse"
              className="inline-flex items-center justify-center space-x-2 bg-white text-teal-600 px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              <span>Browse Jobs</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            {!user && (
              <Link
                to="/register"
                className="inline-flex items-center justify-center space-x-2 bg-teal-700 text-white px-8 py-4 rounded-xl font-semibold hover:bg-teal-800 transition-all border-2 border-white/20"
              >
                <span>Create Account</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer - Minimal */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold">
                Job<span className="text-teal-400">Hunter</span>
              </span>
            </div>

            <div className="flex space-x-8 text-sm text-slate-400">
              <Link to="/browse" className="hover:text-white transition-colors">Browse Jobs</Link>
              <a href="#" className="hover:text-white transition-colors">About</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-500">
            <p>&copy; 2025 JobHunter. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
