import { prisma } from '../utils/database'

export class PlatformAnalyticsService {
  /**
   * Get comprehensive dashboard analytics for admin
   */
  async getDashboardAnalytics(timeRange: '24h' | '7d' | '30d' | '90d' = '7d') {
    const now = new Date()
    const startDate = this.getStartDate(timeRange)

    const [
      totalApiCalls,
      successfulApiCalls,
      totalUsers,
      activeUsers,
      newUsers,
      totalSearches,
      topSearchKeywords,
      topLocations,
      apiCallsByProvider,
      apiResponseTimes,
      errorRate,
      peakUsageTimes
    ] = await Promise.all([
      // Total API calls
      prisma.apiLog.count({
        where: { createdAt: { gte: startDate } }
      }),
      // Successful API calls
      prisma.apiLog.count({
        where: { 
          createdAt: { gte: startDate },
          success: true
        }
      }),
      // Total users
      prisma.user.count(),
      // Active users (logged in during period)
      prisma.user.count({
        where: {
          lastActiveAt: { gte: startDate }
        }
      }),
      // New users
      prisma.user.count({
        where: {
          createdAt: { gte: startDate }
        }
      }),
      // Total searches
      prisma.activityLog.count({
        where: {
          action: 'search',
          createdAt: { gte: startDate }
        }
      }),
      // Top search keywords
      this.getTopSearchKeywords(startDate, 10),
      // Top locations
      this.getTopLocations(startDate, 10),
      // API calls by provider
      prisma.apiLog.groupBy({
        by: ['provider'],
        where: { createdAt: { gte: startDate } },
        _count: { id: true },
        _avg: { responseTime: true }
      }),
      // Average response times
      prisma.apiLog.aggregate({
        where: { 
          createdAt: { gte: startDate },
          success: true
        },
        _avg: { responseTime: true }
      }),
      // Error rate
      this.getErrorRate(startDate),
      // Peak usage times
      this.getPeakUsageTimes(startDate)
    ])

    const successRate = totalApiCalls > 0 
      ? (successfulApiCalls / totalApiCalls) * 100 
      : 0

    return {
      overview: {
        totalApiCalls,
        successfulApiCalls,
        successRate: Math.round(successRate * 100) / 100,
        avgResponseTime: Math.round(apiResponseTimes._avg.responseTime || 0),
        totalUsers,
        activeUsers,
        newUsers,
        totalSearches
      },
      apiUsage: {
        byProvider: apiCallsByProvider.map(p => ({
          provider: p.provider,
          calls: p._count.id,
          avgResponseTime: Math.round(p._avg.responseTime || 0)
        })),
        errorRate: Math.round(errorRate * 100) / 100
      },
      userActivity: {
        topKeywords: topSearchKeywords,
        topLocations: topLocations,
        peakUsageTimes
      },
      timeRange,
      generatedAt: now.toISOString()
    }
  }

