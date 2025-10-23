import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'recentlyViewedJobs'
const MAX_RECENT_JOBS = 10

export interface RecentJob {
  id: string
  title: string
  company: string
  location: string
  type?: string
  salary?: string
  url: string
  viewedAt: number
}

export function useRecentlyViewed() {
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setRecentJobs(parsed)
      }
    } catch (error) {
      console.error('Error loading recently viewed jobs:', error)
    }
  }, [])

  // Add a job to recently viewed
  const addRecentJob = useCallback((job: Omit<RecentJob, 'viewedAt'>) => {
    setRecentJobs(prev => {
      // Remove if already exists
      const filtered = prev.filter(j => j.id !== job.id)
      
      // Add to beginning with current timestamp
      const newJob: RecentJob = {
        ...job,
        viewedAt: Date.now()
      }
      
      const updated = [newJob, ...filtered].slice(0, MAX_RECENT_JOBS)
      
      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (error) {
        console.error('Error saving recently viewed jobs:', error)
      }
      
      return updated
    })
  }, [])

  // Clear all recently viewed
  const clearRecentJobs = useCallback(() => {
    setRecentJobs([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('Error clearing recently viewed jobs:', error)
    }
  }, [])

  // Remove specific job
  const removeRecentJob = useCallback((id: string) => {
    setRecentJobs(prev => {
      const updated = prev.filter(j => j.id !== id)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (error) {
        console.error('Error removing job from recently viewed:', error)
      }
      return updated
    })
  }, [])

  return {
    recentJobs,
    addRecentJob,
    clearRecentJobs,
    removeRecentJob
  }
}

