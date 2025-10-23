import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'searchHistory'
const MAX_HISTORY = 10

export interface SearchHistoryItem {
  id: string
  query: string
  location?: string
  timestamp: number
}

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setHistory(parsed)
      }
    } catch (error) {
      console.error('Error loading search history:', error)
    }
  }, [])

  // Add search to history
  const addSearch = useCallback((query: string, location?: string) => {
    if (!query.trim()) return

    setHistory(prev => {
      // Create search signature
      const signature = `${query.toLowerCase()}-${(location || '').toLowerCase()}`
      
      // Remove duplicates
      const filtered = prev.filter(item => {
        const itemSig = `${item.query.toLowerCase()}-${(item.location || '').toLowerCase()}`
        return itemSig !== signature
      })
      
      // Add new search at beginning
      const newSearch: SearchHistoryItem = {
        id: Date.now().toString(),
        query,
        location,
        timestamp: Date.now()
      }
      
      const updated = [newSearch, ...filtered].slice(0, MAX_HISTORY)
      
      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (error) {
        console.error('Error saving search history:', error)
      }
      
      return updated
    })
  }, [])

  // Remove search from history
  const removeSearch = useCallback((id: string) => {
    setHistory(prev => {
      const updated = prev.filter(item => item.id !== id)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (error) {
        console.error('Error removing search:', error)
      }
      return updated
    })
  }, [])

  // Clear all history
  const clearHistory = useCallback(() => {
    setHistory([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('Error clearing search history:', error)
    }
  }, [])

  return {
    history,
    addSearch,
    removeSearch,
    clearHistory
  }
}

