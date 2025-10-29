import { prisma } from '../utils/database'

/**
 * Affiliate Service
 * Manages affiliate links and tracks clicks for revenue generation
 */

export interface AffiliateConfig {
  zipRecruiter?: string // ZipRecruiter affiliate ID
  indeed?: string // Indeed publisher ID
  flexJobs?: string // FlexJobs affiliate ID
  linkedin?: string // LinkedIn partner ID
  remoteOk?: string // Remote.ok affiliate code
  wellfound?: string // Wellfound (AngelList) affiliate
}

export class AffiliateService {
  private static instance: AffiliateService
  private config: AffiliateConfig

  private constructor() {
    this.config = {
      zipRecruiter: process.env.ZIPRECRUITER_AFFILIATE_ID,
      indeed: process.env.INDEED_PUBLISHER_ID,
      flexJobs: process.env.FLEXJOBS_AFFILIATE_ID,
      linkedin: process.env.LINKEDIN_PARTNER_ID,
      remoteOk: process.env.REMOTEOK_AFFILIATE_CODE,
      wellfound: process.env.WELLFOUND_AFFILIATE_ID
    }
  }

  static getInstance(): AffiliateService {
    if (!AffiliateService.instance) {
      AffiliateService.instance = new AffiliateService()
    }
    return AffiliateService.instance
  }

  /**
   * Wrap a job URL with affiliate tracking
   */
  wrapAffiliateUrl(originalUrl: string, source: string, jobId?: string): string {
    // If no URL provided, return empty
    if (!originalUrl) return ''

    try {
      const url = new URL(originalUrl)
      const hostname = url.hostname.toLowerCase()

      // Add affiliate parameters based on job source/domain
      if (hostname.includes('ziprecruiter.com') && this.config.zipRecruiter) {
        url.searchParams.set('affid', this.config.zipRecruiter)
        url.searchParams.set('ref', jobId || 'jobhunter')
      } 
      else if (hostname.includes('indeed.com') && this.config.indeed) {
        url.searchParams.set('publisher', this.config.indeed)
        url.searchParams.set('from', 'jobhunter')
      }
      else if (hostname.includes('flexjobs.com') && this.config.flexJobs) {
        url.searchParams.set('aff_id', this.config.flexJobs)
        url.searchParams.set('aff_sub', jobId || 'search')
      }
      else if (hostname.includes('linkedin.com') && this.config.linkedin) {
        url.searchParams.set('refId', this.config.linkedin)
        url.searchParams.set('trk', 'jobhunter')
      }
      else if (hostname.includes('remoteok.com') && this.config.remoteOk) {
        url.searchParams.set('ref', this.config.remoteOk)
      }
      else if (hostname.includes('wellfound.com') && this.config.wellfound) {
        url.searchParams.set('utm_source', this.config.wellfound)
        url.searchParams.set('utm_medium', 'affiliate')
      }

      // Add general tracking parameters
      url.searchParams.set('utm_source', 'jobhunter')
      url.searchParams.set('utm_medium', 'job_board')
      url.searchParams.set('utm_campaign', source.toLowerCase().replace(/\s+/g, '_'))

      return url.toString()
    } catch (error) {
      // If URL parsing fails, return original URL
      console.error('Affiliate URL wrapping error:', error)
      return originalUrl
    }
  }

  /**
   * Track affiliate click
   */
  async trackClick(jobId: string, source: string, userId?: string, metadata?: any): Promise<void> {
    try {
      // Store in ActivityLog for analytics
      if (userId) {
        await prisma.activityLog.create({
          data: {
            userId,
            action: 'affiliate_click',
            entityType: 'job',
            entityId: jobId,
            metadata: JSON.stringify({
              source,
              ...metadata,
              timestamp: new Date().toISOString()
            })
          }
        })
      }

      // Also track in SystemMetric for revenue analytics
      await prisma.systemMetric.create({
        data: {
          metricType: 'affiliate_click',
          value: 1,
          unit: 'click',
          metadata: JSON.stringify({
            source,
            jobId,
            userId,
            ...metadata
          })
        }
      })
    } catch (error) {
      console.error('Affiliate click tracking error:', error)
      // Don't throw - tracking failure shouldn't break the user experience
    }
  }

  /**
   * Get affiliate click analytics
   */
  async getClickAnalytics(timeRange: string = '30d'): Promise<any> {
    try {
      const startDate = this.getStartDate(timeRange)

      const clicks = await prisma.systemMetric.findMany({
        where: {
          metricType: 'affiliate_click',
          recordedAt: { gte: startDate }
        },
        orderBy: { recordedAt: 'desc' }
      })

      // Group by source
      const clicksBySource: { [key: string]: number } = {}
      clicks.forEach(click => {
        try {
          const metadata = JSON.parse(click.metadata || '{}')
          const source = metadata.source || 'unknown'
          clicksBySource[source] = (clicksBySource[source] || 0) + 1
        } catch (e) {
          // Skip invalid metadata
        }
      })

      // Calculate estimated revenue (approximate)
      const estimatedRevenue = this.calculateEstimatedRevenue(clicks)

      return {
        totalClicks: clicks.length,
        clicksBySource,
        estimatedRevenue,
        timeRange,
        clicksOverTime: this.groupClicksByDay(clicks)
      }
    } catch (error) {
      console.error('Error fetching affiliate analytics:', error)
      return {
        totalClicks: 0,
        clicksBySource: {},
        estimatedRevenue: 0,
        timeRange
      }
    }
  }

  /**
   * Calculate estimated revenue based on average payouts
   */
  private calculateEstimatedRevenue(clicks: any[]): number {
    // Average payout estimates per source (conservative)
    const payoutEstimates: { [key: string]: number } = {
      'ziprecruiter': 8.00,  // $5-20 avg
      'indeed': 1.50,        // $0.10-3 avg
      'flexjobs': 15.00,     // 50% of $29.95 if conversion
      'linkedin': 10.00,     // $5-15 avg
      'remoteok': 5.00,      // Estimated
      'wellfound': 7.00      // Estimated
    }

    let totalRevenue = 0
    clicks.forEach(click => {
      try {
        const metadata = JSON.parse(click.metadata || '{}')
        const source = (metadata.source || '').toLowerCase()
        const payout = payoutEstimates[source] || 0
        totalRevenue += payout
      } catch (e) {
        // Skip invalid metadata
      }
    })

    return parseFloat(totalRevenue.toFixed(2))
  }

  /**
   * Group clicks by day for charting
   */
  private groupClicksByDay(clicks: any[]): { date: string; clicks: number }[] {
    const clicksByDay: { [key: string]: number } = {}

    clicks.forEach(click => {
      const date = click.recordedAt.toISOString().split('T')[0]
      clicksByDay[date] = (clicksByDay[date] || 0) + 1
    })

    return Object.entries(clicksByDay)
      .map(([date, clicks]) => ({ date, clicks }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  /**
   * Get start date based on time range
   */
  private getStartDate(timeRange: string): Date {
    const now = new Date()
    switch (timeRange) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000)
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }
  }
}

export const affiliateService = AffiliateService.getInstance()

