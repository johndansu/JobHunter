import { Sparkles, Building2, MapPin, Briefcase, ExternalLink, Heart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getJobRecommendations } from '@/utils/jobRecommendations'

interface Job {
  title: string
  company: string
  location?: string
  type?: string
  description?: string
  url: string
  salary?: string
}

interface JobRecommendationsProps {
  allJobs: Job[]
  savedJobIds: Set<string>
  viewedJobs: Job[]
  onSaveJob: (jobKey: string, jobTitle?: string) => void
  onViewJob: (job: Job) => void
}

export function JobRecommendations({
  allJobs,
  savedJobIds,
  viewedJobs,
  onSaveJob,
  onViewJob
}: JobRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Job[]>([])

  useEffect(() => {
    // Get saved jobs from all jobs
    const savedJobs = allJobs.filter((_, idx) => 
      savedJobIds.has(`${_.title || 'untitled'}-${_.company || 'company'}-${idx}`)
    )

    // Generate recommendations
    const recommended = getJobRecommendations(allJobs, savedJobs, viewedJobs, 6)
    setRecommendations(recommended)
  }, [allJobs, savedJobIds, viewedJobs])

  if (recommendations.length === 0) return null

  return (
    <div className="bg-gradient-to-br from-teal-50 to-teal-50 dark:from-teal-900/20 dark:to-teal-900/20 rounded-2xl p-6 border border-teal-200 dark:border-teal-800 shadow-sm mb-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-gradient-to-br from-teal-600 to-teal-600 rounded-lg">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Recommended for You
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Based on your saved and viewed jobs
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map((job, index) => {
          const jobKey = `${job.title || 'untitled'}-${job.company || 'company'}-${index}`
          const isSaved = savedJobIds.has(jobKey)

          return (
            <div
              key={index}
              className="group bg-white dark:bg-slate-800/50 rounded-xl p-4 border border-teal-200 dark:border-teal-700 hover:border-teal-400 dark:hover:border-teal-500 hover:shadow-lg transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 bg-gradient-to-br from-teal-100 to-teal-100 dark:from-teal-900/30 dark:to-teal-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                <button
                  onClick={() => onSaveJob(jobKey, job.title)}
                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                >
                  <Heart
                    className={`h-4 w-4 transition-all ${
                      isSaved
                        ? 'fill-red-500 text-red-500'
                        : 'text-slate-300 hover:text-red-400'
                    }`}
                  />
                </button>
              </div>

              {/* Job Info */}
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-1 line-clamp-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
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

              {/* CTA */}
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onViewJob(job)}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-teal-600 to-teal-600 hover:from-teal-700 hover:to-teal-700 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-all"
              >
                View Job
                <ExternalLink className="h-3 w-3" />
              </a>

              {/* AI Badge */}
              <div className="mt-2 flex items-center justify-center gap-1 text-xs text-teal-600 dark:text-teal-400">
                <Sparkles className="h-3 w-3" />
                <span className="font-medium">AI Suggested</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

