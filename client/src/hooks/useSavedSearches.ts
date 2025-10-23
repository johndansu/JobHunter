import { useState, useEffect, useCallback } from 'react'
import { JobFiltersState } from '@/components/JobFilters'

const STORAGE_KEY = 'savedSearches'

export interface SavedSearch {
  id: string
  name: string
  query: string
  location?: string
  filters: JobFiltersState
  createdAt: number
  alertEnabled: boolean
  lastChecked?: number
}

export function useSavedSearches() {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setSavedSearches(parsed)
      }
    } catch (error) {
      console.error('Error loading saved searches:', error)
    }
  }, [])

  // Save search
  const saveSearch = useCallback((
    name: string,
    query: string,
    location: string | undefined,
    filters: JobFiltersState,
    alertEnabled: boolean = false
  ) => {
    setSavedSearches(prev => {
      const newSearch: SavedSearch = {
        id: Date.now().toString(),
        name,
        query,
        location,
        filters,
        createdAt: Date.now(),
        alertEnabled
      }
      
      const updated = [newSearch, ...prev]
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (error) {
        console.error('Error saving search:', error)
      }
      
      return updated
    })
  }, [])

  // Update search
  const updateSearch = useCallback((id: string, updates: Partial<SavedSearch>) => {
    setSavedSearches(prev => {
      const updated = prev.map(search =>
        search.id === id ? { ...search, ...updates } : search
      )
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (error) {
        console.error('Error updating search:', error)
      }
      
      return updated
    })
  }, [])

  // Delete search
  const deleteSearch = useCallback((id: string) => {
    setSavedSearches(prev => {
      const updated = prev.filter(search => search.id !== id)
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (error) {
        console.error('Error deleting search:', error)
      }
      
      return updated
    })
  }, [])

  // Toggle alert
  const toggleAlert = useCallback((id: string) => {
    setSavedSearches(prev => {
      const updated = prev.map(search =>
        search.id === id ? { ...search, alertEnabled: !search.alertEnabled } : search
      )
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (error) {
        console.error('Error toggling alert:', error)
      }
      
      return updated
    })
  }, [])

  return {
    savedSearches,
    saveSearch,
    updateSearch,
    deleteSearch,
    toggleAlert,
    count: savedSearches.length,
    alertsEnabled: savedSearches.filter(s => s.alertEnabled).length
  }
}

