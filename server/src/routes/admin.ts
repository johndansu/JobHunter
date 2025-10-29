import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticateToken, requireAdmin } from '../middleware/auth'
import { platformAnalyticsService } from '../services/platformAnalyticsService'
import { prisma } from '../utils/database'

const router = Router()

// Apply authentication and admin check to all routes
router.use(authenticateToken)
router.use(requireAdmin)

// ============================================
// PLATFORM ANALYTICS ENDPOINTS
// ============================================

/**
 * GET /api/admin/analytics/dashboard
 * Get comprehensive dashboard analytics
 */
router.get('/analytics/dashboard', async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as '24h' | '7d' | '30d' | '90d') || '7d'
    const analytics = await platformAnalyticsService.getDashboardAnalytics(timeRange)
    
    res.json({
      success: true,
      data: analytics
    })
  } catch (error) {
    console.error('Dashboard analytics error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch dashboard analytics' 
    })
  }
})

/**
 * GET /api/admin/analytics/api-usage
 * Get API usage statistics
 */
router.get('/analytics/api-usage', async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as '24h' | '7d' | '30d' | '90d') || '30d'
    const stats = await platformAnalyticsService.getApiUsageStats(timeRange)
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('API usage stats error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch API usage statistics' 
    })
  }
})

/**
 * GET /api/admin/analytics/user-activity
 * Get user activity patterns
 */
router.get('/analytics/user-activity', async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as '24h' | '7d' | '30d' | '90d') || '7d'
    const stats = await platformAnalyticsService.getUserActivityStats(timeRange)
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('User activity stats error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch user activity statistics' 
    })
  }
})

/**
 * GET /api/admin/system/health
 * Get system health metrics
 */
router.get('/system/health', async (req: Request, res: Response) => {
  try {
    const health = await platformAnalyticsService.getSystemHealth()
    
    res.json({
      success: true,
      data: health
    })
  } catch (error) {
    console.error('System health error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch system health' 
    })
  }
})

// ============================================
// ERROR LOG MANAGEMENT
// ============================================

/**
 * GET /api/admin/errors
 * Get error logs with filtering
 */
router.get('/errors', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 50
    const severity = req.query.severity as string
    const resolved = req.query.resolved === 'true' ? true : req.query.resolved === 'false' ? false : undefined
    
    const where: any = {}
    if (severity) where.severity = severity
    if (resolved !== undefined) where.resolved = resolved

    const [errors, total] = await Promise.all([
      prisma.errorLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit
      }),
      prisma.errorLog.count({ where })
    ])

    res.json({
      success: true,
      data: errors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get errors error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch error logs' 
    })
  }
})

/**
 * PATCH /api/admin/errors/:id/resolve
 * Mark error as resolved
 */
router.patch('/errors/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    const error = await prisma.errorLog.update({
      where: { id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: req.user!.id
      }
    })

    // Log admin action
    await prisma.auditLog.create({
      data: {
        adminId: req.user!.id,
        action: 'resolve_error',
        targetType: 'error',
        targetId: id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    })

    res.json({
      success: true,
      data: error
    })
  } catch (error) {
    console.error('Resolve error error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to resolve error' 
    })
  }
})

// ============================================
// SECURITY EVENT MANAGEMENT
// ============================================

/**
 * GET /api/admin/security/events
 * Get security events
 */
router.get('/security/events', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 50
    const eventType = req.query.eventType as string
    const resolved = req.query.resolved === 'true' ? true : req.query.resolved === 'false' ? false : undefined

    const where: any = {}
    if (eventType) where.eventType = eventType
    if (resolved !== undefined) where.resolved = resolved

    const [events, total] = await Promise.all([
      prisma.securityEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit
      }),
      prisma.securityEvent.count({ where })
    ])

    res.json({
      success: true,
      data: events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get security events error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch security events' 
    })
  }
})

/**
 * PATCH /api/admin/security/events/:id/resolve
 * Resolve security event
 */
router.patch('/security/events/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    const event = await prisma.securityEvent.update({
      where: { id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: req.user!.id
      }
    })

    await prisma.auditLog.create({
      data: {
        adminId: req.user!.id,
        action: 'resolve_security_event',
        targetType: 'security_event',
        targetId: id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    })

    res.json({
      success: true,
      data: event
    })
  } catch (error) {
    console.error('Resolve security event error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to resolve security event' 
    })
  }
})

