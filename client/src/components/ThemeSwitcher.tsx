import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export function ThemeSwitcher() {
  const { theme, setTheme, effectiveTheme } = useTheme()

  return (
    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      <button
        onClick={() => setTheme('light')}
        className={`p-2 rounded-md transition-all ${
          theme === 'light'
            ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
        }`}
        title={`Light Mode${theme === 'light' ? ' (Active)' : ''}`}
      >
        <Sun className="h-4 w-4" />
      </button>
      
      <button
        onClick={() => setTheme('system')}
        className={`p-2 rounded-md transition-all ${
          theme === 'system'
            ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
        }`}
        title={`System Mode${theme === 'system' ? ' (Active - ' + effectiveTheme + ')' : ''}`}
      >
        <Monitor className="h-4 w-4" />
      </button>
      
      <button
        onClick={() => setTheme('dark')}
        className={`p-2 rounded-md transition-all ${
          theme === 'dark'
            ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
        }`}
        title={`Dark Mode${theme === 'dark' ? ' (Active)' : ''}`}
      >
        <Moon className="h-4 w-4" />
      </button>
    </div>
  )
}

