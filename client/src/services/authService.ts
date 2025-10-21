import api from './api'
import { User, LoginRequest, RegisterRequest, ApiResponse } from '@/types'

export const authService = {
  async login(credentials: LoginRequest): Promise<{ user: User; token: string }> {
    const response = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/login', credentials)
    return response.data.data!
  },

  async register(userData: RegisterRequest): Promise<{ user: User; token: string }> {
    const response = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/register', userData)
    return response.data.data!
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get<ApiResponse<{ user: User }>>('/auth/me')
    return response.data.data!.user
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout')
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await api.put<ApiResponse<{ user: User }>>('/users/profile', data)
    return response.data.data!.user
  },

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
    await api.put('/users/password', data)
  },

  async updatePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
    await api.put('/users/password', data)
  },

  async getUserStats(): Promise<any> {
    const response = await api.get<ApiResponse<any>>('/users/stats')
    return response.data.data!
  },
}
