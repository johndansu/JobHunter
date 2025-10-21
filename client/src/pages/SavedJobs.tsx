import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  Heart, 
  Briefcase, 
  Building2,
  MapPin,
  DollarSign,
  ExternalLink,
  User,
  LogOut
} from 'lucide-react'
import { dataService } from '@/services/dataService'
import { useAuthStore } from '@/store/authStore'
import { cleanDescription } from '@/utils/htmlCleaner'

export default function SavedJobs() {
  const { user, logout } = useAuthStore()
  const [savedJobs, setSavedJobs] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('savedJobs')
    return saved ? new Set(JSON.parse(saved)) : new Set()
  })

  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['all-jobs'],
    queryFn: () => dataService.getData({ limit: 100 })
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

  // Filter only saved jobs
  const allJobs = jobsData?.data || []
  const filteredSavedJobs = allJobs.filter((item: any) => {
    const job = parseData(item.data)
    if (!job) return false
    const jobKey = `${item.id}-${job.title || 'untitled'}`
    return savedJobs.has(jobKey)
  })

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
              <Link to="/browse" className="text-slate-600 hover:text-slate-900 font-medium">
                Browse Jobs
              </Link>
              <Link to="/saved" className="text-slate-900 font-semibold">
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
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <Heart className="h-8 w-8 text-red-500 fill-current" />
            Saved Jobs
          </h1>
          <p className="text-slate-600">
            You have {savedJobs.size} saved {savedJobs.size === 1 ? 'job' : 'jobs'}
          </p>
        </div>

        {/* Saved Jobs List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading your saved jobs...</p>
          </div>
        ) : filteredSavedJobs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <Heart className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No saved jobs yet</h3>
            <p className="text-slate-600 mb-6">
              Start browsing and save jobs you're interested in
            </p>
            <Link
              to="/browse"
              className="inline-flex items-center space-x-2 bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
            >
              <Briefcase className="h-5 w-5" />
              <span>Browse Jobs</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSavedJobs.map((item: any, index: number) => {
              const job = parseData(item.data)
              if (!job) return null
              const jobKey = `${item.id}-${job.title || 'untitled'}`

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
                        title="Remove from saved"
                      >
                        <Heart className="h-5 w-5 fill-red-500 text-red-500" />
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
                        href={job.url || item.url}
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

