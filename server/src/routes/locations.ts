import { Router, Request, Response } from 'express'

const router = Router()

// International cities and "Remote" options
const POPULAR_LOCATIONS = [
  'Remote',
  'Anywhere',
  // North America
  'New York, NY',
  'San Francisco, CA',
  'Los Angeles, CA',
  'Toronto, Canada',
  'Vancouver, Canada',
  'Chicago, IL',
  'Boston, MA',
  'Seattle, WA',
  'Austin, TX',
  // Europe
  'London, UK',
  'Berlin, Germany',
  'Paris, France',
  'Amsterdam, Netherlands',
  'Barcelona, Spain',
  'Dublin, Ireland',
  'Stockholm, Sweden',
  'Copenhagen, Denmark',
  'Zurich, Switzerland',
  'Milan, Italy',
  // Asia
  'Singapore',
  'Tokyo, Japan',
  'Hong Kong',
  'Bangalore, India',
  'Mumbai, India',
  'Dubai, UAE',
  'Tel Aviv, Israel',
  // Africa
  'Lagos, Nigeria',
  'Cape Town, South Africa',
  'Nairobi, Kenya',
  'Cairo, Egypt',
  // Australia
  'Sydney, Australia',
  'Melbourne, Australia'
]

/**
 * GET /api/locations (root endpoint for frontend compatibility)
 * Search for locations by query parameter
 */
router.get('/', (req: Request, res: Response) => {
  const query = (req.query.query as string || '').toLowerCase()
  
  if (!query || query.length < 2) {
    return res.json({
      success: true,
      data: POPULAR_LOCATIONS.slice(0, 10)
    })
  }
  
  const filtered = POPULAR_LOCATIONS.filter(location =>
    location.toLowerCase().includes(query)
  )
  
  return res.json({
    success: true,
    data: filtered.slice(0, 10)
  })
})

/**
 * GET /api/locations/search (alternative endpoint)
 * Search for locations by query
 */
router.get('/search', (req: Request, res: Response) => {
  const query = (req.query.q as string || req.query.query as string || '').toLowerCase()
  
  if (!query) {
    return res.json({
      success: true,
      data: POPULAR_LOCATIONS.slice(0, 10)
    })
  }
  
  const filtered = POPULAR_LOCATIONS.filter(location =>
    location.toLowerCase().includes(query)
  )
  
  return res.json({
    success: true,
    data: filtered.slice(0, 10)
  })
})

/**
 * GET /api/locations/popular
 * Get popular locations
 */
router.get('/popular', (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: POPULAR_LOCATIONS.slice(0, 20)
  })
})

export default router
