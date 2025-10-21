import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/database'
import { authenticateToken } from '../middleware/auth'
import { Parser } from 'json2csv'
import { create as createXML } from 'xmlbuilder2'

const router = Router()

// Apply authentication to all export routes
router.use(authenticateToken)

// Export data validation schemas
const exportDataSchema = z.object({
  jobId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  format: z.enum(['json', 'csv', 'xml', 'xlsx']).default('json'),
  fields: z.array(z.string()).optional(),
  limit: z.number().min(1).max(10000).default(1000),
  offset: z.number().min(0).default(0)
})

const exportJobsSchema = z.object({
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  format: z.enum(['json', 'csv', 'xml']).default('json'),
  fields: z.array(z.string()).optional(),
  limit: z.number().min(1).max(10000).default(1000),
  offset: z.number().min(0).default(0)
})

/**
 * Export scraped data in various formats
 * GET /api/export/data?format=json&jobId=123&limit=100
 */
router.get('/data', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id
    const query = exportDataSchema.parse({
      ...req.query,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      fields: req.query.fields ? (req.query.fields as string).split(',') : undefined
    })

    // Build where clause
    const where: any = {
      job: {
        userId
      }
    }

    if (query.jobId) {
      where.jobId = query.jobId
    }

    if (query.startDate || query.endDate) {
      where.scrapedAt = {}
      if (query.startDate) {
        where.scrapedAt.gte = new Date(query.startDate)
      }
      if (query.endDate) {
        where.scrapedAt.lte = new Date(query.endDate)
      }
    }

    // Fetch data
    const scrapedData = await prisma.scrapedData.findMany({
      where,
      include: {
        job: {
          select: {
            name: true,
            url: true,
            description: true
          }
        }
      },
      orderBy: {
        scrapedAt: 'desc'
      },
      take: query.limit,
      skip: query.offset
    })

    // Transform data for export
    const exportData = scrapedData.map(item => {
      let data = {}
      try {
        data = JSON.parse(item.data)
      } catch (e) {
        data = { raw_data: item.data }
      }

      const baseData: Record<string, any> = {
        id: item.id,
        job_id: item.jobId,
        job_name: item.job?.name || 'Unknown',
        job_url: item.job?.url || '',
        job_description: item.job?.description || '',
        scraped_at: item.scrapedAt.toISOString(),
        url: item.url,
        created_at: item.createdAt.toISOString(),
        updated_at: item.updatedAt.toISOString()
      }

      // Merge scraped data with base data
      return {
        ...baseData,
        ...data
      }
    })

    // Filter fields if specified
    let filteredData = exportData
    if (query.fields && query.fields.length > 0) {
      filteredData = exportData.map(item => {
        const filtered: Record<string, any> = {}
        const itemRecord = item as Record<string, any>
        query.fields!.forEach(field => {
          if (itemRecord.hasOwnProperty(field)) {
            filtered[field] = itemRecord[field]
          }
        })
        return filtered
      })
    }

    // Export based on format
    switch (query.format) {
      case 'json':
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Content-Disposition', `attachment; filename="scraped-data-${Date.now()}.json"`)
        res.json({
          success: true,
          data: filteredData,
          meta: {
            total: filteredData.length,
            exported_at: new Date().toISOString(),
            format: 'json'
          }
        })
        break

      case 'csv':
        if (filteredData.length === 0) {
          res.status(400).json({ error: 'No data to export' })
          return
        }

        const fields = Object.keys(filteredData[0] as Record<string, any>)
        const parser = new Parser({ fields })
        const csv = parser.parse(filteredData)

        res.setHeader('Content-Type', 'text/csv')
        res.setHeader('Content-Disposition', `attachment; filename="scraped-data-${Date.now()}.csv"`)
        res.send(csv)
        break

      case 'xml':
        const xml = createXML({ version: '1.0' })
          .ele('export')
          .att('exported_at', new Date().toISOString())
          .att('total', filteredData.length.toString())
          .att('format', 'xml')

        const items = xml.ele('items')
        filteredData.forEach(item => {
          const itemElement = items.ele('item')
          Object.entries(item as Record<string, any>).forEach(([key, value]) => {
            itemElement.ele(key).txt(String(value))
          })
        })

        res.setHeader('Content-Type', 'application/xml')
        res.setHeader('Content-Disposition', `attachment; filename="scraped-data-${Date.now()}.xml"`)
        res.send(xml.end({ prettyPrint: true }))
        break

      case 'xlsx':
        // For XLSX, we'll return JSON for now and implement Excel export later
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Content-Disposition', `attachment; filename="scraped-data-${Date.now()}.json"`)
        res.json({
          success: true,
          data: filteredData,
          meta: {
            total: filteredData.length,
            exported_at: new Date().toISOString(),
            format: 'xlsx',
            note: 'XLSX export coming soon. Data exported as JSON.'
          }
        })
        break

      default:
        res.status(400).json({ error: 'Invalid format specified' })
    }
  } catch (error) {
    console.error('Export data error:', error)
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid query parameters', details: error.errors })
    }
    res.status(500).json({ error: 'Failed to export data' })
  }
})

