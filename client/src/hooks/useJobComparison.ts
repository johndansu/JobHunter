import { useState, useCallback } from 'react'

export interface ComparisonJob {
  id: string
  title: string
  company: string
  location: string
  salary?: string
  type?: string
  description?: string
  url: string
}

const MAX_COMPARE = 3

export function useJobComparison() {
  const [compareList, setCompareList] = useState<ComparisonJob[]>([])

  const addToCompare = useCallback((job: ComparisonJob) => {
    setCompareList(prev => {
      // Check if already in list
      if (prev.some(j => j.id === job.id)) {
        return prev
      }

      // Check if at max capacity
      if (prev.length >= MAX_COMPARE) {
        return prev
      }

      return [...prev, job]
    })
  }, [])

  const removeFromCompare = useCallback((id: string) => {
    setCompareList(prev => prev.filter(j => j.id !== id))
  }, [])

  const clearCompare = useCallback(() => {
    setCompareList([])
  }, [])

  const isInCompare = useCallback((id: string) => {
    return compareList.some(j => j.id === id)
  }, [compareList])

  const canAddMore = compareList.length < MAX_COMPARE

  return {
    compareList,
    addToCompare,
    removeFromCompare,
    clearCompare,
    isInCompare,
    canAddMore,
    count: compareList.length
  }
}

