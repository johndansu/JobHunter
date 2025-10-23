import { useState } from 'react'
import { X, DollarSign, MapPin, Briefcase, Filter } from 'lucide-react'

export interface JobFiltersState {
  salaryRange: [number, number]
  jobTypes: string[]
  workMode: string[]
  experienceLevel: string[]
}

interface JobFiltersProps {
  isOpen: boolean
  onClose: () => void
  filters: JobFiltersState
  onFiltersChange: (filters: JobFiltersState) => void
  onClear: () => void
}

export const DEFAULT_FILTERS: JobFiltersState = {
  salaryRange: [0, 300000],
  jobTypes: [],
  workMode: [],
  experienceLevel: []
}

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship']
const WORK_MODES = ['Remote', 'Hybrid', 'On-site']
const EXPERIENCE_LEVELS = ['Entry Level', 'Mid Level', 'Senior Level', 'Lead', 'Executive']

export function JobFilters({ isOpen, onClose, filters, onFiltersChange, onClear }: JobFiltersProps) {
  const [localFilters, setLocalFilters] = useState(filters)

  if (!isOpen) return null

  const hasActiveFilters = 
    localFilters.jobTypes.length > 0 ||
    localFilters.workMode.length > 0 ||
    localFilters.experienceLevel.length > 0 ||
    localFilters.salaryRange[0] > 0 ||
    localFilters.salaryRange[1] < 300000

  const handleApply = () => {
    onFiltersChange(localFilters)
    onClose()
  }

  const handleClearAll = () => {
    setLocalFilters(DEFAULT_FILTERS)
    onClear()
  }

  const toggleArrayFilter = (category: keyof Pick<JobFiltersState, 'jobTypes' | 'workMode' | 'experienceLevel'>, value: string) => {
    setLocalFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(v => v !== value)
        : [...prev[category], value]
    }))
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fadeIn"
        onClick={onClose}
      />

      {/* Filters Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-y-auto animate-slideIn">
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                <Filter className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Filters</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Salary Range */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
              <DollarSign className="h-4 w-4" />
              Salary Range
            </label>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={localFilters.salaryRange[0]}
                  onChange={(e) => setLocalFilters(prev => ({
                    ...prev,
                    salaryRange: [Number(e.target.value), prev.salaryRange[1]]
                  }))}
                  className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder="Min"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="number"
                  value={localFilters.salaryRange[1]}
                  onChange={(e) => setLocalFilters(prev => ({
                    ...prev,
                    salaryRange: [prev.salaryRange[0], Number(e.target.value)]
                  }))}
                  className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder="Max"
                />
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                ${localFilters.salaryRange[0].toLocaleString()} - ${localFilters.salaryRange[1].toLocaleString()} per year
              </div>
            </div>
          </div>

          {/* Job Type */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
              <Briefcase className="h-4 w-4" />
              Job Type
            </label>
            <div className="space-y-2">
              {JOB_TYPES.map(type => (
                <label
                  key={type}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={localFilters.jobTypes.includes(type)}
                    onChange={() => toggleArrayFilter('jobTypes', type)}
                    className="w-4 h-4 text-teal-600 border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Work Mode */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
              <MapPin className="h-4 w-4" />
              Work Mode
            </label>
            <div className="space-y-2">
              {WORK_MODES.map(mode => (
                <label
                  key={mode}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={localFilters.workMode.includes(mode)}
                    onChange={() => toggleArrayFilter('workMode', mode)}
                    className="w-4 h-4 text-teal-600 border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{mode}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Experience Level */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
              <Briefcase className="h-4 w-4" />
              Experience Level
            </label>
            <div className="space-y-2">
              {EXPERIENCE_LEVELS.map(level => (
                <label
                  key={level}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={localFilters.experienceLevel.includes(level)}
                    onChange={() => toggleArrayFilter('experienceLevel', level)}
                    className="w-4 h-4 text-teal-600 border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{level}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-6 space-y-3">
          <button
            onClick={handleApply}
            className="w-full bg-gradient-to-r from-teal-600 to-teal-600 text-white py-3.5 rounded-xl font-bold hover:shadow-xl hover:shadow-teal-500/30 transition-all"
          >
            Apply Filters
          </button>
          {hasActiveFilters && (
            <button
              onClick={handleClearAll}
              className="w-full border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-3 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>
    </>
  )
}

