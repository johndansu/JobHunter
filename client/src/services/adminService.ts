import api from './api'

export interface PlatformAnalytics {
  overview: {
    totalApiCalls: number
    successfulApiCalls: number
    successRate: number
    avgResponseTime: number
    totalUsers: number
    activeUsers: number
    newUsers: number
    totalSearches: number
  }
  apiUsage: {
    byProvider: Array<{
      provider: string
      calls: number
      avgResponseTime: number
    }>
    errorRate: number
  }
  userActivity: {
    topKeywords: Array<{ keyword: string; count: number }>
    topLocations: Array<{ location: string; count: number }>
    peakUsageTimes: Array<{ hour: number; count: number }>
  }
  timeRange: string
  generatedAt: string
}

export interface ApiUsageStats {
  summary: {
    totalCalls: number
    providers: Array<{
      name: string
      calls: number
      avgResponseTime: number
      estimatedCost: number
    }>
  }
  timeline: Array<Record<string, any>>
  recentFailures: Array<{
    provider: string
    endpoint: string
    errorMessage: string
    createdAt: string
  }>
  totalEstimatedCost: number
  timeRange: string
}

export interface UserActivityStats {
  dailyActiveUsers: Array<{ date: string; activeUsers: number }>
  activityBreakdown: Array<{ action: string; count: number }>
  topUsers: Array<{
    userId: string
    username: string
    email: string
    role: string
    activityCount: number
  }>
  totalLogins: number
  timeRange: string
}

export interface SystemHealth {
  errors: {
    last24h: number
    byType: Array<{ errorType: string; severity: string; _count: { id: number } }>
    unresolved: number
  }
  security: {
    unresolvedEvents: number
  }
  database: {
    status: string
    responseTime: number | null
    connected: boolean
  }
  status: 'healthy' | 'warning' | 'critical'
  checkedAt: string
}

export interface ErrorLog {
  id: string
  errorType: string
  errorCode: string | null
  message: string
  stack: string | null
  userId: string | null
  endpoint: string | null
  method: string | null
  severity: string
  resolved: boolean
  resolvedAt: string | null
  resolvedBy: string | null
  createdAt: string
}

export interface SecurityEvent {
  id: string
  eventType: string
  userId: string | null
  ipAddress: string
  userAgent: string | null
  details: string | null
  severity: string
  resolved: boolean
  resolvedAt: string | null
  resolvedBy: string | null
  createdAt: string
}