// ============================================
// IP MANAGEMENT
// ============================================

/**
 * GET /api/admin/security/ip-rules
 * Get IP rules (blocklist/whitelist)
 */
router.get('/security/ip-rules', async (req: Request, res: Response) => {
  try {
    const type = req.query.type as string
    const where: any = {}
    if (type) where.type = type

    const rules = await prisma.ipRule.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    res.json({
      success: true,
      data: rules
    })
  } catch (error) {
    console.error('Get IP rules error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch IP rules' 
    })
  }
})

/**
 * POST /api/admin/security/ip-rules
 * Create new IP rule
 */
const ipRuleSchema = z.object({
  ipAddress: z.string().min(1),
  type: z.enum(['block', 'whitelist']),
  reason: z.string().optional(),
  expiresAt: z.string().optional()
})

router.post('/security/ip-rules', async (req: Request, res: Response) => {
  try {
    const data = ipRuleSchema.parse(req.body)
    
    const rule = await prisma.ipRule.create({
      data: {
        ...data,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        createdBy: req.user!.id
      }
    })

    await prisma.auditLog.create({
      data: {
        adminId: req.user!.id,
        action: 'create_ip_rule',
        targetType: 'ip_rule',
        targetId: rule.id,
        changes: JSON.stringify({ created: data }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    })

    res.json({
      success: true,
      data: rule
    })
  } catch (error) {
    console.error('Create IP rule error:', error)
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        success: false,
        error: 'Invalid input',
        details: error.errors 
      })
      return
    }
    res.status(500).json({ 
      success: false,
      error: 'Failed to create IP rule' 
    })
  }
})

/**
 * DELETE /api/admin/security/ip-rules/:id
 * Delete IP rule
 */
router.delete('/security/ip-rules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    await prisma.ipRule.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        adminId: req.user!.id,
        action: 'delete_ip_rule',
        targetType: 'ip_rule',
        targetId: id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    })

    res.json({
      success: true,
      message: 'IP rule deleted'
    })
  } catch (error) {
    console.error('Delete IP rule error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete IP rule' 
    })
  }
})

// ============================================
// ANNOUNCEMENTS MANAGEMENT
// ============================================

/**
 * GET /api/admin/announcements
 * Get all announcements
 */
router.get('/announcements', async (req: Request, res: Response) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' }
    })

    res.json({
      success: true,
      data: announcements
    })
  } catch (error) {
    console.error('Get announcements error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch announcements' 
    })
  }
})

/**
 * POST /api/admin/announcements
 * Create announcement
 */
const announcementSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  type: z.enum(['info', 'warning', 'maintenance', 'feature']).default('info'),
  priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
  targetRole: z.enum(['USER', 'ADMIN']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
})

router.post('/announcements', async (req: Request, res: Response) => {
  try {
    const data = announcementSchema.parse(req.body)
    
    const announcement = await prisma.announcement.create({
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : null,
        createdBy: req.user!.id
      }
    })

    await prisma.auditLog.create({
      data: {
        adminId: req.user!.id,
        action: 'create_announcement',
        targetType: 'announcement',
        targetId: announcement.id,
        changes: JSON.stringify({ created: data }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    })

    res.json({
      success: true,
      data: announcement
    })
  } catch (error) {
    console.error('Create announcement error:', error)
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        success: false,
        error: 'Invalid input',
        details: error.errors 
      })
      return
    }
    res.status(500).json({ 
      success: false,
      error: 'Failed to create announcement' 
    })
  }
})

/**
 * PATCH /api/admin/announcements/:id
 * Update announcement
 */
router.patch('/announcements/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const data = announcementSchema.partial().parse(req.body)
    
    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined
      }
    })

    await prisma.auditLog.create({
      data: {
        adminId: req.user!.id,
        action: 'update_announcement',
        targetType: 'announcement',
        targetId: id,
        changes: JSON.stringify({ updated: data }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    })

    res.json({
      success: true,
      data: announcement
    })
  } catch (error) {
    console.error('Update announcement error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to update announcement' 
    })
  }
})

/**
 * DELETE /api/admin/announcements/:id
 * Delete announcement
 */
router.delete('/announcements/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    await prisma.announcement.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        adminId: req.user!.id,
        action: 'delete_announcement',
        targetType: 'announcement',
        targetId: id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    })

    res.json({
      success: true,
      message: 'Announcement deleted'
    })
  } catch (error) {
    console.error('Delete announcement error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete announcement' 
    })
  }
})