  /**
   * Get API usage statistics
   */
  async getApiUsageStats(timeRange: '24h' | '7d' | '30d' | '90d' = '30d') {
    const startDate = this.getStartDate(timeRange)

    const [
      callsByProvider,
      callsByDay,
      failedCalls,
      costEstimation
    ] = await Promise.all([
      // Calls by provider
      prisma.apiLog.groupBy({
        by: ['provider'],
        where: { createdAt: { gte: startDate } },
        _count: { id: true },
        _avg: { responseTime: true }
      }),
      // Calls by day
      this.getCallsByDay(startDate),
      // Failed calls with details
      prisma.apiLog.findMany({
        where: {
          createdAt: { gte: startDate },
          success: false
        },
        select: {
          provider: true,
          endpoint: true,
          errorMessage: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      // Cost estimation (based on typical pricing)
      this.estimateApiCosts(startDate)
    ])

    return {
      summary: {
        totalCalls: callsByProvider.reduce((sum, p) => sum + p._count.id, 0),
        providers: callsByProvider.map(p => ({
          name: p.provider,
          calls: p._count.id,
          avgResponseTime: Math.round(p._avg.responseTime || 0),
          estimatedCost: costEstimation[p.provider] || 0
        }))
      },
      timeline: callsByDay,
      recentFailures: failedCalls,
      totalEstimatedCost: Object.values(costEstimation).reduce((sum, cost) => sum + cost, 0),
      timeRange
    }
  }

  /**
   * Get user activity patterns
   */
  async getUserActivityStats(timeRange: '24h' | '7d' | '30d' | '90d' = '7d') {
    const startDate = this.getStartDate(timeRange)

    const [
      dailyActiveUsers,
      activityByAction,
      topUsers,
      loginStats
    ] = await Promise.all([
      // Daily active users
      this.getDailyActiveUsers(startDate),
      // Activity by action type
      prisma.activityLog.groupBy({
        by: ['action'],
        where: { createdAt: { gte: startDate } },
        _count: { id: true }
      }),
      // Most active users
      prisma.activityLog.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: startDate } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      }),
      // Login statistics
      prisma.activityLog.count({
        where: {
          action: 'login',
          createdAt: { gte: startDate }
        }
      })
    ])

    // Get user details for top users
    const userIds = topUsers.map(u => u.userId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, email: true, role: true }
    })

    const topUsersWithDetails = topUsers.map(tu => {
      const user = users.find(u => u.id === tu.userId)
      return {
        userId: tu.userId,
        username: user?.username || 'Unknown',
        email: user?.email || '',
        role: user?.role || 'USER',
        activityCount: tu._count.id
      }
    })

    return {
      dailyActiveUsers,
      activityBreakdown: activityByAction.map(a => ({
        action: a.action,
        count: a._count.id
      })),
      topUsers: topUsersWithDetails,
      totalLogins: loginStats,
      timeRange
    }
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth() {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const [
      recentErrors,
      errorsByType,
      unresolvedErrors,
      securityEvents,
      dbHealth
    ] = await Promise.all([
      // Recent errors
      prisma.errorLog.count({
        where: { createdAt: { gte: last24h } }
      }),
      // Errors by type
      prisma.errorLog.groupBy({
        by: ['errorType', 'severity'],
        where: { createdAt: { gte: last24h } },
        _count: { id: true }
      }),
      // Unresolved errors
      prisma.errorLog.count({
        where: { resolved: false }
      }),
      // Security events
      prisma.securityEvent.count({
        where: { 
          createdAt: { gte: last24h },
          resolved: false
        }
      }),
      // Database health check
      this.checkDatabaseHealth()
    ])

    return {
      errors: {
        last24h: recentErrors,
        byType: errorsByType,
        unresolved: unresolvedErrors
      },
      security: {
        unresolvedEvents: securityEvents
      },
      database: dbHealth,
      status: this.determineSystemStatus(recentErrors, unresolvedErrors, securityEvents),
      checkedAt: new Date().toISOString()
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private getStartDate(timeRange: '24h' | '7d' | '30d' | '90d'): Date {
    const now = Date.now()
    const ranges = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    }
    return new Date(now - ranges[timeRange])
  }

  private async getTopSearchKeywords(startDate: Date, limit: number) {
    const searches = await prisma.activityLog.findMany({
      where: {
        action: 'search',
        createdAt: { gte: startDate }
      },
      select: { metadata: true }
    })

    const keywordCounts: Record<string, number> = {}
    searches.forEach(search => {
      try {
        const metadata = JSON.parse(search.metadata || '{}')
        const query = metadata.query || metadata.keyword
        if (query) {
          keywordCounts[query] = (keywordCounts[query] || 0) + 1
        }
      } catch (e) {
        // Skip invalid JSON
      }
    })

    return Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([keyword, count]) => ({ keyword, count }))
  }

  private async getTopLocations(startDate: Date, limit: number) {
    const searches = await prisma.activityLog.findMany({
      where: {
        action: 'search',
        createdAt: { gte: startDate }
      },
      select: { metadata: true }
    })

    const locationCounts: Record<string, number> = {}
    searches.forEach(search => {
      try {
        const metadata = JSON.parse(search.metadata || '{}')
        const location = metadata.location
        if (location) {
          locationCounts[location] = (locationCounts[location] || 0) + 1
        }
      } catch (e) {
        // Skip invalid JSON
      }
    })

    return Object.entries(locationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([location, count]) => ({ location, count }))
  }

  private async getErrorRate(startDate: Date): Promise<number> {
    const [total, failed] = await Promise.all([
      prisma.apiLog.count({ where: { createdAt: { gte: startDate } } }),
      prisma.apiLog.count({ 
        where: { 
          createdAt: { gte: startDate },
          success: false
        }
      })
    ])
    return total > 0 ? (failed / total) * 100 : 0
  }

  private async getPeakUsageTimes(startDate: Date) {
    const logs = await prisma.activityLog.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true }
    })

    const hourCounts: Record<number, number> = {}
    logs.forEach(log => {
      const hour = log.createdAt.getHours()
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    })

    return Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
  }

  private async getCallsByDay(startDate: Date) {
    const logs = await prisma.apiLog.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true, provider: true }
    })

    const dayCounts: Record<string, Record<string, number>> = {}
    logs.forEach(log => {
      const day = log.createdAt.toISOString().split('T')[0]
      if (!dayCounts[day]) dayCounts[day] = {}
      dayCounts[day][log.provider] = (dayCounts[day][log.provider] || 0) + 1
    })

    return Object.entries(dayCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, providers]) => ({ date, ...providers }))
  }

  private async estimateApiCosts(startDate: Date): Promise<Record<string, number>> {
    const calls = await prisma.apiLog.groupBy({
      by: ['provider'],
      where: { createdAt: { gte: startDate } },
      _count: { id: true }
    })

    // Typical API pricing (adjust based on actual rates)
    const pricing: Record<string, number> = {
      'jsearch': 0.001,     // $0.001 per call
      'jooble': 0.0005,     // $0.0005 per call
      'african_jobs': 0.0  // Free tier
    }

    const costs: Record<string, number> = {}
    calls.forEach(c => {
      costs[c.provider] = (c._count.id * (pricing[c.provider] || 0))
    })

    return costs
  }

  private async getDailyActiveUsers(startDate: Date) {
    const logs = await prisma.activityLog.findMany({
      where: { createdAt: { gte: startDate } },
      select: { userId: true, createdAt: true }
    })

    const dailyUsers: Record<string, Set<string>> = {}
    logs.forEach(log => {
      const day = log.createdAt.toISOString().split('T')[0]
      if (!dailyUsers[day]) dailyUsers[day] = new Set()
      dailyUsers[day].add(log.userId)
    })

    return Object.entries(dailyUsers)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, users]) => ({ date, activeUsers: users.size }))
  }

  private async checkDatabaseHealth() {
    try {
      const start = Date.now()
      await prisma.$queryRaw`SELECT 1`
      const responseTime = Date.now() - start

      return {
        status: 'healthy',
        responseTime,
        connected: true
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: null,
        connected: false,
        error: (error as Error).message
      }
    }
  }

  private determineSystemStatus(
    recentErrors: number, 
    unresolvedErrors: number, 
    securityEvents: number
  ): 'healthy' | 'warning' | 'critical' {
    if (securityEvents > 10 || unresolvedErrors > 50) return 'critical'
    if (recentErrors > 100 || unresolvedErrors > 20) return 'warning'
    return 'healthy'
  }
}

export const platformAnalyticsService = new PlatformAnalyticsService()

