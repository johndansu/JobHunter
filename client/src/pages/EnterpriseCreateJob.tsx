import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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
  AlertCircle,
  Briefcase,
  Search
} from 'lucide-react'
import { jobService } from '@/services/jobService'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'

const smartJobSchema = z.object({
  name: z.string().min(1, 'Search name is required'),
  url: z.string().url('Invalid URL format').or(z.literal('')).optional(),
  description: z.string().min(10, 'Please describe what job you\'re looking for (at least 10 characters)'),
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
        url: data.url || 'https://multi-source.jobsearch', // Placeholder for multi-source search
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
    { site: 'Remote Jobs', url: 'https://remotive.com/', desc: 'Remote software engineer jobs with salary and benefits' },
    { site: 'Tech Jobs', url: 'https://www.themuse.com/', desc: 'Product manager positions in San Francisco' },
    { site: 'Job Search', url: 'https://news.ycombinator.com/jobs', desc: 'Senior developer jobs at startups, remote or hybrid' },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/dashboard" className="text-2xl font-bold text-slate-900">
              JobHunter <span className="text-teal-600">Pro</span>
            </Link>

            <nav className="hidden md:flex items-center space-x-8">
              <Link to="/dashboard" className="text-slate-600 hover:text-slate-900 font-medium">Dashboard</Link>
              <Link to="/jobs" className="text-slate-600 hover:text-slate-900 font-medium">Job Searches</Link>
              <Link to="/data" className="text-slate-600 hover:text-slate-900 font-medium">Results</Link>
              <Link to="/analytics" className="text-slate-600 hover:text-slate-900 font-medium">Analytics</Link>
              <Link to="/settings" className="text-slate-600 hover:text-slate-900 font-medium">Settings</Link>
              
              <div className="flex items-center space-x-4 ml-4 pl-4 border-l border-slate-200">
                <span className="text-sm text-slate-600">{user?.username}</span>
                <button
                  onClick={logout}
                  className="text-slate-600 hover:text-slate-900"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
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
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Start Job Search</h1>
                    <p className="text-slate-600 text-sm mt-1">Tell us what kind of job you're looking for</p>
          </div>
          
            {/* Job Search Info */}
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <Briefcase className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-teal-900 text-sm mb-1">🎯 Smart Job Aggregation</h4>
                  <p className="text-xs text-teal-800 mb-2">
                    We automatically search across <strong>multiple job boards and APIs</strong> to find the best opportunities for you.
                  </p>
                  <div className="text-xs text-teal-700">
                    <p><strong>✅ Instant Results:</strong> Remotive, The Muse, Adzuna, and more</p>
                    <p><strong>📊 Complete Info:</strong> Salary, location, type, and direct apply links</p>
                </div>
            </div>
          </div>
        </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Search Name */}
                    <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Search Name
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
                    
              {/* Website URL (Optional) */}
                    <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Website URL <span className="text-xs text-slate-500">(Optional - leave blank for multi-source search)</span>
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                    {...register('url')}
                        type="url"
                    placeholder="https://example.com (or leave blank to search all sources)"
                    className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                    </div>
                {errors.url && (
                  <p className="mt-1 text-sm text-red-600">{errors.url.message}</p>
                          )}
                        </div>
                        
              {/* Job Description */}
                          <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  What job are you looking for?
                </label>
                <textarea
                  {...register('description')}
                  rows={4}
                  placeholder="Example: Remote software engineer jobs with React and Node.js, salary above $100k, anywhere in US or remote"
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
                    <Search className="h-5 w-5" />
                    <span>Start Job Search</span>
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
