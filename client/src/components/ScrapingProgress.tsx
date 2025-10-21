import { useState, useEffect } from 'react'
import { Activity, CheckCircle, XCircle, Clock, Database } from 'lucide-react'

interface ScrapingProgressProps {
  jobId: string
  isVisible: boolean
  onClose: () => void
}

interface ProgressData {
  currentPage: number
  maxPages: number
  dataPoints: number
  status: 'running' | 'completed' | 'failed'
  error?: string
}

const ScrapingProgress = ({ jobId, isVisible, onClose }: ScrapingProgressProps) => {
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!isVisible || !jobId) return

    // Connect to WebSocket for real-time updates
    const ws = new WebSocket(`ws://localhost:5001`)
    
    ws.onopen = () => {
      setIsConnected(true)
      console.log('WebSocket connected')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'scraping_progress' && data.data.jobId === jobId) {
          setProgress({
            currentPage: data.data.currentPage,
            maxPages: data.data.maxPages,
            dataPoints: data.data.dataPoints,
            status: 'running'
          })
        } else if (data.type === 'job_completed' && data.data.jobId === jobId) {
          setProgress(prev => prev ? {
            ...prev,
            status: data.data.success ? 'completed' : 'failed',
            error: data.data.success ? undefined : 'Job failed'
          } : null)
        } else if (data.type === 'job_failed' && data.data.jobId === jobId) {
          setProgress(prev => prev ? {
            ...prev,
            status: 'failed',
            error: data.data.error
          } : null)
        }
      } catch (error) {
        console.error('WebSocket message error:', error)
      }
    }

    ws.onclose = () => {
      setIsConnected(false)
      console.log('WebSocket disconnected')
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setIsConnected(false)
    }

    return () => {
      ws.close()
    }
  }, [isVisible, jobId])

  if (!isVisible || !progress) return null

  const progressPercentage = progress.maxPages > 0 
    ? Math.round((progress.currentPage / progress.maxPages) * 100)
    : 0

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'running':
        return <Activity className="h-5 w-5 text-teal-600 animate-pulse" />
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusText = () => {
    switch (progress.status) {
      case 'running':
        return 'Scraping in progress...'
      case 'completed':
        return 'Scraping completed!'
      case 'failed':
        return 'Scraping failed'
      default:
        return 'Preparing...'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Scraping Progress</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <span className="text-sm font-medium text-gray-900">
              {getStatusText()}
            </span>
            {!isConnected && (
              <span className="text-xs text-red-500">(Disconnected)</span>
            )}
          </div>

          {/* Progress Bar */}
          {progress.status === 'running' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Page {progress.currentPage} of {progress.maxPages}</span>
                <span>{progressPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Data Points */}
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Database className="h-4 w-4" />
            <span>{progress.dataPoints} data points collected</span>
          </div>

          {/* Error Message */}
          {progress.error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">{progress.error}</p>
            </div>
          )}

          {/* Actions */}
          {progress.status === 'completed' && (
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 bg-teal-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-teal-700"
              >
                View Results
              </button>
            </div>
          )}

          {progress.status === 'failed' && (
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ScrapingProgress
