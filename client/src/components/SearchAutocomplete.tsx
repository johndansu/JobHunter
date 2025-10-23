import { Clock, Search, TrendingUp, X } from 'lucide-react'
import { useSearchHistory, SearchHistoryItem } from '@/hooks/useSearchHistory'

interface SearchAutocompleteProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (query: string, location?: string) => void
  currentQuery: string
}

const POPULAR_SEARCHES = [
  { query: 'Software Engineer', icon: TrendingUp },
  { query: 'Product Manager', icon: TrendingUp },
  { query: 'Data Scientist', icon: TrendingUp },
  { query: 'Frontend Developer', icon: TrendingUp },
  { query: 'Backend Developer', icon: TrendingUp },
  { query: 'Full Stack Developer', icon: TrendingUp },
  { query: 'DevOps Engineer', icon: TrendingUp },
  { query: 'UI/UX Designer', icon: TrendingUp }
]

export function SearchAutocomplete({ isOpen, onClose, onSelect, currentQuery }: SearchAutocompleteProps) {
  const { history, removeSearch, clearHistory } = useSearchHistory()

  if (!isOpen) return null

  // Filter popular searches based on current query
  const filteredPopular = currentQuery.trim()
    ? POPULAR_SEARCHES.filter(s => 
        s.query.toLowerCase().includes(currentQuery.toLowerCase())
      )
    : POPULAR_SEARCHES

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-30"
        onClick={onClose}
      />

      {/* Dropdown */}
      <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-40 max-h-96 overflow-y-auto animate-slideDown">
        {/* Recent Searches */}
        {history.length > 0 && (
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Searches
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  clearHistory()
                }}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="space-y-1">
              {history.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer transition-colors"
                  onClick={() => {
                    onSelect(item.query, item.location)
                    onClose()
                  }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Clock className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {item.query}
                      </p>
                      {item.location && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          in {item.location}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeSearch(item.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-all"
                  >
                    <X className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Popular/Suggested Searches */}
        {filteredPopular.length > 0 && (
          <div className="p-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4" />
              {currentQuery.trim() ? 'Suggestions' : 'Popular Searches'}
            </h3>
            <div className="space-y-1">
              {filteredPopular.slice(0, 8).map((search, index) => {
                const Icon = search.icon
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer transition-colors"
                    onClick={() => {
                      onSelect(search.query)
                      onClose()
                    }}
                  >
                    <Icon className="h-4 w-4 text-teal-500 flex-shrink-0" />
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {search.query}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* No results */}
        {history.length === 0 && filteredPopular.length === 0 && (
          <div className="p-8 text-center">
            <Search className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No search suggestions</p>
          </div>
        )}
      </div>
    </>
  )
}

