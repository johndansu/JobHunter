import api from './api'
import { ScrapedData, PaginatedResponse, ApiResponse, DataQueryParams } from '@/types'

export const dataService = {
  async getData(params?: DataQueryParams): Promise<PaginatedResponse<ScrapedData>> {
    const response = await api.get<PaginatedResponse<ScrapedData>>('/data', { params })
    return response.data
  },

  async getJobData(jobId: string, params?: {
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<ScrapedData>> {
    const response = await api.get<PaginatedResponse<ScrapedData>>(`/data/job/${jobId}`, { params })
    return response.data
  },

  async exportData(jobId: string, format: 'csv' | 'json' = 'csv'): Promise<Blob> {
    const response = await api.get(`/data/export/${jobId}?format=${format}`, {
      responseType: 'blob'
    })
    return response.data
  },

  async deleteData(id: string): Promise<void> {
    await api.delete(`/data/${id}`)
  },
}
