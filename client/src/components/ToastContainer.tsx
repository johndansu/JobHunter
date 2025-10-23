import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import Toast, { ToastType } from './Toast'

interface ToastData {
  id: string
  message: string
  type: ToastType
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, action?: ToastData['action']) => void
  showSuccess: (message: string, action?: ToastData['action']) => void
  showError: (message: string, action?: ToastData['action']) => void
  showInfo: (message: string, action?: ToastData['action']) => void
  showWarning: (message: string, action?: ToastData['action']) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'info', action?: ToastData['action']) => {
    const id = Math.random().toString(36).substring(7)
    setToasts(prev => [...prev, { id, message, type, action }])
  }, [])

  const showSuccess = useCallback((message: string, action?: ToastData['action']) => {
    showToast(message, 'success', action)
  }, [showToast])

  const showError = useCallback((message: string, action?: ToastData['action']) => {
    showToast(message, 'error', action)
  }, [showToast])

  const showInfo = useCallback((message: string, action?: ToastData['action']) => {
    showToast(message, 'info', action)
  }, [showToast])

  const showWarning = useCallback((message: string, action?: ToastData['action']) => {
    showToast(message, 'warning', action)
  }, [showToast])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, showWarning }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            action={toast.action}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

