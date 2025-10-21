import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  Search, 
  MapPin, 
  Briefcase, 
  Building2,
  DollarSign,
  Clock,
  Heart,
  ExternalLink,
  Filter,
  X,
  User,
  LogOut,
  RefreshCw
} from 'lucide-react'
import { searchService } from '@/services/searchService'
import { locationService } from '@/services/locationService'
import { useAuthStore } from '@/store/authStore'
import { cleanDescription } from '@/utils/htmlCleaner'

export default function BrowseJobs() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, logout } = useAuthStore()
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [location, setLocation] = useState(searchParams.get('location') || '')
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([])
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0) // For random refresh
  const [savedJobs, setSavedJobs] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('savedJobs')
    return saved ? new Set(JSON.parse(saved)) : new Set()
  })

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

  // Fetch jobs directly from APIs, not from admin's database
  const { data: jobsData, isLoading, refetch } = useQuery({
    queryKey: ['browse-jobs', searchQuery, location, refreshKey],
    queryFn: () => searchService.searchJobs(searchQuery, location),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false
  })

  const toggleSaveJob = (jobKey: string) => {
    setSavedJobs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(jobKey)) {
        newSet.delete(jobKey)
      } else {
        newSet.add(jobKey)
      }
      localStorage.setItem('savedJobs', JSON.stringify([...newSet]))
      return newSet
    })
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

  // Jobs come directly from APIs, already filtered by backend
  const jobs = jobsData?.data || []
  
  // Fisher-Yates shuffle for randomization when browsing without search
  const shuffleArray = (array: any[]) => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  // Randomize when not searching
  const displayJobs = (!searchQuery && !location) ? shuffleArray(jobs) : jobs

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1) // Trigger new random shuffle
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="text-2xl font-bold text-slate-900">
              Job<span className="text-teal-600">Hunter</span>
            </Link>

            <nav className="hidden md:flex items-center space-x-8">
              <Link to="/browse" className="text-slate-900 font-semibold">
                Browse Jobs
              </Link>
              <Link to="/saved" className="text-slate-600 hover:text-slate-900 font-medium">
                Saved ({savedJobs.size})
              </Link>
              {user && (
                <div className="flex items-center space-x-4 ml-4 pl-4 border-l border-slate-200">
                  <span className="text-sm text-slate-600">{user.username}</span>
                  <button onClick={logout} className="text-slate-600 hover:text-slate-900">
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              )}
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Job title or keywords"
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="md:col-span-4">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 z-10" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onFocus={() => locationSuggestions.length > 0 && setShowLocationSuggestions(true)}
                  placeholder="Location (city, state, country)"
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                {/* Location Suggestions Dropdown */}
                {showLocationSuggestions && locationSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {locationSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setLocation(suggestion)
                          setShowLocationSuggestions(false)
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-teal-50 transition-colors flex items-center space-x-2"
                      >
                        <MapPin className="h-4 w-4 text-teal-600 flex-shrink-0" />
                        <span className="text-sm text-slate-700 truncate">{suggestion}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-3 flex gap-2">
              <button className="flex-1 bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors">
                Search
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Filter className="h-5 w-5 text-slate-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Results Count & Refresh */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">
            {displayJobs.length} Jobs Found
          </h2>
          {!searchQuery && !location && (
            <button
              onClick={handleRefresh}
              className="flex items-center space-x-2 px-4 py-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
            >
              <RefreshCw className="h-5 w-5" />
              <span className="hidden sm:inline">Refresh Results</span>
            </button>
          )}
        </div>

        {/* Job Listings */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Searching job markets...</p>
          </div>
        ) : displayJobs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <Briefcase className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No jobs found</h3>
            <p className="text-slate-600">Try adjusting your search criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayJobs.map((job: any, index: number) => {
              if (!job) return null
              const jobKey = `${job.title || 'untitled'}-${job.company || 'company'}-${index}`

              return (
                <div
                  key={index}
                  className="group bg-white rounded-2xl p-6 hover:shadow-xl transition-all duration-300 border border-slate-100 hover:border-teal-200 flex flex-col"
                >
                  {/* Company Logo & Save Button */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-14 w-14 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Building2 className="h-7 w-7 text-teal-600" />
                    </div>
                    <button
                      onClick={() => toggleSaveJob(jobKey)}
                      className="p-2 hover:bg-red-50 rounded-full transition-all"
                    >
                      <Heart
                        className={`h-5 w-5 transition-all ${
                          savedJobs.has(jobKey)
                            ? 'fill-red-500 text-red-500'
                            : 'text-slate-300 group-hover:text-red-400'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Job Title */}
                  <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-teal-600 transition-colors line-clamp-2">
                    {job.title || 'No Title'}
                  </h3>

                  {/* Company Name */}
                  <p className="text-sm font-medium text-slate-700 mb-3">{job.company || 'Company'}</p>

                  {/* Location */}
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{job.location || 'Remote'}</span>
                  </div>

                  {/* Description */}
                  {job.description && (
                    <p className="text-slate-600 text-sm leading-relaxed mb-4 line-clamp-3 flex-1">
                      {cleanDescription(job.description, 200)}
                    </p>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {job.type && (
                      <span className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-medium">
                        {job.type}
                      </span>
                    )}
                    {job.salary && job.salary !== 'Not specified' && (
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {job.salary}
                      </span>
                    )}
                  </div>

                  {/* Footer - Source & Apply Button */}
                  <div className="pt-4 border-t border-slate-100 mt-auto">
                    {job.source && (
                      <p className="text-xs text-slate-400 mb-3">via {job.source}</p>
                    )}
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-4 py-3 rounded-xl font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm"
                    >
                      <span>Apply Now</span>
                      <ExternalLink className="h-4 w-4" />
                    </a>
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

