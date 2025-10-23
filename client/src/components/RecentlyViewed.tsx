import { Clock, X, Building2, MapPin, Briefcase, ExternalLink } from 'lucide-react'
import { useRecentlyViewed, RecentJob } from '@/hooks/useRecentlyViewed'

export function RecentlyViewed() {
  const { recentJobs, removeRecentJob, clearRecentJobs } = useRecentlyViewed()

  if (recentJobs.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Recently Viewed</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{recentJobs.length} job{recentJobs.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={clearRecentJobs}
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 font-medium transition-colors"
        >
          Clear All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {recentJobs.map((job) => (
          <div
            key={job.id}
            className="group bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all relative"
          >
            {/* Remove button */}
            <button
              onClick={() => removeRecentJob(job.id)}
              className="absolute top-2 right-2 p-1 bg-white dark:bg-slate-800 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <X className="h-3 w-3 text-slate-400" />
            </button>

            {/* Company Logo */}
            <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center mb-3">
              <Building2 className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            </div>

            {/* Job Info */}
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-1 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {job.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">{job.company}</p>

            {/* Meta */}
            <div className="flex flex-col gap-1 mb-3">
              {job.location && (
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{job.location}</span>
                </div>
              )}
              {job.type && (
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Briefcase className="h-3 w-3 flex-shrink-0" />
                  <span>{job.type}</span>
                </div>
              )}
            </div>

            {/* View button */}
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
            >
              View Job
              <ExternalLink className="h-3 w-3" />
            </a>

            {/* Time indicator */}
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">
              {getTimeAgo(job.viewedAt)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return `${Math.floor(seconds / 604800)}w ago`
}

