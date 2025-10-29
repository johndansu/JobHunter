import { Request, Response, NextFunction } from 'express'
import { prisma } from '../utils/database'

/**
 * Middleware to track API calls to external services
 * Call this after making external API calls
 */
export const trackApiCall = async (
  provider: string,
  endpoint: string,
  success: boolean,
  statusCode?: number,
  responseTime?: number,
  errorMessage?: string,
  userId?: string,
  req?: Request
) => {
  try {
    await prisma.apiLog.create({
      data: {
        provider,
        endpoint,
        success,
        statusCode,
        responseTime,
        errorMessage,
        userId,
        ipAddress: req?.ip,
        userAgent: req?.get('user-agent')
      }
    })
  } catch (error) {
    // Don't throw - just log tracking errors
    console.error('Failed to track API call:', error)
  }
}

/**
 * Middleware to track user activity
 */
export const trackActivity = async (
  userId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: any,
  req?: Request
) => {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ipAddress: req?.ip,
        userAgent: req?.get('user-agent')
      }
    })

    // Update user's last active timestamp
    await prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date() }
    })
  } catch (error) {
    console.error('Failed to track activity:', error)
  }
}

/**
 * Middleware to log errors
 */
export const logError = async (
  errorType: string,
  message: string,
  stack?: string,
  severity: 'info' | 'warning' | 'error' | 'critical' = 'error',
  userId?: string,
  req?: Request,
  errorCode?: string,
  requestData?: any
) => {
  try {
    await prisma.errorLog.create({
      data: {
        errorType,
        message,
        stack,
        severity,
        userId,
        errorCode,
        endpoint: req?.path,
        method: req?.method,
        requestData: requestData ? JSON.stringify(requestData) : null,
        ipAddress: req?.ip,
        userAgent: req?.get('user-agent')
      }
    })
  } catch (error) {
    console.error('Failed to log error:', error)
  }
}

/**
 * Middleware to log security events
 */
export const logSecurityEvent = async (
  eventType: string,
  ipAddress: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  userId?: string,
  details?: any,
  req?: Request
) => {
  try {
    await prisma.securityEvent.create({
      data: {
        eventType,
        ipAddress,
        severity,
        userId,
        details: details ? JSON.stringify(details) : null,
        userAgent: req?.get('user-agent')
      }
    })
  } catch (error) {
    console.error('Failed to log security event:', error)
  }
}

/**
 * Express middleware to track all incoming requests
 */
export const requestTracker = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now()

  // Track when response is sent
  res.on('finish', async () => {
    const responseTime = Date.now() - startTime
    
    // Track activity if user is authenticated
    if (req.user) {
      const action = getActionFromRoute(req.path, req.method)
      if (action) {
        await trackActivity(
          req.user.id,
          action,
          undefined,
          undefined,
          { path: req.path, method: req.method, responseTime },
          req
        )
      }
    }

    // Log failed requests
    if (res.statusCode >= 400) {
      await logError(
        res.statusCode >= 500 ? 'server_error' : 'client_error',
        `${req.method} ${req.path} failed with status ${res.statusCode}`,
        undefined,
        res.statusCode >= 500 ? 'error' : 'warning',
        req.user?.id,
        req,
        res.statusCode.toString()
      )
    }
  })

  next()
}

/**
 * Middleware to check IP rules (blocklist/whitelist)
 */
export const checkIpRules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ipAddress = req.ip || 'unknown'
    
    // Check if IP is blocked
    const blockedRule = await prisma.ipRule.findFirst({
      where: {
        ipAddress,
        type: 'block',
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    })

    if (blockedRule) {
      await logSecurityEvent(
        'blocked_ip',
        ipAddress,
        'high',
        undefined,
        { reason: blockedRule.reason },
        req
      )

      res.status(403).json({
        success: false,
        error: 'Access denied'
      })
      return
    }

    next()
  } catch (error) {
    console.error('IP check error:', error)
    next() // Continue on error
  }
}

/**
 * Helper function to determine action from route
 */
function getActionFromRoute(path: string, method: string): string | null {
  // Search endpoints
  if (path.includes('/search/jobs')) return 'search'
  
  // Job viewing
  if (path.includes('/jobs/') && method === 'GET') return 'view_job'
  
  // Profile updates
  if (path.includes('/users/') && method === 'PUT') return 'update_profile'
  
  // Login/logout tracked separately in auth routes
  
  return null
}

/**
 * Middleware to track failed login attempts
 */
export const trackFailedLogin = async (
  email: string,
  ipAddress: string,
  req: Request
) => {
  await logSecurityEvent(
    'failed_login',
    ipAddress,
    'medium',
    undefined,
    { email, timestamp: new Date() },
    req
  )

  // Check for brute force (5+ failures in 10 minutes)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
  const recentFailures = await prisma.securityEvent.count({
    where: {
      eventType: 'failed_login',
      ipAddress,
      createdAt: { gte: tenMinutesAgo }
    }
  })

  if (recentFailures >= 5) {
    // Auto-block IP for 1 hour
    await prisma.ipRule.create({
      data: {
        ipAddress,
        type: 'block',
        reason: 'Automatic block due to multiple failed login attempts',
        createdBy: 'system',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      }
    })

    await logSecurityEvent(
      'auto_blocked_ip',
      ipAddress,
      'critical',
      undefined,
      { reason: 'brute_force', failureCount: recentFailures },
      req
    )
  }
}

