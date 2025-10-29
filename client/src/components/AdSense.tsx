import { useEffect } from 'react'

interface AdSenseProps {
  adSlot: string
  adFormat?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal'
  adLayout?: string
  className?: string
  style?: React.CSSProperties
}

/**
 * Google AdSense Component
 * 
 * Usage:
 * <AdSense adSlot="1234567890" adFormat="auto" />
 * 
 * Get your ad slot ID from: https://adsense.google.com
 */
export default function AdSense({ 
  adSlot, 
  adFormat = 'auto',
  adLayout,
  className = '',
  style = {}
}: AdSenseProps) {
  const adClient = import.meta.env.VITE_ADSENSE_CLIENT_ID || 'ca-pub-0000000000000000'

  useEffect(() => {
    try {
      // Load AdSense script if not already loaded
      if (!(window as any).adsbygoogle) {
        const script = document.createElement('script')
        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'
        script.async = true
        script.crossOrigin = 'anonymous'
        script.setAttribute('data-ad-client', adClient)
        document.head.appendChild(script)
      }

      // Push ad
      ;((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({})
    } catch (error) {
      console.error('AdSense error:', error)
    }
  }, [adClient])

  // Don't show ads in development (AdSense doesn't work on localhost)
  if (import.meta.env.DEV) {
    return (
      <div 
        className={`bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4 text-center ${className}`}
        style={style}
      >
        <p className="text-sm text-slate-500 dark:text-slate-400">
          📢 Ad Space (Hidden in Development)
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          AdSense ads will appear here in production
        </p>
      </div>
    )
  }

  return (
    <div className={className} style={style}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', textAlign: 'center' }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-ad-layout={adLayout}
        data-full-width-responsive="true"
      />
    </div>
  )
}

