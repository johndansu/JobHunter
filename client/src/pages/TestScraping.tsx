import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Play, Loader2, ExternalLink } from 'lucide-react'
import { jobService } from '@/services/jobService'
import toast from 'react-hot-toast'

const testScrapingSchema = z.object({
  url: z.string().url('Invalid URL format'),
  selectors: z.string().min(1, 'At least one selector is required'),
})

type TestScrapingForm = z.infer<typeof testScrapingSchema>

const TestScraping = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [testJobId, setTestJobId] = useState<string | null>(null)
  const [selectedTest, setSelectedTest] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<TestScrapingForm>({
    resolver: zodResolver(testScrapingSchema),
    defaultValues: {
      url: 'https://quotes.toscrape.com',
      selectors: 'quote, .quote'
    }
  })

  const onSubmit = async (data: TestScrapingForm) => {
    setIsLoading(true)
    try {
      // Create a test job
      const job = await jobService.createJob({
        name: `Test Scraping - ${new Date().toLocaleString()}`,
        description: 'Quick test of scraping functionality',
        url: data.url,
        config: {
          selectors: data.selectors.split(',').map(selector => {
            const trimmed = selector.trim();
            // Check if it's in format "name:selector"
            const colonIndex = trimmed.indexOf(':');
            if (colonIndex > 0) {
              return {
                name: trimmed.substring(0, colonIndex).trim(),
                selector: trimmed.substring(colonIndex + 1).trim(),
                type: 'text' as const,
                required: false,
                multiple: true
              };
            }
            // Fallback to old format
            return {
              name: trimmed.replace(/[.#]/g, '_').replace(/\s+/g, '_'),
              selector: trimmed,
              type: 'text' as const,
              required: false,
              multiple: true
            };
          }),
          timeout: 30000,
          delay: 1000,
          screenshot: true
        }
      })

      setTestJobId(job.id)
      
      // Start the job
      await jobService.startJob(job.id)
      
      toast.success('Test job created and started! Check the Jobs page to see progress.')
    } catch (error) {
      console.error('Test scraping error:', error)
      toast.error('Failed to start test scraping')
    } finally {
      setIsLoading(false)
    }
  }

  const quickTests = [
    {
      name: 'E-commerce Products',
      url: 'https://books.toscrape.com',
      selectors: 'product_title:h3 a, product_price:.price_color, product_rating:.star-rating, product_image:img@src',
      description: 'Scrape e-commerce products: titles, prices, ratings, and images'
    },
    {
      name: 'News Articles',
      url: 'https://quotes.toscrape.com',
      selectors: 'article_text:.quote .text, article_author:.quote .author, article_tags:.quote .tag',
      description: 'Scrape news articles: text, authors, and tags'
    },
    {
      name: 'Tech News',
      url: 'https://news.ycombinator.com',
      selectors: 'headline:.titleline a, score:.score, comments:.subline a[href*="item"], user:.hnuser',
      description: 'Scrape tech news: headlines, scores, comments, and users'
    },
    {
      name: 'Product Reviews',
      url: 'https://httpbin.org/html',
      selectors: 'review_title:h1, review_content:p, review_rating:.rating',
      description: 'Scrape product reviews and ratings'
    },
    {
      name: 'Real Estate',
      url: 'https://example.com',
      selectors: 'property_title:h1, property_description:p, property_price:.price',
      description: 'Scrape real estate listings and details'
    },
    {
      name: 'Job Listings',
      url: 'https://en.wikipedia.org/wiki/Special:Random',
      selectors: 'job_title:h1, job_description:p, job_location:.location',
      description: 'Scrape job postings and requirements'
    },
    {
      name: 'Social Media Posts',
      url: 'https://books.toscrape.com/catalogue/page-2.html',
      selectors: 'post_content:h3, post_author:.author, post_date:.date',
      description: 'Scrape social media posts and engagement'
    },
    {
      name: 'Financial Data',
      url: 'https://quotes.toscrape.com/tag/humor/',
      selectors: 'stock_symbol:.quote .text, stock_price:.quote .author, stock_change:.quote .tag',
      description: 'Scrape financial data and stock information'
    },
    {
      name: 'Research Papers',
      url: 'https://httpbin.org/json',
      selectors: 'paper_title:h1, paper_abstract:p, paper_authors:.authors',
      description: 'Scrape academic papers and research data'
    }
  ]

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div>
            <h1 className="page-title">Test Scraping</h1>
            <p className="page-subtitle">Quickly test the scraping functionality with pre-configured examples</p>
          </div>
        </div>
      </div>

      <div className="page-content">
        <div className="max-w-4xl mx-auto space-y-6">

      {/* Quick Test Examples */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-text-primary mb-4">Quick Test Examples</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickTests.map((test, index) => (
            <div
              key={index}
              className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                selectedTest === test.name 
                  ? 'border-primary-500 bg-primary-50' 
                  : 'border-border hover:border-primary-300'
              }`}
              onClick={() => {
                // Set form values using React Hook Form
                setValue('url', test.url)
                setValue('selectors', test.selectors)
                setSelectedTest(test.name)
              }}
            >
              <h4 className="font-medium text-text-primary mb-2">{test.name}</h4>
              <p className="text-sm text-text-muted mb-2">{test.description}</p>
              <div className="flex items-center text-xs text-primary-500">
                <ExternalLink className="h-3 w-3 mr-1" />
                {test.url}
              </div>
            </div>
          ))}
        </div>
        
        {/* Current Selection Display */}
        {selectedTest && (
          <div className="mt-4 p-4 bg-success/10 border border-success/20 rounded-lg">
            <div className="flex items-center space-x-2 text-success">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <span className="font-medium">Selected: {selectedTest}</span>
            </div>
            <div className="mt-2 text-sm text-success">
              <div><strong>URL:</strong> {watch('url')}</div>
              <div><strong>Selectors:</strong> {watch('selectors')}</div>
            </div>
          </div>
        )}
      </div>

      {/* Test Form */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-text-primary mb-4">
          {selectedTest ? `Test: ${selectedTest}` : 'Custom Test'}
        </h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Website URL</label>
            <input
              {...register('url')}
              type="url"
              className="input mt-1"
              placeholder="https://example.com"
            />
            {errors.url && (
              <p className="mt-1 text-sm text-error">{errors.url.message}</p>
            )}
          </div>

          <div>
            <label className="label">CSS Selectors (comma-separated)</label>
            <input
              {...register('selectors')}
              type="text"
              className="input mt-1"
              placeholder="quote_text:.quote .text, quote_author:.quote .author"
            />
            <p className="mt-1 text-xs text-text-muted">
              Use format "name:selector" for custom field names, or just "selector" for auto-generated names. Separate with commas.
            </p>
            {errors.selectors && (
              <p className="mt-1 text-sm text-error">{errors.selectors.message}</p>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Test...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Test Scraping
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Instructions */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-text-primary mb-4">How to Test</h3>
        <div className="space-y-3 text-sm text-text-muted">
          <div className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-medium">1</span>
            <p>Click on one of the quick test examples above, or enter your own URL and selectors</p>
          </div>
          <div className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-medium">2</span>
            <p>Click "Start Test Scraping" to create and run a test job</p>
          </div>
          <div className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-medium">3</span>
            <p>Go to the Jobs page to see the scraping progress in real-time</p>
          </div>
          <div className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-medium">4</span>
            <p>View the scraped data in the Data page once the job completes</p>
          </div>
        </div>
      </div>

      {testJobId && (
        <div className="card p-6 bg-green-50 border-green-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Play className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h4 className="font-medium text-green-800">Test Job Created!</h4>
              <p className="text-sm text-green-600">
                Job ID: {testJobId} - Check the Jobs page to monitor progress
              </p>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  )
}

export default TestScraping
