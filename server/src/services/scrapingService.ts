import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { Browser, Page } from 'puppeteer'
import { ScrapingConfig, SelectorConfig, JobExecution } from '../types'
import { prisma } from '../utils/database'
import { broadcastToUser } from '../utils/websocket'
import { proxyService } from './proxyService'
import { jobApiService } from './jobApiService'

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin())

export interface ScrapingResult {
  success: boolean
  data: any[]
  pagesScraped: number
  dataPoints: number
  error?: string
  screenshots?: string[]
}

export class ScrapingService {
  private static instance: ScrapingService
  private browser: Browser | null = null
  private activeJobs = new Map<string, { page: Page; executionId: string }>()

  private constructor() {}

  static getInstance(): ScrapingService {
    if (!ScrapingService.instance) {
      ScrapingService.instance = new ScrapingService()
    }
    return ScrapingService.instance
  }

  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          '--window-size=1920,1080'
        ],
        defaultViewport: {
          width: 1920,
          height: 1080
        },
        timeout: 60000
      })
    }
  }

  /**
   * Create a new browser instance with proxy configuration
   */
  private async createBrowserWithProxy(proxyPool: string = 'default'): Promise<Browser> {
    const proxyConfig = proxyService.getProxyConfigForPuppeteer(proxyPool)
    
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--window-size=1920,1080',
      '--disable-extensions',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',
      '--hide-scrollbars',
      '--mute-audio',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-component-extensions-with-background-pages',
      '--disable-ipc-flooding-protection',
      '--enable-features=NetworkService,NetworkServiceLogging',
      '--force-color-profile=srgb',
      '--metrics-recording-only',
      '--use-mock-keychain',
      '--disable-hang-monitor',
      '--disable-prompt-on-repost',
      '--disable-domain-reliability',
      '--disable-client-side-phishing-detection',
      '--disable-component-update',
      '--disable-features=TranslateUI',
      '--disable-print-preview',
      '--disable-speech-api',
      '--safebrowsing-disable-auto-update',
      '--disable-ipc-flooding-protection',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-features=TranslateUI,BlinkGenPropertyTrees',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-plugins-discovery',
      '--disable-preconnect',
      '--run-all-compositor-stages-before-draw',
      '--disable-threaded-compositing',
      '--disable-threaded-scrolling',
      '--disable-checker-imaging',
      '--disable-new-tab-first-run'
    ]

    // Add proxy configuration if available
    if (proxyConfig.server) {
      args.push(`--proxy-server=${proxyConfig.server}`)
    }

    return await puppeteer.launch({
      headless: true,
      args,
      defaultViewport: { width: 1920, height: 1080 },
      timeout: 60000
    })
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  async scrapeJob(jobId: string, userId: string): Promise<ScrapingResult> {
    try {
      await this.initialize()

      // Get job details
      const job = await prisma.job.findFirst({
        where: { id: jobId, userId }
      })

      if (!job) {
        throw new Error('Job not found')
      }

      // Create execution record
      const execution = await prisma.jobExecution.create({
        data: {
          jobId,
          status: 'RUNNING'
        }
      })

      // Update job status
      await prisma.job.update({
        where: { id: jobId },
        data: { 
          status: 'RUNNING',
          lastRunAt: new Date()
        }
      })

      // Notify user via WebSocket
      broadcastToUser(userId, {
        type: 'job_started',
        data: { jobId, executionId: execution.id }
      })

      const result = await this.performScraping(job, execution.id, userId)

      // Update execution record
      await prisma.jobExecution.update({
        where: { id: execution.id },
        data: {
          status: result.success ? 'COMPLETED' : 'FAILED',
          completedAt: new Date(),
          duration: Date.now() - execution.startedAt.getTime(),
          pagesScraped: result.pagesScraped,
          dataPoints: result.dataPoints,
          error: result.error,
          logs: result.screenshots ? JSON.stringify({ screenshots: result.screenshots }) : undefined
        }
      })

      // Update job status
      await prisma.job.update({
        where: { id: jobId },
        data: { 
          status: result.success ? 'COMPLETED' : 'FAILED'
        }
      })

      // Notify user via WebSocket
      broadcastToUser(userId, {
        type: 'job_completed',
        data: { 
          jobId, 
          executionId: execution.id, 
          success: result.success,
          pagesScraped: result.pagesScraped,
          dataPoints: result.dataPoints
        }
      })

      return result

    } catch (error) {
      console.error('Scraping error:', error)
      
      // Update execution record with error
      const execution = await prisma.jobExecution.findFirst({
        where: { jobId, status: 'RUNNING' },
        orderBy: { startedAt: 'desc' }
      })

      if (execution) {
        await prisma.jobExecution.update({
          where: { id: execution.id },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            duration: Date.now() - execution.startedAt.getTime(),
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        })
      }

      // Update job status
      await prisma.job.update({
        where: { id: jobId },
        data: { status: 'FAILED' }
      })

      // Notify user via WebSocket
      broadcastToUser(userId, {
        type: 'job_failed',
        data: { jobId, error: error instanceof Error ? error.message : 'Unknown error' }
      })

      return {
        success: false,
        data: [],
        pagesScraped: 0,
        dataPoints: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async performScraping(job: any, executionId: string, userId: string): Promise<ScrapingResult> {
    // Check if this is Reddit - use JSON API instead of scraping
    if (jobApiService.isRedditUrl(job.url)) {
      console.log('Detected Reddit URL - using Reddit JSON API instead of scraping')
      
      try {
        const posts = await jobApiService.scrapeReddit(job.url)
        
        // Save results to database
        for (const post of posts) {
          await prisma.scrapedData.create({
            data: {
              jobId: job.id,
              url: post.url,
              data: JSON.stringify(post),
              metadata: JSON.stringify({ source: 'Reddit JSON API' }),
              scrapedAt: new Date()
            }
          })
        }
        
        return {
          success: true,
          data: posts,
          pagesScraped: 1,
          dataPoints: posts.length
        }
      } catch (error) {
        console.error('Reddit API error:', error)
        // Fall through to regular scraping if API fails
      }
    }

    // Check if this is a job-related query - use APIs instead of scraping
    if (job.description && jobApiService.isJobQuery(job.description)) {
      console.log('Detected job query - using Job APIs instead of scraping')
      
      try {
        const { query, location } = jobApiService.parseJobQuery(job.description)
        const jobs = await jobApiService.searchJobs(query, location)
        
        // Save results to database
        for (const jobResult of jobs) {
          await prisma.scrapedData.create({
            data: {
              jobId: job.id,
              url: jobResult.url,
              data: JSON.stringify(jobResult),
              metadata: JSON.stringify({ source: jobResult.source }),
              scrapedAt: new Date()
            }
          })
        }
        
        return {
          success: true,
          data: jobs,
          pagesScraped: 1,
          dataPoints: jobs.length
        }
      } catch (error) {
        console.error('Job API error:', error)
        // Fall through to regular scraping if API fails
      }
    }

    if (!this.browser) {
      throw new Error('Browser not initialized')
    }

    const page = await this.browser.newPage()
    this.activeJobs.set(job.id, { page, executionId })

    try {
      // Parse config
      const config: ScrapingConfig = JSON.parse(job.config)
      
      // Set realistic user agent
      const userAgent = config.userAgent || 
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      await page.setUserAgent(userAgent)

      // Set realistic headers
      const headers = config.headers || {}
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        ...headers
      })

      // Set cookies
      if (config.cookies) {
        const cookies = Object.entries(config.cookies).map(([name, value]) => ({
          name,
          value,
          domain: new URL(job.url).hostname
        }))
        await page.setCookie(...cookies)
      }

      // Set viewport with random variation
      const width = 1920 + Math.floor(Math.random() * 100)
      const height = 1080 + Math.floor(Math.random() * 100)
      await page.setViewport({ width, height })

      // Override navigator properties to avoid detection
      // @ts-ignore - Browser context code
      await page.evaluateOnNewDocument(() => {
        // Override the navigator.webdriver property
        // @ts-ignore
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined
        })

        // Override plugins and mimeTypes
        // @ts-ignore
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5]
        })

        // @ts-ignore
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en']
        })

        // Chrome runtime
        // @ts-ignore
        (window as any).chrome = {
          runtime: {}
        }

        // Permissions
        // @ts-ignore
        const originalQuery = window.navigator.permissions.query;
        // @ts-ignore
        (window.navigator.permissions as any).query = (parameters: any) => (
          parameters.name === 'notifications' ?
            // @ts-ignore
            Promise.resolve({ state: Notification.permission as any }) :
            originalQuery(parameters)
        )
      })

      // Random delay before navigation (1-3 seconds)
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

      // Navigate to the page
      await page.goto(job.url, { 
        waitUntil: 'networkidle2',
        timeout: config.timeout || 30000
      })

      // Random delay after page load (1-2 seconds)
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000))

      // Wait for specific selector if configured (only if it's a valid CSS selector, not a load state)
      if (config.waitFor && !['networkidle0', 'networkidle2', 'domcontentloaded', 'load'].includes(config.waitFor)) {
        await page.waitForSelector(config.waitFor, { timeout: 10000 })
      }

      const allData: any[] = []
      let pagesScraped = 0
      const screenshots: string[] = []

      // Handle pagination
      const maxPages = config.pagination?.maxPages || 1
      let currentPage = 1

      while (currentPage <= maxPages) {
        console.log(`Scraping page ${currentPage} of ${maxPages}`)

        // Take screenshot if configured
        if (config.screenshot) {
          const screenshot = await page.screenshot({ 
            encoding: 'base64',
            fullPage: true 
          })
          screenshots.push(screenshot)
        }

        // Scrape data from current page
        const pageData = await this.scrapePageData(page, config.selectors)
        allData.push(...pageData)
        pagesScraped++

        // Notify progress via WebSocket
        broadcastToUser(userId, {
          type: 'scraping_progress',
          data: { 
            jobId: job.id, 
            executionId,
            currentPage,
            maxPages,
            dataPoints: allData.length
          }
        })

        // Check if we should continue to next page
        if (currentPage < maxPages) {
          const hasNextPage = await this.navigateToNextPage(page, config.pagination)
          if (!hasNextPage) {
            console.log('No more pages found, stopping pagination')
            break
          }
        }

        currentPage++

        // Add delay between pages
        if (config.delay && currentPage <= maxPages) {
          await new Promise(resolve => setTimeout(resolve, config.delay))
        }
      }

      // Save scraped data to database
      if (allData.length > 0) {
        await prisma.scrapedData.createMany({
          data: allData.map((data, index) => ({
            jobId: job.id,
            url: job.url,
            data: JSON.stringify(data),
            metadata: JSON.stringify({
              pageNumber: Math.floor(index / (allData.length / pagesScraped)) + 1,
              scrapedAt: new Date().toISOString()
            })
          }))
        })
      }

      return {
        success: true,
        data: allData,
        pagesScraped,
        dataPoints: allData.length,
        screenshots: screenshots.length > 0 ? screenshots : undefined
      }

    } finally {
      await page.close()
      this.activeJobs.delete(job.id)
    }
  }

  private async scrapePageData(page: Page, selectors: SelectorConfig[]): Promise<any[]> {
    const results: any[] = []

    for (const selector of selectors) {
      try {
        const elements = await page.$$(selector.selector)
        
        if (elements.length === 0) {
          if (selector.required) {
            console.warn(`Required selector not found: ${selector.selector}`)
          }
          continue
        }

        const selectorResults: any[] = []

        for (const element of elements) {
          let value: string | null = null

          try {
            switch (selector.type) {
              case 'text':
                value = await page.evaluate(el => el.textContent?.trim() || '', element)
                break
              case 'html':
                value = await page.evaluate(el => el.innerHTML, element)
                break
              case 'attribute':
                if (selector.attribute) {
                  value = await page.evaluate((el, attr) => el.getAttribute(attr) || '', element, selector.attribute)
                }
                break
              case 'link':
                value = await page.evaluate(el => el.href || '', element)
                break
              case 'image':
                value = await page.evaluate(el => el.src || el.getAttribute('data-src') || '', element)
                break
              case 'number':
                value = await page.evaluate(el => {
                  const text = el.textContent?.trim() || '';
                  const num = parseFloat(text.replace(/[^0-9.-]/g, ''));
                  return isNaN(num) ? '' : num.toString();
                }, element)
                break
              case 'date':
                value = await page.evaluate(el => {
                  const text = el.textContent?.trim() || '';
                  const date = new Date(text);
                  return isNaN(date.getTime()) ? text : date.toISOString();
                }, element)
                break
              case 'email':
                value = await page.evaluate(el => {
                  const text = el.textContent?.trim() || el.href || '';
                  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
                  return emailMatch ? emailMatch[1] : '';
                }, element)
                break
              case 'phone':
                value = await page.evaluate(el => {
                  const text = el.textContent?.trim() || el.href || '';
                  const phoneMatch = text.match(/(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/);
                  return phoneMatch ? phoneMatch[0] : '';
                }, element)
                break
              default:
                value = await page.evaluate(el => el.textContent?.trim() || '', element)
            }

            if (value !== null && value !== '') {
              selectorResults.push(value)
            }
          } catch (elementError) {
            console.warn(`Error extracting value from element for selector ${selector.selector}:`, elementError)
            continue
          }
        }

        if (selectorResults.length > 0) {
          if (selector.multiple) {
            results.push({ [selector.name]: selectorResults })
          } else {
            results.push({ [selector.name]: selectorResults[0] })
          }
        }

      } catch (error) {
        console.error(`Error scraping selector ${selector.selector}:`, error)
        if (selector.required) {
          throw new Error(`Failed to scrape required selector: ${selector.selector}`)
        }
      }
    }

    // Combine all selector results into a single data object
    const combinedData: any = {}
    results.forEach(result => {
      Object.assign(combinedData, result)
    })

    return combinedData ? [combinedData] : []
  }

  private async navigateToNextPage(page: Page, pagination?: any): Promise<boolean> {
    if (!pagination) return false

    try {
      // Try next button selector first
      if (pagination.nextButtonSelector) {
        const nextButton = await page.$(pagination.nextButtonSelector)
        if (nextButton) {
          const isDisabled = await page.evaluate(el => el.disabled, nextButton)
          if (!isDisabled) {
            await nextButton.click()
            await new Promise(resolve => setTimeout(resolve, 2000)) // Wait for page to load
            return true
          }
        }
      }

      // Try next page selector
      if (pagination.nextPageSelector) {
        const nextPageLink = await page.$(pagination.nextPageSelector)
        if (nextPageLink) {
          await nextPageLink.click()
          await new Promise(resolve => setTimeout(resolve, 2000)) // Wait for page to load
          return true
        }
      }

      return false
    } catch (error) {
      console.error('Error navigating to next page:', error)
      return false
    }
  }

  async stopJob(jobId: string): Promise<void> {
    const activeJob = this.activeJobs.get(jobId)
    if (activeJob) {
      await activeJob.page.close()
      this.activeJobs.delete(jobId)
    }
  }

  async getActiveJobs(): Promise<string[]> {
    return Array.from(this.activeJobs.keys())
  }
}

export const scrapingService = ScrapingService.getInstance()
