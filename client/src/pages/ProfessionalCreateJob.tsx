import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { 
  Plus, 
  Trash2, 
  Loader2, 
  ArrowLeft,
  Zap,
  Globe,
  Settings,
  Database,
  CheckCircle,
  X
} from 'lucide-react'
import { jobService } from '@/services/jobService'
import toast from 'react-hot-toast'

const createJobSchema = z.object({
  name: z.string().min(1, 'Job name is required'),
  description: z.string().optional(),
  url: z.string().url('Invalid URL format'),
  config: z.object({
    selectors: z.array(z.object({
      name: z.string().min(1, 'Selector name is required'),
      selector: z.string().min(1, 'CSS selector is required'),
      type: z.enum(['text', 'html', 'attribute', 'link', 'image', 'number', 'date', 'email', 'phone']),
      attribute: z.string().optional(),
      required: z.boolean().optional(),
      multiple: z.boolean().optional(),
    })).min(1, 'At least one selector is required'),
    pagination: z.object({
      nextButtonSelector: z.string().optional(),
      nextPageSelector: z.string().optional(),
      maxPages: z.number().optional(),
      waitForLoad: z.string().optional(),
    }).optional(),
    waitFor: z.string().optional(),
    timeout: z.number().optional(),
    userAgent: z.string().optional(),
    headers: z.record(z.string()).optional(),
    cookies: z.record(z.string()).optional(),
    screenshot: z.boolean().optional(),
    delay: z.number().optional(),
  }),
  schedule: z.string().optional(),
})

type CreateJobForm = z.infer<typeof createJobSchema>

