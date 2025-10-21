import { prisma } from '../utils/database'

interface AnalyticsData {
  totalRequests: number
  successRate: number
  avgResponseTime: number
  activeJobs: number
  totalDataPoints: number
  costThisMonth: number
  requestsByDay: Array<{ date: string; count: number }>
  requestsByHour: Array<{ hour: number; count: number }>
  topUrls: Array<{ url: string; count: number }>
  errorRate: number
  dataVolume: number
  userActivity: Array<{ date: string; activeUsers: number }>
}

interface UsageStats {
  userId: string
  requestsThisMonth: number
  dataPointsThisMonth: number
  jobsCreated: number
  lastActive: Date
  planLimits: {
    maxRequests: number
    maxConcurrentJobs: number
    maxDataPoints: number
  }
  usagePercentages: {
    requests: number
    dataPoints: number
    concurrentJobs: number
  }
}

class AnalyticsService {
  private static instance: AnalyticsService

  private constructor() {}

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService()
    }
    return AnalyticsService.instance
  }

  /**
   * Get comprehensive analytics data for dashboard
   */
  async getDashboardAnalytics(timeRange: string = '7d'): Promise<AnalyticsData> {
    const now = new Date()
    let startDate: Date

    switch (timeRange) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    // Get total requests in time range
    const totalRequests = await prisma.jobExecution.count({
      where: {
        startedAt: {
          gte: startDate
        }
      }
    })

    // Get successful requests
    const successfulRequests = await prisma.jobExecution.count({
      where: {
        startedAt: {
          gte: startDate
        },
        status: 'COMPLETED'
      }
    })

    // Calculate success rate
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0

    // Get average response time
    const avgResponseTimeResult = await prisma.jobExecution.aggregate({
      where: {
        startedAt: {
          gte: startDate
        },
        status: 'COMPLETED'
      },
      _avg: {
        duration: true
      }
    })
    const avgResponseTime = avgResponseTimeResult._avg.duration || 0

    // Get active jobs
    const activeJobs = await prisma.job.count({
      where: {
        status: {
          in: ['RUNNING', 'PENDING']
        }
      }
    })

    // Get total data points
    const totalDataPoints = await prisma.scrapedData.count({
      where: {
        scrapedAt: {
          gte: startDate
        }
      }
    })

    // Calculate cost (mock calculation - $0.001 per request)
    const costThisMonth = totalRequests * 0.001

    // Get requests by day
    const requestsByDay = await this.getRequestsByDay(startDate)

    // Get requests by hour
    const requestsByHour = await this.getRequestsByHour(startDate)

    // Get top URLs
    const topUrls = await this.getTopUrls(startDate)

    // Calculate error rate
    const errorRate = totalRequests > 0 ? ((totalRequests - successfulRequests) / totalRequests) * 100 : 0

    // Get data volume (in MB)
    const dataVolume = await this.getDataVolume(startDate)

    // Get user activity
    const userActivity = await this.getUserActivity(startDate)

    return {
      totalRequests,
      successRate: Math.round(successRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      activeJobs,
      totalDataPoints,
      costThisMonth: Math.round(costThisMonth * 100) / 100,
      requestsByDay,
      requestsByHour,
      topUrls,
      errorRate: Math.round(errorRate * 100) / 100,
      dataVolume,
      userActivity
    }
  }

  /**
   * Get usage statistics for a specific user
   */
  async getUserUsageStats(userId: string): Promise<UsageStats> {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get user's requests this month
    const requestsThisMonth = await prisma.jobExecution.count({
      where: {
        job: {
          userId
        },
        startedAt: {
          gte: startOfMonth
        }
      }
    })

    // Get user's data points this month
    const dataPointsThisMonth = await prisma.scrapedData.count({
      where: {
        job: {
          userId
        },
        scrapedAt: {
          gte: startOfMonth
        }
      }
    })

    // Get total jobs created by user
    const jobsCreated = await prisma.job.count({
      where: { userId }
    })

    // Get last active date
    const lastActiveResult = await prisma.scrapedData.findFirst({
      where: { 
        job: {
          userId
        }
      },
      orderBy: { scrapedAt: 'desc' },
      select: { scrapedAt: true }
    })
    const lastActive = lastActiveResult?.scrapedAt || new Date()

    // Get active jobs count
    const activeJobsCount = await prisma.job.count({
      where: {
        userId,
        status: {
          in: ['RUNNING', 'PENDING']
        }
      }
    })

    // Define plan limits (mock data - in production this would come from user's subscription)
    const planLimits = {
      maxRequests: 100000, // 100K requests per month
      maxConcurrentJobs: 10,
      maxDataPoints: 1000000 // 1M data points per month
    }

    // Calculate usage percentages
    const usagePercentages = {
      requests: Math.min((requestsThisMonth / planLimits.maxRequests) * 100, 100),
      dataPoints: Math.min((dataPointsThisMonth / planLimits.maxDataPoints) * 100, 100),
      concurrentJobs: Math.min((activeJobsCount / planLimits.maxConcurrentJobs) * 100, 100)
    }

    return {
      userId,
      requestsThisMonth,
      dataPointsThisMonth,
      jobsCreated,
      lastActive,
      planLimits,
      usagePercentages: {
        requests: Math.round(usagePercentages.requests * 100) / 100,
        dataPoints: Math.round(usagePercentages.dataPoints * 100) / 100,
        concurrentJobs: Math.round(usagePercentages.concurrentJobs * 100) / 100
      }
    }
  }

  /**
   * Get requests by day for charts
   */
  private async getRequestsByDay(startDate: Date): Promise<Array<{ date: string; count: number }>> {
    // This is a simplified implementation
    // In production, you'd use proper date grouping
    const requests = await prisma.jobExecution.findMany({
      where: {
        startedAt: {
          gte: startDate
        }
      },
      select: {
        startedAt: true
      },
      orderBy: {
        startedAt: 'asc'
      }
    })

    // Group by date
    const grouped = requests.reduce((acc, request) => {
      const date = request.startedAt.toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(grouped).map(([date, count]) => ({
      date,
      count
    }))
  }

  /**
   * Get requests by hour for charts
   */
  private async getRequestsByHour(startDate: Date): Promise<Array<{ hour: number; count: number }>> {
    const requests = await prisma.jobExecution.findMany({
      where: {
        startedAt: {
          gte: startDate
        }
      },
      select: {
        startedAt: true
      }
    })

    // Group by hour
    const grouped = requests.reduce((acc, request) => {
      const hour = request.startedAt.getHours()
      acc[hour] = (acc[hour] || 0) + 1
      return acc
    }, {} as Record<number, number>)

    // Fill in missing hours with 0
    const result = []
    for (let hour = 0; hour < 24; hour++) {
      result.push({
        hour,
        count: grouped[hour] || 0
      })
    }

    return result
  }

  /**
   * Get top URLs being scraped
   */
  private async getTopUrls(startDate: Date): Promise<Array<{ url: string; count: number }>> {
    const jobs = await prisma.job.findMany({
      where: {
        executions: {
          some: {
            startedAt: {
              gte: startDate
            }
          }
        }
      },
      select: {
        url: true,
        executions: {
          where: {
            startedAt: {
              gte: startDate
            }
          }
        }
      }
    })

    // Group by URL and count executions
    const grouped = jobs.reduce((acc, job) => {
      acc[job.url] = (acc[job.url] || 0) + job.executions.length
      return acc
    }, {} as Record<string, number>)

    return Object.entries(grouped)
      .map(([url, count]) => ({ url, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // Top 10 URLs
  }

  /**
   * Get data volume in MB
   */
  private async getDataVolume(startDate: Date): Promise<number> {
    const data = await prisma.scrapedData.findMany({
      where: {
        scrapedAt: {
          gte: startDate
        }
      },
      select: {
        data: true
      }
    })

    // Calculate total size in bytes
    const totalBytes = data.reduce((total, item) => {
      return total + Buffer.byteLength(item.data, 'utf8')
    }, 0)

    // Convert to MB
    return Math.round((totalBytes / (1024 * 1024)) * 100) / 100
  }

  /**
   * Get user activity by day
   */
  private async getUserActivity(startDate: Date): Promise<Array<{ date: string; activeUsers: number }>> {
    // This is a simplified implementation
    // In production, you'd track user activity more precisely
    const activity = await prisma.scrapedData.findMany({
      where: {
        scrapedAt: {
          gte: startDate
        }
      },
      select: {
        scrapedAt: true,
        job: {
          select: {
            userId: true
          }
        }
      }
    })

    // Group by date and count unique users
    const grouped = activity.reduce((acc, item) => {
      const date = item.scrapedAt.toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = new Set()
      }
      acc[date].add(item.job.userId)
      return acc
    }, {} as Record<string, Set<string>>)

    return Object.entries(grouped).map(([date, users]) => ({
      date,
      activeUsers: users.size
    }))
  }

  /**
   * Track a request for analytics
   */
  async trackRequest(userId: string, jobId: string, url: string, duration: number, success: boolean) {
    // In a production system, you might want to store this in a separate analytics table
    // For now, we'll use the existing jobExecution table
    console.log(`Analytics: Request tracked - User: ${userId}, Job: ${jobId}, Duration: ${duration}ms, Success: ${success}`)
  }

  /**
   * Get system-wide metrics
   */
  async getSystemMetrics(): Promise<{
    totalUsers: number
    totalJobs: number
    totalRequests: number
    totalDataPoints: number
    systemUptime: number
    activeConnections: number
  }> {
    const [totalUsers, totalJobs, totalRequests, totalDataPoints] = await Promise.all([
      prisma.user.count(),
      prisma.job.count(),
      prisma.jobExecution.count(),
      prisma.scrapedData.count()
    ])

    return {
      totalUsers,
      totalJobs,
      totalRequests,
      totalDataPoints,
      systemUptime: process.uptime(),
      activeConnections: 0 // This would come from WebSocket connections
    }
  }
}

export const analyticsService = AnalyticsService.getInstance()
