import api from './api'
import { Job, CreateJobRequest, UpdateJobRequest, PaginatedResponse, ApiResponse, JobExecution } from '@/types'

export const jobService = {
  async getJobs(params?: {
    page?: number
    limit?: number
    status?: string
    search?: string
  }): Promise<PaginatedResponse<Job>> {
    const response = await api.get<PaginatedResponse<Job>>('/jobs', { params })
    return response.data
  },

  async getJob(id: string): Promise<Job> {
    const response = await api.get<ApiResponse<Job>>(`/jobs/${id}`)
    return response.data.data!
  },

  async createJob(data: CreateJobRequest): Promise<Job> {
    const response = await api.post<ApiResponse<Job>>('/jobs', data)
    return response.data.data!
  },

  async updateJob(id: string, data: UpdateJobRequest): Promise<Job> {
    const response = await api.put<ApiResponse<Job>>(`/jobs/${id}`, data)
    return response.data.data!
  },

  async deleteJob(id: string): Promise<void> {
    await api.delete(`/jobs/${id}`)
  },

  async startJob(id: string): Promise<any> {
    const response = await api.post<ApiResponse<any>>(`/jobs/${id}/start`)
    return response.data.data!
  },

  async stopJob(id: string): Promise<void> {
    await api.post(`/jobs/${id}/stop`)
  },

  async getJobExecutions(id: string): Promise<JobExecution[]> {
    const response = await api.get<ApiResponse<JobExecution[]>>(`/jobs/${id}/executions`)
    return response.data.data || []
  },
}