/**
 * Export job information
 * GET /api/export/jobs?format=csv&status=COMPLETED
 */
router.get('/jobs', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id
    const query = exportJobsSchema.parse({
      ...req.query,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      fields: req.query.fields ? (req.query.fields as string).split(',') : undefined
    })

    // Build where clause
    const where: any = {
      userId
    }

    if (query.status) {
      where.status = query.status
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {}
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate)
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate)
      }
    }

    // Fetch jobs
    const jobs = await prisma.job.findMany({
      where,
      include: {
        _count: {
          select: {
            executions: true,
            scrapedData: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: query.limit,
      skip: query.offset
    })

    // Transform data for export
    const exportData = jobs.map(job => {
      let config = {}
      try {
        config = JSON.parse(job.config)
      } catch (e) {
        config = { raw_config: job.config }
      }

      return {
        id: job.id,
        name: job.name,
        description: job.description || '',
        url: job.url,
        status: job.status,
        schedule: job.schedule || '',
        config: JSON.stringify(config),
        execution_count: job._count.executions,
        data_count: job._count.scrapedData,
        created_at: job.createdAt.toISOString(),
        updated_at: job.updatedAt.toISOString(),
        next_run_at: job.nextRunAt?.toISOString() || ''
      } as Record<string, any>
    })

    // Filter fields if specified
    let filteredData = exportData
    if (query.fields && query.fields.length > 0) {
      filteredData = exportData.map(item => {
        const filtered: Record<string, any> = {}
        const itemRecord = item as Record<string, any>
        query.fields!.forEach(field => {
          if (itemRecord.hasOwnProperty(field)) {
            filtered[field] = itemRecord[field]
          }
        })
        return filtered
      })
    }

    // Export based on format
    switch (query.format) {
      case 'json':
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Content-Disposition', `attachment; filename="jobs-${Date.now()}.json"`)
        res.json({
          success: true,
          data: filteredData,
          meta: {
            total: filteredData.length,
            exported_at: new Date().toISOString(),
            format: 'json'
          }
        })
        break

      case 'csv':
        if (filteredData.length === 0) {
          res.status(400).json({ error: 'No jobs to export' })
          return
        }

        const fields = Object.keys(filteredData[0] as Record<string, any>)
        const parser = new Parser({ fields })
        const csv = parser.parse(filteredData)

        res.setHeader('Content-Type', 'text/csv')
        res.setHeader('Content-Disposition', `attachment; filename="jobs-${Date.now()}.csv"`)
        res.send(csv)
        break

      case 'xml':
        const xml = createXML({ version: '1.0' })
          .ele('export')
          .att('exported_at', new Date().toISOString())
          .att('total', filteredData.length.toString())
          .att('format', 'xml')

        const items = xml.ele('jobs')
        filteredData.forEach(item => {
          const itemElement = items.ele('job')
          Object.entries(item as Record<string, any>).forEach(([key, value]) => {
            itemElement.ele(key).txt(String(value))
          })
        })

        res.setHeader('Content-Type', 'application/xml')
        res.setHeader('Content-Disposition', `attachment; filename="jobs-${Date.now()}.xml"`)
        res.send(xml.end({ prettyPrint: true }))
        break

      default:
        res.status(400).json({ error: 'Invalid format specified' })
    }
  } catch (error) {
    console.error('Export jobs error:', error)
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid query parameters', details: error.errors })
    }
    res.status(500).json({ error: 'Failed to export jobs' })
  }
})

/**
 * Get export statistics
 * GET /api/export/stats
 */
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id

    const stats = await prisma.$transaction([
      // Total data points
      prisma.scrapedData.count({
        where: { 
          job: {
            userId
          }
        }
      }),
      
      // Total jobs
      prisma.job.count({
        where: { userId }
      }),
      
      // Data by date (last 30 days)
      prisma.scrapedData.groupBy({
        by: ['scrapedAt'],
        where: {
          job: {
            userId
          },
          scrapedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        _count: {
          id: true
        },
        orderBy: {
          scrapedAt: 'desc'
        }
      }),

      // Jobs by status
      prisma.job.groupBy({
        by: ['status'],
        where: { userId },
        _count: {
          id: true
        },
        orderBy: {
          status: 'asc'
        }
      })
    ])

    const [totalDataPoints, totalJobs, dataByDate, jobsByStatus] = stats

    res.json({
      success: true,
      data: {
        total_data_points: totalDataPoints,
        total_jobs: totalJobs,
        data_by_date: dataByDate,
        jobs_by_status: jobsByStatus,
        export_formats: ['json', 'csv', 'xml', 'xlsx'],
        max_export_limit: 10000
      }
    })
  } catch (error) {
    console.error('Export stats error:', error)
    res.status(500).json({ error: 'Failed to get export statistics' })
  }
})

export default router
