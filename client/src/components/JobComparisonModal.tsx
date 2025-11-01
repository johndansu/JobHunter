import { X, ExternalLink, MapPin, Briefcase, DollarSign, Check, Minus, Building2 } from 'lucide-react'
import { ComparisonJob } from '@/hooks/useJobComparison'
import { cleanDescription } from '@/utils/htmlCleaner'

interface JobComparisonModalProps {
  isOpen: boolean
  onClose: () => void
  jobs: ComparisonJob[]
  onRemove: (id: string) => void
}

export function JobComparisonModal({ isOpen, onClose, jobs, onRemove }: JobComparisonModalProps) {
  if (!isOpen) return null

  const ComparisonRow = ({ label, values, icon: Icon }: { label: string, values: (string | undefined)[], icon: any }) => (
    <div className="border-b border-slate-200 dark:border-slate-700">
      <div className="py-3 px-4 md:py-4 md:px-6 bg-slate-50 dark:bg-slate-800/50 font-semibold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="hidden md:grid md:grid-cols-3 divide-x divide-slate-200 dark:divide-slate-700">
        {values.map((value, idx) => (
          <div key={idx} className="p-4 text-sm text-slate-900 dark:text-slate-100">
            {value || <span className="text-slate-400 dark:text-slate-500 italic">Not specified</span>}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-0 md:p-4 pointer-events-none">
        <div 
          className="bg-white dark:bg-slate-900 rounded-none md:rounded-3xl shadow-2xl w-full h-full md:h-auto max-w-6xl max-h-screen md:max-h-[90vh] overflow-hidden pointer-events-auto animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 py-4 z-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Compare Jobs
                </h2>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} to compare
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="h-6 w-6 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(100vh-120px)] md:max-h-[calc(90vh-80px)]">
            {jobs.length === 0 ? (
              <div className="py-20 text-center">
                <Briefcase className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400">
                  Add jobs to compare them side-by-side
                </p>
              </div>
            ) : (
              <>
                {/* Desktop: Grid Layout */}
                <div className="hidden md:block">
                  {/* Job Headers */}
                  <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-700 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    {jobs.map(job => (
                      <div key={job.id} className="p-6">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 pr-2">
                            {job.title}
                          </h3>
                          <button
                            onClick={() => onRemove(job.id)}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
                          >
                            <X className="h-4 w-4 text-slate-400" />
                          </button>
                        </div>
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-4">
                          {job.company}
                        </p>
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                        >
                          Apply Now
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    ))}
                    {[...Array(3 - jobs.length)].map((_, idx) => (
                      <div key={`empty-${idx}`} className="p-6 flex items-center justify-center">
                        <div className="text-center text-slate-400 dark:text-slate-600">
                          <Minus className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-xs">Empty slot</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Comparison Rows */}
                  <ComparisonRow 
                    label="Location" 
                    icon={MapPin}
                    values={[...jobs.map(j => j.location), ...Array(3 - jobs.length).fill(undefined)]}
                  />
                  <ComparisonRow 
                    label="Job Type" 
                    icon={Briefcase}
                    values={[...jobs.map(j => j.type), ...Array(3 - jobs.length).fill(undefined)]}
                  />
                  <ComparisonRow 
                    label="Salary" 
                    icon={DollarSign}
                    values={[...jobs.map(j => j.salary), ...Array(3 - jobs.length).fill(undefined)]}
                  />

                  {/* Description */}
                  <div className="border-b border-slate-200 dark:border-slate-700">
                    <div className="py-4 px-6 bg-slate-50 dark:bg-slate-800/50 font-semibold text-sm text-slate-700 dark:text-slate-300">
                      Description
                    </div>
                    <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-700">
                      {jobs.map(job => (
                        <div key={job.id} className="p-4">
                          <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-6">
                            {job.description ? cleanDescription(job.description, 200) : (
                              <span className="text-slate-400 dark:text-slate-500 italic">
                                No description available
                              </span>
                            )}
                          </p>
                        </div>
                      ))}
                      {[...Array(3 - jobs.length)].map((_, idx) => (
                        <div key={`empty-desc-${idx}`} className="p-4">
                          <span className="text-slate-400 dark:text-slate-500 italic text-sm">
                            Not specified
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mobile: Card Layout */}
                <div className="block md:hidden">
                  <div className="p-4 space-y-4">
                    {jobs.map((job, index) => (
                      <div key={job.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-800">
                        {/* Job Number */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-sm">{index + 1}</span>
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                              JOB {index + 1}
                            </span>
                          </div>
                          <button
                            onClick={() => onRemove(job.id)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            <X className="h-4 w-4 text-slate-400" />
                          </button>
                        </div>

                        {/* Job Title */}
                        <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-2">
                          {job.title}
                        </h3>

                        {/* Company */}
                        <div className="flex items-center gap-2 mb-4">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                            {job.company}
                          </p>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          {job.location && (
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-teal-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Location</p>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{job.location}</p>
                              </div>
                            </div>
                          )}
                          {job.type && (
                            <div className="flex items-start gap-2">
                              <Briefcase className="h-4 w-4 text-teal-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Type</p>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{job.type}</p>
                              </div>
                            </div>
                          )}
                          {job.salary && job.salary !== 'Not specified' && (
                            <div className="flex items-start gap-2 col-span-2">
                              <DollarSign className="h-4 w-4 text-teal-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Salary</p>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{job.salary}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Description */}
                        {job.description && (
                          <div className="mb-4">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Description</p>
                            <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-4">
                              {cleanDescription(job.description, 150)}
                            </p>
                          </div>
                        )}

                        {/* Apply Button */}
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full text-center bg-teal-600 hover:bg-teal-700 text-white px-4 py-3 rounded-lg text-sm font-semibold transition-colors"
                        >
                          Apply Now
                        </a>
                      </div>
                    ))}

                    {/* Empty Slots */}
                    {[...Array(3 - jobs.length)].map((_, idx) => (
                      <div key={`empty-${idx}`} className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 bg-slate-50 dark:bg-slate-800/30">
                        <div className="text-center">
                          <Minus className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                          <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">Empty Slot</p>
                          <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">Add more jobs to compare</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