// ============================================
// FEATURE FLAGS MANAGEMENT
// ============================================

/**
 * GET /api/admin/feature-flags
 * Get all feature flags
 */
router.get('/feature-flags', async (req: Request, res: Response) => {
  try {
    const flags = await prisma.featureFlag.findMany({
      orderBy: { name: 'asc' }
    })

    res.json({
      success: true,
      data: flags
    })
  } catch (error) {
    console.error('Get feature flags error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch feature flags' 
    })
  }
})

/**
 * POST /api/admin/feature-flags
 * Create feature flag
 */
const featureFlagSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isEnabled: z.boolean().default(true),
  rolloutPercent: z.number().min(0).max(100).default(100),
  metadata: z.string().optional()
})

router.post('/feature-flags', async (req: Request, res: Response) => {
  try {
    const data = featureFlagSchema.parse(req.body)
    
    const flag = await prisma.featureFlag.create({ data })

    await prisma.auditLog.create({
      data: {
        adminId: req.user!.id,
        action: 'create_feature_flag',
        targetType: 'feature_flag',
        targetId: flag.id,
        changes: JSON.stringify({ created: data }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    })

    res.json({
      success: true,
      data: flag
    })
  } catch (error) {
    console.error('Create feature flag error:', error)
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        success: false,
        error: 'Invalid input',
        details: error.errors 
      })
      return
    }
    res.status(500).json({ 
      success: false,
      error: 'Failed to create feature flag' 
    })
  }
})

/**
 * PATCH /api/admin/feature-flags/:id
 * Update feature flag
 */
router.patch('/feature-flags/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const data = featureFlagSchema.partial().parse(req.body)
    
    const flag = await prisma.featureFlag.update({
      where: { id },
      data
    })

    await prisma.auditLog.create({
      data: {
        adminId: req.user!.id,
        action: 'update_feature_flag',
        targetType: 'feature_flag',
        targetId: id,
        changes: JSON.stringify({ updated: data }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    })

    res.json({
      success: true,
      data: flag
    })
  } catch (error) {
    console.error('Update feature flag error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to update feature flag' 
    })
  }
})

/**
 * DELETE /api/admin/feature-flags/:id
 * Delete feature flag
 */
router.delete('/feature-flags/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    await prisma.featureFlag.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        adminId: req.user!.id,
        action: 'delete_feature_flag',
        targetType: 'feature_flag',
        targetId: id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    })

    res.json({
      success: true,
      message: 'Feature flag deleted'
    })
  } catch (error) {
    console.error('Delete feature flag error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete feature flag' 
    })
  }
})

// ============================================
// AUDIT LOGS
// ============================================

/**
 * GET /api/admin/audit-logs
 * Get audit logs
 */
router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 50
    const action = req.query.action as string
    const adminId = req.query.adminId as string

    const where: any = {}
    if (action) where.action = action
    if (adminId) where.adminId = adminId

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          admin: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit
      }),
      prisma.auditLog.count({ where })
    ])

    res.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get audit logs error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch audit logs' 
    })
  }
})

// ============================================
// SYSTEM CONFIGURATION
// ============================================

/**
 * GET /api/admin/config
 * Get system configuration
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    const configs = await prisma.systemConfig.findMany()

    res.json({
      success: true,
      data: configs
    })
  } catch (error) {
    console.error('Get config error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch system configuration' 
    })
  }
})

/**
 * PUT /api/admin/config/:key
 * Update system configuration
 */
router.put('/config/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params
    const { value, description } = req.body

    if (!value) {
      res.status(400).json({ 
        success: false,
        error: 'Value is required' 
      })
      return
    }

    const config = await prisma.systemConfig.upsert({
      where: { key },
      update: { 
        value, 
        description,
        updatedBy: req.user!.id
      },
      create: { 
        key, 
        value, 
        description,
        updatedBy: req.user!.id
      }
    })

    await prisma.auditLog.create({
      data: {
        adminId: req.user!.id,
        action: 'update_system_config',
        targetType: 'system',
        targetId: key,
        changes: JSON.stringify({ key, value, description }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    })

    res.json({
      success: true,
      data: config
    })
  } catch (error) {
    console.error('Update config error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to update system configuration' 
    })
  }
})

export default router

