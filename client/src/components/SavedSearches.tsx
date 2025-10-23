import { Bell, BellOff, Play, Trash2, Search as SearchIcon, MapPin } from 'lucide-react'
import { useSavedSearches, SavedSearch } from '@/hooks/useSavedSearches'
import { JobFiltersState } from '@/components/JobFilters'

interface SavedSearchesProps {
  onApply: (query: string, location: string | undefined, filters: JobFiltersState) => void
}

export function SavedSearches({ onApply }: SavedSearchesProps) {
  const { savedSearches, deleteSearch, toggleAlert } = useSavedSearches()

  if (savedSearches.length === 0) return null

  const formatFilters = (filters: JobFiltersState) => {
    const parts: string[] = []
    
    if (filters.salaryRange[0] > 0 || filters.salaryRange[1] < 300000) {
      parts.push(`$${filters.salaryRange[0] / 1000}k-${filters.salaryRange[1] / 1000}k`)
    }
    if (filters.jobTypes.length > 0) {
      parts.push(filters.jobTypes.join(', '))
    }
    if (filters.workMode.length > 0) {
      parts.push(filters.workMode.join(', '))
    }
    if (filters.experienceLevel.length > 0) {
      parts.push(filters.experienceLevel.join(', '))
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'No filters'
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm mb-8">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
            <SearchIcon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Saved Searches</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {savedSearches.length} saved • {savedSearches.filter(s => s.alertEnabled).length} with alerts
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {savedSearches.map((search) => (
          <div
            key={search.id}
            className="group bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-md transition-all relative"
          >
            {/* Alert Badge */}
            {search.alertEnabled && (
              <div className="absolute -top-2 -right-2 bg-teal-600 text-white rounded-full p-1.5">
                <Bell className="h-3 w-3" />
              </div>
            )}

            {/* Search Name */}
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 pr-8">
              {search.name}
            </h3>

            {/* Query & Location */}
            <div className="space-y-1.5 mb-3">
              {search.query && (
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <SearchIcon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{search.query}</span>
                </div>
              )}
              {search.location && (
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{search.location}</span>
                </div>
              )}
            </div>

            {/* Filters */}
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-1">
              {formatFilters(search.filters)}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onApply(search.query, search.location, search.filters)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
              >
                <Play className="h-3 w-3" />
                Run Search
              </button>
              <button
                onClick={() => toggleAlert(search.id)}
                className={`p-2 rounded-lg transition-colors ${
                  search.alertEnabled
                    ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
                }`}
                title={search.alertEnabled ? 'Disable alerts' : 'Enable alerts'}
              >
                {search.alertEnabled ? (
                  <Bell className="h-4 w-4" />
                ) : (
                  <BellOff className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => deleteSearch(search.id)}
                className="p-2 bg-slate-200 dark:bg-slate-700 hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
                title="Delete search"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Created date */}
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">
              Saved {new Date(search.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

