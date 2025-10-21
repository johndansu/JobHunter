import { api } from './api'

export const locationService = {
  async searchLocations(query: string) {
    const response = await api.get('/locations', {
      params: { query }
    })
    return response.data.data
  },
  
  async getPopularLocations() {
    const response = await api.get('/locations/popular')
    return response.data.data
  }
}

