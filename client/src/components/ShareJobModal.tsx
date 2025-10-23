import { useState } from 'react'
import { X, Copy, Mail, Check, Share2 } from 'lucide-react'

interface ShareJobModalProps {
  isOpen: boolean
  onClose: () => void
  jobTitle: string
  jobUrl: string
  company: string
}

export function ShareJobModal({ isOpen, onClose, jobTitle, jobUrl, company }: ShareJobModalProps) {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const shareText = `Check out this ${jobTitle} position at ${company}!`
  const encodedText = encodeURIComponent(shareText)
  const encodedUrl = encodeURIComponent(jobUrl)

  const shareLinks = [
    {
      name: 'Twitter',
      icon: '𝕏',
      color: 'hover:bg-black hover:text-white',
      url: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
    },
    {
      name: 'LinkedIn',
      icon: 'in',
      color: 'hover:bg-[#0077B5] hover:text-white',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
    },
    {
      name: 'Facebook',
      icon: 'f',
      color: 'hover:bg-[#1877F2] hover:text-white',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
    },
    {
      name: 'WhatsApp',
      icon: '💬',
      color: 'hover:bg-[#25D366] hover:text-white',
      url: `https://wa.me/?text=${encodedText}%20${encodedUrl}`
    }
  ]

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(jobUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Job Opportunity: ${jobTitle}`)
    const body = encodeURIComponent(`I thought you might be interested in this job:\n\n${jobTitle} at ${company}\n\n${jobUrl}`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 pointer-events-auto animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                <Share2 className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Share Job
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>

          {/* Job Info */}
          <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
              {jobTitle}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {company}
            </p>
          </div>

          {/* Social Share Buttons */}
          <div className="mb-6">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Share on social media
            </p>
            <div className="grid grid-cols-4 gap-3">
              {shareLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 transition-all ${link.color} group`}
                >
                  <div className="text-2xl group-hover:scale-110 transition-transform">
                    {link.icon}
                  </div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400 group-hover:text-current">
                    {link.name}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Email Share */}
          <div className="mb-6">
            <button
              onClick={shareViaEmail}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors group"
            >
              <Mail className="h-5 w-5 text-slate-600 dark:text-slate-400 group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Share via Email
              </span>
            </button>
          </div>

          {/* Copy Link */}
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Or copy link
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={jobUrl}
                readOnly
                className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400 focus:outline-none"
              />
              <button
                onClick={copyToClipboard}
                className={`px-4 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                  copied
                    ? 'bg-green-600 text-white'
                    : 'bg-teal-600 hover:bg-teal-700 text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

