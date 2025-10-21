import { api } from './api'

export const searchService = {
  /**
   * Search jobs directly from APIs (public, no auth required)
   */
  async searchJobs(query: string = '', location: string = '') {
    const response = await api.get('/search/jobs', {
      params: { query, location }
    })
    return response.data
  }
}

