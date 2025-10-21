import axios from 'axios'

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
      const [remotive, adzuna, themuse] = await Promise.allSettled([
        this.fetchRemotive(query),
        this.fetchAdzuna(query, location),
        this.fetchTheMuse(query, location)
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

      console.log(`Found ${results.length} jobs from APIs`)
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
        description: job.description?.substring(0, 500) || 'No description',
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
        salary: job.salary_min ? `$${job.salary_min} - $${job.salary_max}` : 'Not specified',
        type: job.contract_time || 'Full-time',
        description: job.description?.substring(0, 500) || 'No description',
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
      const response = await axios.get('https://www.themuse.com/api/public/jobs', {
        params: {
          keyword: query,
          location: location,
          page: 0,
          descending: true
        },
        timeout: 10000
      })

      const jobs = response.data.results || []
      return jobs.slice(0, 20).map((job: any) => ({
        title: job.name,
        company: job.company?.name || 'Unknown',
        location: job.locations?.[0]?.name || location,
        salary: 'Not specified',
        type: job.type || 'Full-time',
        description: job.contents?.substring(0, 500) || 'No description',
        url: `https://www.themuse.com/jobs/${job.id}`,
        source: 'The Muse',
        postedDate: job.publication_date
      }))
    } catch (error) {
      console.log('The Muse API error (continuing):', (error as any).message)
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

