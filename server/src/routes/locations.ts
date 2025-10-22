import { Router, Request, Response } from 'express'

const router = Router()

// International cities and "Remote" options (with strong African coverage)
const POPULAR_LOCATIONS = [
  'Remote',
  'Anywhere',
  // Africa - West Africa
  'Lagos, Nigeria',
  'Abuja, Nigeria',
  'Port Harcourt, Nigeria',
  'Ibadan, Nigeria',
  'Kano, Nigeria',
  'Accra, Ghana',
  'Kumasi, Ghana',
  'Dakar, Senegal',
  'Abidjan, Ivory Coast',
  'Bamako, Mali',
  'Conakry, Guinea',
  'Freetown, Sierra Leone',
  'Monrovia, Liberia',
  'Ouagadougou, Burkina Faso',
  'Niamey, Niger',
  'Lome, Togo',
  'Cotonou, Benin',
  // Africa - East Africa
  'Nairobi, Kenya',
  'Mombasa, Kenya',
  'Kampala, Uganda',
  'Dar es Salaam, Tanzania',
  'Kigali, Rwanda',
  'Addis Ababa, Ethiopia',
  'Asmara, Eritrea',
  'Mogadishu, Somalia',
  'Djibouti, Djibouti',
  'Bujumbura, Burundi',
  // Africa - North Africa
  'Cairo, Egypt',
  'Alexandria, Egypt',
  'Casablanca, Morocco',
  'Rabat, Morocco',
  'Marrakech, Morocco',
  'Tunis, Tunisia',
  'Algiers, Algeria',
  'Tripoli, Libya',
  'Khartoum, Sudan',
  // Africa - Southern Africa
  'Cape Town, South Africa',
  'Johannesburg, South Africa',
  'Pretoria, South Africa',
  'Durban, South Africa',
  'Lusaka, Zambia',
  'Harare, Zimbabwe',
  'Gaborone, Botswana',
  'Windhoek, Namibia',
  'Maputo, Mozambique',
  'Maseru, Lesotho',
  'Mbabane, Eswatini',
  'Antananarivo, Madagascar',
  'Port Louis, Mauritius',
  // Africa - Central Africa
  'Kinshasa, DR Congo',
  'Brazzaville, Congo',
  'Libreville, Gabon',
  'Yaounde, Cameroon',
  'Douala, Cameroon',
  'Bangui, Central African Republic',
  'N\'Djamena, Chad',
  'Malabo, Equatorial Guinea',
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
