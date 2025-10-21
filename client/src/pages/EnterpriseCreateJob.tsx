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
  Globe,
  Clock,
  LogOut,
  User,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { jobService } from '@/services/jobService'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'

const smartJobSchema = z.object({
  name: z.string().min(1, 'Job name is required'),
  url: z.string().url('Invalid URL format'),
  description: z.string().min(10, 'Describe what you want to scrape'),
  schedule: z.string().optional(),
})

type SmartJobForm = z.infer<typeof smartJobSchema>

export default function EnterpriseCreateJob() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, logout } = useAuthStore()
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

    const jobData = {
        name: data.name,
        description: data.description,
        url: data.url,
      config: {
          smartMode: true,
          extractionHints: data.description,
          selectors: [
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
      
      toast.success('Job created successfully!')
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
  const nameValue = watch('name')

  // Quick examples (using sites that are less likely to block)
  const examples = [
    { site: 'Hacker News', url: 'https://news.ycombinator.com/', desc: 'Extract post titles, authors, points, and comments' },
    { site: 'Reddit Posts', url: 'https://old.reddit.com/r/programming', desc: 'Get post titles, authors, upvotes, and links' },
    { site: 'Product Hunt', url: 'https://www.producthunt.com/', desc: 'Scrape product names, descriptions, votes, and makers' },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 bg-teal-600 rounded-full flex items-center justify-center">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xl font-bold text-slate-900">ScrapePro</span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <User className="h-4 w-4" />
                <span>{user?.username}</span>
              </div>
              <button
                onClick={logout}
                className="flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>

        {/* Side by Side Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Side - Form */}
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900">Create Scraping Job</h1>
              <p className="text-slate-600 text-sm mt-1">Describe what you want to scrape</p>
        </div>

            {/* Protected Sites Warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-amber-900 text-sm mb-1">⚠️ Protected Sites</h4>
                  <p className="text-xs text-amber-800 mb-2">
                    Sites like <strong>Indeed, LinkedIn, Amazon</strong> use Cloudflare and will block scraping from your IP.
                  </p>
                  <div className="text-xs text-amber-700">
                    <p><strong>✅ Works:</strong> News, blogs, public directories, small sites</p>
                    <p><strong>❌ Blocked:</strong> Major job boards, social media, big e-commerce</p>
                  </div>
                </div>
              </div>
        </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Job Name */}
                    <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Job Name
                </label>
                      <input
                  {...register('name')}
                        type="text"
                  placeholder="e.g., Remote Developer Jobs"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
                    </div>
                    
              {/* Website URL */}
                    <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Website URL
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                    {...register('url')}
                        type="url"
                    placeholder="https://example.com"
                    className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                {errors.url && (
                  <p className="mt-1 text-sm text-red-600">{errors.url.message}</p>
                          )}
                        </div>
                        
              {/* Description */}
                          <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  What to scrape
                </label>
                <textarea
                  {...register('description')}
                  rows={4}
                  placeholder="Extract job titles, company names, locations, and salaries"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                )}
                          </div>
                          
              {/* Schedule */}
                          <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Schedule
                </label>
                            <select
                  {...register('schedule')}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                >
                  <option value="">Run once</option>
                  <option value="0 * * * *">Every hour</option>
                  <option value="0 */6 * * *">Every 6 hours</option>
                  <option value="0 0 * * *">Daily</option>
                  <option value="0 0 * * 1">Weekly</option>
                            </select>
                          </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
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
            </form>
                        </div>
                        
          {/* Right Side - Preview/Results */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 h-fit sticky top-24">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Preview</h3>
            
            {/* Job Preview */}
            {(nameValue || urlValue || descriptionValue) ? (
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {nameValue || 'Job Name'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {urlValue || 'Website URL'}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <p className="text-xs font-medium text-slate-700 mb-2">Will extract:</p>
                  <p className="text-sm text-slate-600">
                    {descriptionValue || 'Data description will appear here'}
                  </p>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <p className="text-xs text-slate-500">
                    Scraping will start automatically after creation
                  </p>
                </div>
                          </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start space-x-3 text-slate-400">
                  <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">Fill in the form to see a preview</p>
                </div>

                {/* Quick Examples */}
                <div className="border-t border-slate-200 pt-4">
                  <p className="text-xs font-medium text-slate-700 mb-3">Quick examples:</p>
                  <div className="space-y-2">
                    {examples.map((ex, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const form = document.querySelector('form');
                          if (form) {
                            const nameInput = form.querySelector('input[type="text"]') as HTMLInputElement;
                            const urlInput = form.querySelector('input[type="url"]') as HTMLInputElement;
                            const textarea = form.querySelector('textarea') as HTMLTextAreaElement;
                            
                            if (nameInput) {
                              nameInput.value = `${ex.site} Scraper`;
                              nameInput.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                            if (urlInput) {
                              urlInput.value = ex.url;
                              urlInput.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                            if (textarea) {
                              textarea.value = ex.desc;
                              textarea.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                          }
                        }}
                        className="w-full text-left p-3 border border-slate-200 rounded-lg hover:border-teal-300 hover:bg-teal-50 transition-all text-xs"
                      >
                        <p className="font-medium text-slate-900">{ex.site}</p>
                        <p className="text-slate-600 mt-1">{ex.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
