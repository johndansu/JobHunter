import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { 
  Loader2, 
  Zap,
  ArrowLeft,
  Sparkles,
  Settings2,
  Globe,
  Clock
} from 'lucide-react'
import { jobService } from '@/services/jobService'
import toast from 'react-hot-toast'

// Simple schema for Smart Mode
const smartJobSchema = z.object({
  name: z.string().min(1, 'Job name is required'),
  url: z.string().url('Invalid URL format'),
  description: z.string().min(10, 'Please describe what you want to scrape (at least 10 characters)'),
  schedule: z.string().optional(),
})

type SmartJobForm = z.infer<typeof smartJobSchema>

export default function CreateJob() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, formState: { errors }, watch } = useForm<SmartJobForm>({
    resolver: zodResolver(smartJobSchema),
    defaultValues: {
      name: '',
      url: '',
      description: '',
      schedule: '',
    }
  })

  const onSubmit = async (data: SmartJobForm) => {
    try {
      setIsLoading(true)
      
      // Convert the simple description into intelligent selectors
      // The backend scraping service will use smart extraction based on the description
      const jobData = {
        name: data.name,
        description: data.description,
        url: data.url,
        config: {
          // Smart mode: Let the scraper intelligently extract based on description
          smartMode: true,
          extractionHints: data.description,
          selectors: [
            // Fallback generic selectors - the scraper will be intelligent
            {
              name: 'Content',
              selector: 'body',
              type: 'text' as const,
              required: false,
              multiple: false
            }
          ],
          timeout: 30000,
          waitFor: 'networkidle2',
        },
        schedule: data.schedule || undefined,
      }

      await jobService.createJob(jobData as any)
      
      toast.success('Scraping job created successfully!')
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      navigate('/jobs')
    } catch (error: any) {
      console.error('Create job error:', error)
      toast.error(error.response?.data?.error || 'Failed to create job')
    } finally {
      setIsLoading(false)
    }
  }

  const urlValue = watch('url')
  const descriptionValue = watch('description')

  // Quick example suggestions
  const exampleDescriptions = [
    {
      category: 'Job Listings',
      icon: '💼',
      examples: [
        'Extract all job titles, company names, locations, salary ranges, and whether they are remote/hybrid/onsite',
        'Get all developer job postings with salary information and required skills',
      ]
    },
    {
      category: 'E-commerce',
      icon: '🛍️',
      examples: [
        'Scrape product names, prices, ratings, and availability status',
        'Get all product titles, images, prices, and customer review counts',
      ]
    },
    {
      category: 'Real Estate',
      icon: '🏠',
      examples: [
        'Extract property listings with prices, addresses, bedrooms, bathrooms, and square footage',
        'Get all house prices, locations, and property features',
      ]
    },
    {
      category: 'News & Articles',
      icon: '📰',
      examples: [
        'Extract article headlines, authors, publication dates, and full text content',
        'Get all news titles, summaries, and publication timestamps',
      ]
    },
  ]

  const popularSites = [
    { name: 'Indeed Jobs', url: 'https://www.indeed.com/jobs?q=developer' },
    { name: 'LinkedIn Jobs', url: 'https://www.linkedin.com/jobs/search/?keywords=developer' },
    { name: 'Amazon Products', url: 'https://www.amazon.com/s?k=laptop' },
    { name: 'Zillow Homes', url: 'https://www.zillow.com/homes/' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-slate-600 hover:text-slate-900 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Create Scraping Job</h1>
              <p className="text-slate-600 mt-1">Just tell us what you want to scrape - no technical skills needed</p>
            </div>
          </div>
        </div>

        {/* Smart Mode Info Banner */}
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl p-6 mb-8 text-white shadow-lg">
          <div className="flex items-start space-x-4">
            <div className="h-10 w-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">AI-Powered Smart Scraping</h3>
              <p className="text-teal-50 text-sm leading-relaxed">
                Our intelligent scraper understands what you want in plain English. No need to learn CSS selectors or technical stuff. 
                Just describe what data you want, and we'll extract it automatically!
              </p>
            </div>
          </div>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-xl shadow-xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Job Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Job Name *
              </label>
              <input
                {...register('name')}
                type="text"
                placeholder="e.g., Remote Developer Jobs, Laptop Prices, Tech News"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              />
              {errors.name && (
                <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Website URL */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Website URL *
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  {...register('url')}
                  type="url"
                  placeholder="https://example.com/search?q=your+query"
                  className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
              </div>
              {errors.url && (
                <p className="mt-2 text-sm text-red-600">{errors.url.message}</p>
              )}
              
              {/* Quick URL Examples */}
              {!urlValue && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-slate-600">Quick examples:</p>
                  <div className="flex flex-wrap gap-2">
                    {popularSites.map((site) => (
                      <button
                        key={site.name}
                        type="button"
                        onClick={() => {
                          const urlInput = document.querySelector('input[type="url"]') as HTMLInputElement
                          if (urlInput) {
                            urlInput.value = site.url
                            urlInput.dispatchEvent(new Event('input', { bubbles: true }))
                          }
                        }}
                        className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-teal-100 text-slate-700 hover:text-teal-700 rounded-lg transition-colors"
                      >
                        {site.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Description (Smart Instructions) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                What do you want to scrape? *
              </label>
              <textarea
                {...register('description')}
                rows={4}
                placeholder="Describe in plain English what information you want to extract...&#10;&#10;Example: 'Extract all job titles, company names, locations, salary ranges, and whether positions are remote, hybrid, or onsite'"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all resize-none"
              />
              {errors.description && (
                <p className="mt-2 text-sm text-red-600">{errors.description.message}</p>
              )}
              
              <div className="mt-2 text-xs text-slate-500">
                💡 Tip: Be specific about what data points you need. The more details, the better results!
              </div>
            </div>

            {/* Example Descriptions */}
            {!descriptionValue && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center">
                  <Sparkles className="h-4 w-4 mr-2 text-teal-600" />
                  Example Descriptions by Category
                </h4>
                <div className="space-y-4">
                  {exampleDescriptions.map((category) => (
                    <div key={category.category}>
                      <p className="text-xs font-semibold text-slate-600 mb-2">
                        {category.icon} {category.category}
                      </p>
                      <div className="space-y-2">
                        {category.examples.map((example, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              const textarea = document.querySelector('textarea') as HTMLTextAreaElement
                              if (textarea) {
                                textarea.value = example
                                textarea.dispatchEvent(new Event('input', { bubbles: true }))
                              }
                            }}
                            className="w-full text-left text-xs px-3 py-2 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-lg transition-colors text-slate-600 hover:text-teal-700"
                          >
                            "{example}"
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Schedule (Optional) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <Clock className="inline h-4 w-4 mr-1" />
                Schedule (Optional)
              </label>
              <select
                {...register('schedule')}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all bg-white"
              >
                <option value="">Run once (no schedule)</option>
                <option value="0 * * * *">Every hour</option>
                <option value="0 */6 * * *">Every 6 hours</option>
                <option value="0 */12 * * *">Every 12 hours</option>
                <option value="0 0 * * *">Daily at midnight</option>
                <option value="0 0 * * 1">Weekly (Monday)</option>
                <option value="0 0 1 * *">Monthly</option>
              </select>
              <p className="mt-2 text-xs text-slate-500">
                Choose how often to automatically re-run this scraping job
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={() => navigate('/jobs')}
                className="px-6 py-3 text-slate-700 hover:text-slate-900 font-medium transition-colors"
              >
                Cancel
              </button>
              
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/professional/create-job')}
                  className="flex items-center space-x-2 px-4 py-3 text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Settings2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Advanced Mode</span>
                </button>
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg hover:from-teal-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl font-medium"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5" />
                      <span>Create Job</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Feature Highlights */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <div className="h-8 w-8 bg-teal-100 rounded-lg flex items-center justify-center mb-3">
              <Sparkles className="h-4 w-4 text-teal-600" />
            </div>
            <h4 className="font-semibold text-slate-900 mb-1">AI-Powered</h4>
            <p className="text-xs text-slate-600">
              Smart extraction understands your description automatically
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <div className="h-8 w-8 bg-teal-100 rounded-lg flex items-center justify-center mb-3">
              <Globe className="h-4 w-4 text-teal-600" />
            </div>
            <h4 className="font-semibold text-slate-900 mb-1">Any Website</h4>
            <p className="text-xs text-slate-600">
              Works with job boards, e-commerce, real estate, news, and more
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <div className="h-8 w-8 bg-teal-100 rounded-lg flex items-center justify-center mb-3">
              <Clock className="h-4 w-4 text-teal-600" />
            </div>
            <h4 className="font-semibold text-slate-900 mb-1">Auto Schedule</h4>
            <p className="text-xs text-slate-600">
              Set it to run hourly, daily, or weekly - completely automated
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
