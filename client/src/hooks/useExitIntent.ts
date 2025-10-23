import { useEffect, useCallback, useState } from 'react'

interface UseExitIntentOptions {
  onExitIntent: () => void
  delay?: number
  sensitivity?: number
  enabled?: boolean
}

export function useExitIntent({
  onExitIntent,
  delay = 1000,
  sensitivity = 20,
  enabled = true
}: UseExitIntentOptions) {
  const [hasShown, setHasShown] = useState(false)
  const [isEligible, setIsEligible] = useState(false)

  // User must be on page for at least `delay` ms before exit intent triggers
  useEffect(() => {
    if (!enabled) return

    const timer = setTimeout(() => {
      setIsEligible(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay, enabled])

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    if (!enabled || !isEligible || hasShown) return

    // Check if mouse is leaving from the top of the viewport
    const shouldShow = e.clientY <= sensitivity && e.relatedTarget === null

    if (shouldShow) {
      setHasShown(true)
      onExitIntent()
    }
  }, [enabled, isEligible, hasShown, sensitivity, onExitIntent])

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('mouseout', handleMouseLeave)
    return () => document.removeEventListener('mouseout', handleMouseLeave)
  }, [enabled, handleMouseLeave])

  // Reset the shown state (useful for testing or if you want to show again after certain actions)
  const reset = useCallback(() => {
    setHasShown(false)
  }, [])

  return { reset, hasShown }
}