const ProfessionalCreateJob = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    setValue,
    reset
  } = useForm<CreateJobForm>({
    resolver: zodResolver(createJobSchema),
    defaultValues: {
      name: '',
      description: '',
      url: '',
      config: {
        selectors: [
          { name: 'title', selector: 'h1, h2, .title', type: 'text', required: true, multiple: false },
          { name: 'content', selector: 'p, .content', type: 'text', required: false, multiple: true }
        ],
        pagination: {
          maxPages: 1
        }
      },
      schedule: null
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'config.selectors'
  })

  const onSubmit = async (data: CreateJobForm) => {
    setIsLoading(true)
    try {
      await jobService.createJob({
        name: data.name!,
        url: data.url!,
        description: data.description,
        config: data.config as any,
        schedule: data.schedule || undefined
      })
      toast.success('Scraping job created successfully!')
      // Invalidate jobs cache to refresh the jobs list
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['user-stats'] })
      navigate('/jobs')
    } catch (error) {
      console.error('Create job error:', error)
      toast.error('Failed to create job. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const templates = [
    {
      name: 'E-commerce Products',
      icon: Database,
      description: 'Extract product information from online stores',
      selectors: [
        { name: 'product_title', selector: 'h1, .product-title, [data-testid="product-title"]', type: 'text' as const, required: true, multiple: false },
        { name: 'product_price', selector: '.price, .product-price, [data-testid="price"]', type: 'number' as const, required: true, multiple: false },
        { name: 'product_image', selector: '.product-image img, .product-photo img', type: 'image' as const, required: false, multiple: false },
        { name: 'product_description', selector: '.product-description, .description', type: 'text' as const, required: false, multiple: false }
      ]
    },
    {
      name: 'News Articles',
      icon: Globe,
      description: 'Scrape news articles and blog posts',
      selectors: [
        { name: 'article_title', selector: 'h1, .article-title, .headline', type: 'text' as const, required: true, multiple: false },
        { name: 'article_content', selector: '.article-content, .post-content, .entry-content', type: 'text' as const, required: true, multiple: false },
        { name: 'article_author', selector: '.author, .byline, [rel="author"]', type: 'text' as const, required: false, multiple: false },
        { name: 'publish_date', selector: '.publish-date, .date, time', type: 'date' as const, required: false, multiple: false }
      ]
    },
    {
      name: 'Contact Information',
      icon: Zap,
      description: 'Extract contact details and business info',
      selectors: [
        { name: 'business_name', selector: '.business-name, .company-name, h1', type: 'text' as const, required: true, multiple: false },
        { name: 'phone_number', selector: 'a[href^="tel:"], .phone, .contact-phone', type: 'phone' as const, required: false, multiple: true },
        { name: 'email_address', selector: 'a[href^="mailto:"], .email, .contact-email', type: 'email' as const, required: false, multiple: true },
        { name: 'business_address', selector: '.address, .location, .contact-address', type: 'text' as const, required: false, multiple: false }
      ]
    }
  ]

  const steps = [
    { number: 1, title: 'Basic Info', description: 'Job name and target URL' },
    { number: 2, title: 'Data Fields', description: 'Configure what to extract' },
    { number: 3, title: 'Advanced', description: 'Pagination and settings' },
    { number: 4, title: 'Review', description: 'Confirm and create' }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface border-b border-border px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/jobs')}
              className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-text-muted" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-text-primary">Create Scraping Job</h1>
              <p className="text-text-muted mt-1">Configure a new data extraction job</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.number 
                    ? 'bg-primary-600 border-primary-600 text-white' 
                    : 'bg-surface border-border text-text-muted'
                }`}>
                  {currentStep > step.number ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <span className="font-semibold">{step.number}</span>
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    currentStep >= step.number ? 'text-text-primary' : 'text-text-muted'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-text-muted">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-4 ${
                    currentStep > step.number ? 'bg-primary-600' : 'bg-border'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="card p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-text-primary mb-2">Basic Information</h2>
                <p className="text-text-muted">Provide the basic details for your scraping job</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Job Name *
                  </label>
                  <input
                    {...register('name')}
                    type="text"
                    className="input w-full"
                    placeholder="e.g., Extract Product Data from Amazon"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-error">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Describe what this job will extract..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target URL *
                  </label>
                  <input
                    {...register('url')}
                    type="url"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="https://example.com/products"
                  />
                  {errors.url && (
                    <p className="mt-1 text-sm text-red-600">{errors.url.message}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end mt-8">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="btn btn-primary px-6 py-3 rounded-lg font-semibold"
                >
                  Next: Configure Data Fields
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Data Fields */}
          {currentStep === 2 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Data Fields Configuration</h2>
                <p className="text-gray-600">Define what data you want to extract from the website</p>
              </div>

              {/* Templates */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Templates</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {templates.map((template, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        reset({
                          ...watch(),
                          config: {
                            ...watch('config'),
                            selectors: template.selectors
                          }
                        })
                        setValue('config.selectors', template.selectors)
                      }}
                      className="p-4 border border-gray-200 rounded-lg hover:border-teal-300 hover:bg-teal-50 cursor-pointer transition-all"
                    >
                      <div className="flex items-center mb-2">
                        <template.icon className="h-5 w-5 text-teal-600 mr-2" />
                        <span className="font-medium text-gray-900">{template.name}</span>
                      </div>
                      <p className="text-sm text-gray-600">{template.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Manual Configuration */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Custom Fields</h3>
                  <button
                    type="button"
                    onClick={() => append({ name: '', selector: '', type: 'text', required: false, multiple: false })}
                    className="bg-teal-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-teal-700 transition-colors flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field
                  </button>
                </div>

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Field Name
                          </label>
                          <input
                            {...register(`config.selectors.${index}.name`)}
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            placeholder="e.g., product_title"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            CSS Selector
                          </label>
                          <input
                            {...register(`config.selectors.${index}.selector`)}
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            placeholder="e.g., h1, .title"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Data Type
                          </label>
                          <select
                            {...register(`config.selectors.${index}.type`)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                            <option value="email">Email</option>
                            <option value="phone">Phone</option>
                            <option value="link">Link</option>
                            <option value="image">Image</option>
                            <option value="html">HTML</option>
                            <option value="attribute">Attribute</option>
                          </select>
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
                >
                  Next: Advanced Settings
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Advanced Settings */}
          {currentStep === 3 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Advanced Settings</h2>
                <p className="text-gray-600">Configure pagination and browser settings</p>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Pagination Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Next Page Selector
                      </label>
                      <input
                        {...register('config.pagination.nextPageSelector')}
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        placeholder="e.g., .next, a[rel='next']"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Pages
                      </label>
                      <input
                        {...register('config.pagination.maxPages', { valueAsNumber: true })}
                        type="number"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        placeholder="10"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Browser Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Wait Time (seconds)
                      </label>
                      <input
                        {...register('config.delay', { valueAsNumber: true })}
                        type="number"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        placeholder="2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timeout (seconds)
                      </label>
                      <input
                        {...register('config.timeout', { valueAsNumber: true })}
                        type="number"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        placeholder="30"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
                >
                  Next: Review & Create
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review & Create */}
          {currentStep === 4 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Review & Create</h2>
                <p className="text-gray-600">Review your configuration before creating the job</p>
              </div>

              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Job Summary</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="font-medium text-gray-700">Name:</span>
                      <span className="ml-2 text-gray-900">{watch('name')}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">URL:</span>
                      <span className="ml-2 text-gray-900">{watch('url')}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Data Fields:</span>
                      <span className="ml-2 text-gray-900">{fields.length} configured</span>
                    </div>
                  </div>
                </div>

                <div className="bg-teal-50 rounded-lg p-6">
                  <div className="flex items-start">
                    <Settings className="h-5 w-5 text-teal-600 mt-0.5 mr-3" />
                    <div>
                      <h4 className="font-medium text-teal-900">Ready to Create</h4>
                      <p className="text-teal-700 text-sm mt-1">
                        Your scraping job is configured and ready to run. Click create to start extracting data.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Job...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Create Scraping Job
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

export default ProfessionalCreateJob
