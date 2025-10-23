import { useState } from 'react'
import { X, Mail, Bell, Sparkles, TrendingUp } from 'lucide-react'

interface ExitIntentModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ExitIntentModal({ isOpen, onClose }: ExitIntentModalProps) {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    setIsSuccess(true)
    
    // Store in localStorage
    localStorage.setItem('exitIntentEmail', email)
    localStorage.setItem('exitIntentDismissed', 'true')

    // Close after showing success
    setTimeout(() => {
      onClose()
    }, 2000)
  }

  const handleClose = () => {
    localStorage.setItem('exitIntentDismissed', 'true')
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] animate-fadeIn"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-8 pointer-events-auto animate-slideUp relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Decorative gradient orb */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-teal-400/30 to-cyan-400/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-tr from-purple-400/20 to-pink-400/20 rounded-full blur-3xl" />

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>

          {isSuccess ? (
            // Success State
            <div className="text-center relative z-10 py-4">
              <div className="inline-flex p-4 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full mb-4">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                You're all set! 🎉
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                We'll notify you about the best job opportunities
              </p>
            </div>
          ) : (
            // Main Content
            <div className="relative z-10">
              {/* Icon */}
              <div className="inline-flex p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl mb-4">
                <Bell className="h-6 w-6 text-white" />
              </div>

              {/* Heading */}
              <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                Wait! Don't miss out 👋
              </h2>

              {/* Description */}
              <p className="text-slate-600 dark:text-slate-300 mb-6 text-lg">
                Get personalized job alerts delivered straight to your inbox. Never miss your dream job again!
              </p>

              {/* Benefits */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    <strong>Daily</strong> curated job matches
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center">
                    <Bell className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    Be the <strong>first</strong> to apply to new postings
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    <strong>100% free</strong>, unsubscribe anytime
                  </span>
                </div>
              </div>

              {/* Email Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full pl-12 pr-4 py-3.5 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-base"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 text-white py-3.5 rounded-xl font-bold hover:shadow-xl hover:shadow-teal-500/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Getting ready...
                    </span>
                  ) : (
                    'Get Job Alerts'
                  )}
                </button>
              </form>

              {/* Footer note */}
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-4">
                Join 50,000+ job seekers already receiving alerts
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

