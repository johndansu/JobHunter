import { useEffect } from 'react'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastProps {
  message: string
  type?: ToastType
  onClose: () => void
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export default function Toast({ 
  message, 
  type = 'info', 
  onClose, 
  duration = 5000,
  action 
}: ToastProps) {
  useEffect(() => {
    if (!action && duration > 0) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [onClose, duration, action])

  const icons = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
  }

  const styles = {
    success: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    error: 'bg-red-50 text-red-900 border-red-200',
    warning: 'bg-amber-50 text-amber-900 border-amber-200',
    info: 'bg-blue-50 text-blue-900 border-blue-200'
  }

  const Icon = icons[type]

  return (
    <div className={`${styles[type]} border rounded-xl p-4 shadow-lg backdrop-blur-sm flex items-center gap-3 min-w-[320px] max-w-md animate-slideDown`}>
      <Icon className="h-5 w-5 flex-shrink-0" />
      
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
      </div>

      {action && (
        <button
          onClick={action.onClick}
          className="px-3 py-1 text-sm font-semibold hover:underline"
        >
          {action.label}
        </button>
      )}

      <button
        onClick={onClose}
        className="p-1 hover:bg-black/5 rounded-lg transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

