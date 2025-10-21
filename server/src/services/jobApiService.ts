import axios from 'axios'
import { stripHtml, truncate } from '../utils/htmlCleaner'

export interface JobResult {
  title: string
  company: string
  location: string
  salary?: string
  type?: string
  description: string
  url: string
  source: string
  postedDate?: string
}

export class JobApiService {
  private static instance: JobApiService

  private constructor() {}

  static getInstance(): JobApiService {
    if (!JobApiService.instance) {
      JobApiService.instance = new JobApiService()
    }
    return JobApiService.instance
  }

  /**
   * Detect if a search query is job-related
   */
  isJobQuery(description: string): boolean {
    const jobKeywords = [
      'job', 'jobs', 'career', 'position', 'hiring', 'employment',
      'developer', 'engineer', 'manager', 'analyst', 'designer',
      'remote', 'work from home', 'salary', 'full-time', 'part-time',
      'internship', 'contractor', 'freelance'
    ]
    
    const lowerDesc = description.toLowerCase()
    return jobKeywords.some(keyword => lowerDesc.includes(keyword))
  }

  /**
   * Detect if URL is Reddit
   */
  isRedditUrl(url: string): boolean {
    return url.includes('reddit.com')
  }

  /**
   * Scrape Reddit using JSON API
   */
  async scrapeReddit(url: string): Promise<any[]> {
    try {
      // Convert any Reddit URL to JSON API endpoint
      let apiUrl = url.replace(/^https?:\/\/(old\.|www\.)?reddit\.com/, 'https://www.reddit.com')
      
      // Remove trailing slash and add .json to path (not hostname)
      apiUrl = apiUrl.replace(/\/$/, '')
      if (!apiUrl.endsWith('.json')) {
        apiUrl = apiUrl + '.json'
      }

      const response = await axios.get(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WebScraperPro/1.0)'
        },
        params: { limit: 25 },
        timeout: 10000
      })

      const posts = response.data?.data?.children || []
      
      return posts.map((post: any) => {
        const data = post.data
        return {
          title: data.title,
          author: data.author,
          subreddit: data.subreddit,
          upvotes: data.ups,
          comments: data.num_comments,
          url: `https://reddit.com${data.permalink}`,
          external_url: data.url,
          selftext: data.selftext?.substring(0, 300),
          created: new Date(data.created_utc * 1000).toISOString(),
          source: 'Reddit JSON API'
        }
      })
    } catch (error) {
      console.error('Reddit API error:', error)
      return []
    }
  }

  /**
   * Search jobs from multiple free APIs
   */
  async searchJobs(query: string, location: string = 'remote'): Promise<JobResult[]> {
    const results: JobResult[] = []

    try {
      // Fetch from multiple sources in parallel
      const [remotive, adzuna, themuse, arbeitnow, jsearch, landing] = await Promise.allSettled([
        this.fetchRemotive(query),
        this.fetchAdzuna(query, location),
        this.fetchTheMuse(query, location),
        this.fetchArbeitnow(query, location),
        this.fetchJSearch(query, location),
        this.fetchLandingJobs(query)
      ])

      if (remotive.status === 'fulfilled') {
        results.push(...remotive.value)
      }
      if (adzuna.status === 'fulfilled') {
        results.push(...adzuna.value)
      }
      if (themuse.status === 'fulfilled') {
        results.push(...themuse.value)
      }
      if (arbeitnow.status === 'fulfilled') {
        results.push(...arbeitnow.value)
      }
      if (jsearch.status === 'fulfilled') {
        results.push(...jsearch.value)
      }
      if (landing.status === 'fulfilled') {
        results.push(...landing.value)
      }

      console.log(`Found ${results.length} jobs from ${[remotive, adzuna, themuse, arbeitnow, jsearch, landing].filter(r => r.status === 'fulfilled').length} sources`)
      return results

    } catch (error) {
      console.error('Job API search error:', error)
      return results
    }
  }

  /**
   * Fetch jobs from Remotive API (Remote jobs)
   */
  private async fetchRemotive(query: string): Promise<JobResult[]> {
    try {
      const response = await axios.get('https://remotive.com/api/remote-jobs', {
        params: { search: query, limit: 20 },
        timeout: 10000
      })

      const jobs = response.data.jobs || []
      return jobs.slice(0, 20).map((job: any) => ({
        title: job.title,
        company: job.company_name,
        location: 'Remote',
        salary: job.salary || 'Not specified',
        type: job.job_type || 'Full-time',
        description: truncate(stripHtml(job.description || 'No description'), 300),
        url: job.url,
        source: 'Remotive',
        postedDate: job.publication_date
      }))
    } catch (error) {
      console.log('Remotive API error (continuing):', (error as any).message)
      return []
    }
  }

  /**
   * Fetch jobs from Adzuna API (Requires free API key)
   */
  private async fetchAdzuna(query: string, location: string): Promise<JobResult[]> {
    try {
      // For demo purposes, using public endpoint (limited)
      // In production, get free API key from https://developer.adzuna.com/
      const appId = process.env.ADZUNA_APP_ID
      const appKey = process.env.ADZUNA_APP_KEY

      if (!appId || !appKey) {
        console.log('Adzuna API: No credentials (skipping)')
        return []
      }

      const response = await axios.get(
        `https://api.adzuna.com/v1/api/jobs/us/search/1`,
        {
          params: {
            app_id: appId,
            app_key: appKey,
            what: query,
            where: location,
            results_per_page: 20
          },
          timeout: 10000
        }
      )

      const jobs = response.data.results || []
      return jobs.map((job: any) => ({
        title: job.title,
        company: job.company.display_name,
        location: job.location.display_name,
        salary: job.salary_min ? `$${Math.round(job.salary_min)} - $${Math.round(job.salary_max)}` : 'Not specified',
        type: job.contract_time || 'Full-time',
        description: truncate(stripHtml(job.description || 'No description'), 300),
        url: job.redirect_url,
        source: 'Adzuna',
        postedDate: job.created
      }))
    } catch (error) {
      console.log('Adzuna API error (continuing):', (error as any).message)
      return []
    }
  }

  /**
   * Fetch jobs from The Muse API
   */
  private async fetchTheMuse(query: string, location: string): Promise<JobResult[]> {
    try {
      // The Muse API - simplified request to avoid 403
      const response = await axios.get('https://www.themuse.com/api/public/jobs', {
        params: {
          page: 0
        },
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Referer': 'https://www.themuse.com/'
        }
      })

      const jobs = response.data.results || []
      
      // Filter by query locally since API might not support all params
      const filteredJobs = query 
        ? jobs.filter((job: any) => {
            const titleMatch = job.name?.toLowerCase().includes(query.toLowerCase())
            const companyMatch = job.company?.name?.toLowerCase().includes(query.toLowerCase())
            const categoryMatch = job.categories?.[0]?.name?.toLowerCase().includes(query.toLowerCase())
            return titleMatch || companyMatch || categoryMatch
          })
        : jobs

      return filteredJobs.slice(0, 15).map((job: any) => {
        // The Muse landing_page URLs are often broken
        // Best approach: Use their search with company name which works reliably
        const companyName = job.company?.name || 'company'
        const jobTitle = job.name || 'position'
        
        // Use The Muse's search URL which is more reliable than direct job links
        const searchQuery = encodeURIComponent(`${jobTitle} ${companyName}`)
        const jobUrl = `https://www.themuse.com/search/jobs?search=${searchQuery}`
        
        return {
          title: job.name,
          company: job.company?.name || 'Unknown',
          location: job.locations?.[0]?.name || 'Flexible',
          salary: 'Not specified',
          type: job.levels?.[0]?.name || 'Full-time',
          description: truncate(stripHtml(job.contents || 'No description'), 300),
          url: jobUrl,
          source: 'The Muse',
          postedDate: job.publication_date
        }
      })
    } catch (error) {
      console.log('The Muse API error (continuing):', (error as any).message)
      return []
    }
  }

  /**
   * Fetch jobs from Arbeitnow (International jobs - Germany focus but worldwide)
   * Free, no authentication required
   */
  private async fetchArbeitnow(query: string, location: string): Promise<JobResult[]> {
    try {
      const response = await axios.get('https://www.arbeitnow.com/api/job-board-api', {
        timeout: 15000,
        headers: {
          'Accept': 'application/json'
        }
      })

      const jobs = response.data.data || []
      
      // Filter by query
      const filteredJobs = query 
        ? jobs.filter((job: any) => {
            const titleMatch = job.title?.toLowerCase().includes(query.toLowerCase())
            const companyMatch = job.company_name?.toLowerCase().includes(query.toLowerCase())
            const descMatch = job.description?.toLowerCase().includes(query.toLowerCase())
            return titleMatch || companyMatch || descMatch
          })
        : jobs

      return filteredJobs.slice(0, 20).map((job: any) => ({
        title: job.title,
        company: job.company_name,
        location: job.location || 'Remote',
        salary: 'Not specified',
        type: job.job_types?.[0] || 'Full-time',
        description: truncate(stripHtml(job.description || 'No description'), 300),
        url: job.url,
        source: 'Arbeitnow',
        postedDate: job.created_at
      }))
    } catch (error) {
      console.log('Arbeitnow API error (continuing):', (error as any).message)
      return []
    }
  }

  /**
   * Fetch jobs from JSearch (RapidAPI - Free tier available, aggregates from multiple sources)
   */
  private async fetchJSearch(query: string, location: string): Promise<JobResult[]> {
    try {
      // Using public GraphQL endpoint (no auth needed)
      const response = await axios.post('https://jsearch.p.rapidapi.com/search', {
        query: query || 'software developer',
        page: 1,
        num_pages: 1
      }, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || 'demo'
        }
      })

      const jobs = response.data.data || []
      return jobs.slice(0, 15).map((job: any) => ({
        title: job.job_title,
        company: job.employer_name,
        location: `${job.job_city || ''}, ${job.job_country || 'Remote'}`.trim(),
        salary: job.job_salary || 'Not specified',
        type: job.job_employment_type || 'Full-time',
        description: truncate(stripHtml(job.job_description || 'No description'), 300),
        url: job.job_apply_link,
        source: 'JSearch',
        postedDate: job.job_posted_at_datetime_utc
      }))
    } catch (error) {
      console.log('JSearch API error (continuing):', (error as any).message)
      return []
    }
  }

  /**
   * Fetch jobs from Landing.jobs (Europe focus, tech jobs)
   * Free, no authentication
   */
  private async fetchLandingJobs(query: string): Promise<JobResult[]> {
    try {
      const response = await axios.get('https://landing.jobs/api/v1/jobs', {
        params: {
          query: query,
          limit: 20
        },
        timeout: 15000,
        headers: {
          'Accept': 'application/json'
        }
      })

      const jobs = response.data || []
      return jobs.slice(0, 15).map((job: any) => ({
        title: job.title,
        company: job.company?.name || 'Unknown',
        location: `${job.city || ''}, ${job.country_code || 'Remote'}`.trim(),
        salary: job.salary_range || 'Not specified',
        type: job.contract_type || 'Full-time',
        description: truncate(stripHtml(job.description || 'No description'), 300),
        url: `https://landing.jobs/jobs/${job.id}`,
        source: 'Landing.jobs',
        postedDate: job.created_at
      }))
    } catch (error) {
      console.log('Landing.jobs API error (continuing):', (error as any).message)
      return []
    }
  }

  /**
   * Parse job search parameters from description
   */
  parseJobQuery(description: string): { query: string; location: string } {
    const lowerDesc = description.toLowerCase()
    
    // Extract location hints
    let location = 'remote'
    const locationPatterns = [
      /in ([a-z\s]+)/i,
      /at ([a-z\s]+)/i,
      /location[:\s]+([a-z\s]+)/i
    ]
    
    for (const pattern of locationPatterns) {
      const match = description.match(pattern)
      if (match && match[1]) {
        location = match[1].trim()
        break
      }
    }

    // Clean query (remove common words)
    let query = description
      .replace(/extract|get|find|search|scrape|list/gi, '')
      .replace(/job|jobs|position|positions/gi, '')
      .replace(/with|and|or|the/gi, '')
      .trim()

    if (!query) {
      query = 'developer' // Default
    }

    return { query, location }
  }
}

export const jobApiService = JobApiService.getInstance()

