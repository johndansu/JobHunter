import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticateToken } from '../middleware/auth'
import { analyticsService } from '../services/analyticsService'

const router = Router()

// Apply authentication to all analytics routes
router.use(authenticateToken)

// Analytics query validation
const analyticsQuerySchema = z.object({
  timeRange: z.enum(['24h', '7d', '30d', '90d']).default('7d'),
  userId: z.string().optional()
})

/**
 * Get dashboard analytics
 * GET /api/analytics/dashboard?timeRange=7d
 */
router.get('/dashboard', async (req: Request, res: Response): Promise<void> => {
  try {
    const query = analyticsQuerySchema.parse(req.query)
    
    const analytics = await analyticsService.getDashboardAnalytics(query.timeRange)
    
    res.json({
      success: true,
      data: analytics,
      meta: {
        timeRange: query.timeRange,
        generated_at: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Dashboard analytics error:', error)
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid query parameters', details: error.errors })
    }
    res.status(500).json({ error: 'Failed to get dashboard analytics' })
  }
})

/**
 * Get user usage statistics
 * GET /api/analytics/usage
 */
router.get('/usage', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id
    
    const usageStats = await analyticsService.getUserUsageStats(userId)
    
    res.json({
      success: true,
      data: usageStats,
      meta: {
        generated_at: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Usage analytics error:', error)
    res.status(500).json({ error: 'Failed to get usage statistics' })
  }
})

/**
 * Get system-wide metrics (admin only)
 * GET /api/analytics/system
 */
router.get('/system', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!
    
    // Check if user is admin
    if (user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Access denied. Admin privileges required.' })
    }
    
    const systemMetrics = await analyticsService.getSystemMetrics()
    
    res.json({
      success: true,
      data: systemMetrics,
      meta: {
        generated_at: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('System analytics error:', error)
    res.status(500).json({ error: 'Failed to get system metrics' })
  }
})

/**
 * Track a request for analytics
 * POST /api/analytics/track
 */
router.post('/track', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id
    const { jobId, url, duration, success } = req.body
    
    if (!jobId || !url || typeof duration !== 'number' || typeof success !== 'boolean') {
      res.status(400).json({ error: 'Invalid tracking data' })
    }
    
    await analyticsService.trackRequest(userId, jobId, url, duration, success)
    
    res.json({
      success: true,
      message: 'Request tracked successfully'
    })
  } catch (error) {
    console.error('Request tracking error:', error)
    res.status(500).json({ error: 'Failed to track request' })
  }
})

/**
 * Get analytics summary for a specific time range
 * GET /api/analytics/summary?timeRange=30d
 */
router.get('/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const query = analyticsQuerySchema.parse(req.query)
    const userId = req.user!.id
    
    // Get both dashboard analytics and user usage stats
    const [dashboardAnalytics, userUsage] = await Promise.all([
      analyticsService.getDashboardAnalytics(query.timeRange),
      analyticsService.getUserUsageStats(userId)
    ])
    
    // Create a summary
    const summary = {
      overview: {
        totalRequests: dashboardAnalytics.totalRequests,
        successRate: dashboardAnalytics.successRate,
        avgResponseTime: dashboardAnalytics.avgResponseTime,
        activeJobs: dashboardAnalytics.activeJobs,
        totalDataPoints: dashboardAnalytics.totalDataPoints,
        costThisMonth: dashboardAnalytics.costThisMonth
      },
      usage: {
        requestsThisMonth: userUsage.requestsThisMonth,
        dataPointsThisMonth: userUsage.dataPointsThisMonth,
        jobsCreated: userUsage.jobsCreated,
        lastActive: userUsage.lastActive,
        planLimits: userUsage.planLimits,
        usagePercentages: userUsage.usagePercentages
      },
      performance: {
        errorRate: dashboardAnalytics.errorRate,
        dataVolume: dashboardAnalytics.dataVolume,
        topUrls: dashboardAnalytics.topUrls.slice(0, 5)
      }
    }
    
    res.json({
      success: true,
      data: summary,
      meta: {
        timeRange: query.timeRange,
        generated_at: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Analytics summary error:', error)
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid query parameters', details: error.errors })
    }
    res.status(500).json({ error: 'Failed to get analytics summary' })
  }
})

export default router