export interface IpRule {
  id: string
  ipAddress: string
  type: string
  reason: string | null
  createdBy: string
  expiresAt: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Announcement {
  id: string
  title: string
  content: string
  type: string
  priority: string
  targetRole: string | null
  isActive: boolean
  startDate: string
  endDate: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface FeatureFlag {
  id: string
  name: string
  description: string | null
  isEnabled: boolean
  rolloutPercent: number
  metadata: string | null
  createdAt: string
  updatedAt: string
}

export interface AuditLog {
  id: string
  adminId: string
  action: string
  targetType: string
  targetId: string | null
  changes: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  admin: {
    id: string
    username: string
    email: string
  }
}

export const adminService = {
  // Platform Analytics
  async getDashboardAnalytics(timeRange: '24h' | '7d' | '30d' | '90d' = '7d'): Promise<PlatformAnalytics> {
    const response = await api.get(`/admin/analytics/dashboard?timeRange=${timeRange}`)
    return response.data.data
  },

  async getApiUsageStats(timeRange: '24h' | '7d' | '30d' | '90d' = '30d'): Promise<ApiUsageStats> {
    const response = await api.get(`/admin/analytics/api-usage?timeRange=${timeRange}`)
    return response.data.data
  },

  async getUserActivityStats(timeRange: '24h' | '7d' | '30d' | '90d' = '7d'): Promise<UserActivityStats> {
    const response = await api.get(`/admin/analytics/user-activity?timeRange=${timeRange}`)
    return response.data.data
  },

  // System Health
  async getSystemHealth(): Promise<SystemHealth> {
    const response = await api.get('/admin/system/health')
    return response.data.data
  },

  // Error Management
  async getErrors(params: {
    page?: number
    limit?: number
    severity?: string
    resolved?: boolean
  } = {}): Promise<{ data: ErrorLog[]; pagination: any }> {
    const response = await api.get('/admin/errors', { params })
    return response.data
  },

  async resolveError(errorId: string): Promise<ErrorLog> {
    const response = await api.patch(`/admin/errors/${errorId}/resolve`)
    return response.data.data
  },

  // Security
  async getSecurityEvents(params: {
    page?: number
    limit?: number
    eventType?: string
    resolved?: boolean
  } = {}): Promise<{ data: SecurityEvent[]; pagination: any }> {
    const response = await api.get('/admin/security/events', { params })
    return response.data
  },

  async resolveSecurityEvent(eventId: string): Promise<SecurityEvent> {
    const response = await api.patch(`/admin/security/events/${eventId}/resolve`)
    return response.data.data
  },

  // IP Rules
  async getIpRules(type?: string): Promise<IpRule[]> {
    const params = type ? { type } : {}
    const response = await api.get('/admin/security/ip-rules', { params })
    return response.data.data
  },

  async createIpRule(data: {
    ipAddress: string
    type: 'block' | 'whitelist'
    reason?: string
    expiresAt?: string
  }): Promise<IpRule> {
    const response = await api.post('/admin/security/ip-rules', data)
    return response.data.data
  },

  async deleteIpRule(ruleId: string): Promise<void> {
    await api.delete(`/admin/security/ip-rules/${ruleId}`)
  },

  // Announcements
  async getAnnouncements(): Promise<Announcement[]> {
    const response = await api.get('/admin/announcements')
    return response.data.data
  },

  async createAnnouncement(data: {
    title: string
    content: string
    type?: 'info' | 'warning' | 'maintenance' | 'feature'
    priority?: 'low' | 'normal' | 'high' | 'critical'
    targetRole?: 'USER' | 'ADMIN'
    startDate?: string
    endDate?: string
  }): Promise<Announcement> {
    const response = await api.post('/admin/announcements', data)
    return response.data.data
  },

  async updateAnnouncement(announcementId: string, data: Partial<Announcement>): Promise<Announcement> {
    const response = await api.patch(`/admin/announcements/${announcementId}`, data)
    return response.data.data
  },

  async deleteAnnouncement(announcementId: string): Promise<void> {
    await api.delete(`/admin/announcements/${announcementId}`)
  },

  // Feature Flags
  async getFeatureFlags(): Promise<FeatureFlag[]> {
    const response = await api.get('/admin/feature-flags')
    return response.data.data
  },

  async createFeatureFlag(data: {
    name: string
    description?: string
    isEnabled?: boolean
    rolloutPercent?: number
    metadata?: string
  }): Promise<FeatureFlag> {
    const response = await api.post('/admin/feature-flags', data)
    return response.data.data
  },

  async updateFeatureFlag(flagId: string, data: Partial<FeatureFlag>): Promise<FeatureFlag> {
    const response = await api.patch(`/admin/feature-flags/${flagId}`, data)
    return response.data.data
  },

  async deleteFeatureFlag(flagId: string): Promise<void> {
    await api.delete(`/admin/feature-flags/${flagId}`)
  },

  // Audit Logs
  async getAuditLogs(params: {
    page?: number
    limit?: number
    action?: string
    adminId?: string
  } = {}): Promise<{ data: AuditLog[]; pagination: any }> {
    const response = await api.get('/admin/audit-logs', { params })
    return response.data
  },

  // System Config
  async getSystemConfig(): Promise<any[]> {
    const response = await api.get('/admin/config')
    return response.data.data
  },

  async updateSystemConfig(key: string, value: string, description?: string): Promise<any> {
    const response = await api.put(`/admin/config/${key}`, { value, description })
    return response.data.data
  }
}

