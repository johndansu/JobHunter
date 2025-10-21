import { Router, Request, Response } from 'express'
import { jobApiService } from '../services/jobApiService'

const router = Router()

/**
 * Public job search endpoint - fetches directly from APIs
 * No authentication required for browsing jobs
 */
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const { query = '', location = '' } = req.query

    console.log(`Public job search: query="${query}", location="${location}"`)

    // Fetch jobs directly from APIs
    const jobs = await jobApiService.searchJobs(
      query as string,
      location as string
    )

    return res.json({
      data: jobs,
      total: jobs.length,
      source: 'live_apis'
    })
  } catch (error) {
    console.error('Public job search error:', error)
    return res.status(500).json({ 
      error: 'Failed to fetch jobs',
      message: (error as Error).message 
    })
  }
})

export default router

