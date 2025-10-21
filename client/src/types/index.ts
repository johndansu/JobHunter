export interface User {
  id: string
  email: string
  username: string
  firstName?: string
  lastName?: string
  name?: string
  company?: string
  phone?: string
  role: 'ADMIN' | 'USER'
  isActive: boolean
  createdAt: string
  updatedAt: string
  user?: User // For nested user objects
}

export interface Job {
  id: string
  name: string
  description?: string
  url: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PAUSED' | 'CANCELLED'
  config: ScrapingConfig
  schedule?: string
  userId: string
  createdAt: string
  updatedAt: string
  lastRunAt?: string
  nextRunAt?: string
  executions?: JobExecution[]
  scrapedData?: ScrapedData[]
  _count?: {
    executions: number
    scrapedData: number
  }
}

export interface ScrapingConfig {
  selectors: SelectorConfig[]
  pagination?: PaginationConfig
  waitFor?: string
  timeout?: number
  userAgent?: string
  headers?: Record<string, string>
  cookies?: Record<string, string>
  screenshot?: boolean
  delay?: number
}

export interface SelectorConfig {
  name: string
  selector: string
  type: 'text' | 'html' | 'attribute' | 'link' | 'image' | 'number' | 'date' | 'email' | 'phone'
  attribute?: string
  required?: boolean
  multiple?: boolean
}

export interface PaginationConfig {
  nextButtonSelector?: string
  nextPageSelector?: string
  maxPages?: number
  waitForLoad?: string
}

export interface JobExecution {
  id: string
  jobId: string
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  startedAt: string
  completedAt?: string
  duration?: number
  pagesScraped: number
  dataPoints: number
  error?: string
  logs?: any[]
  job?: {
    name: string
    url: string
  }
}

export interface ScrapedData {
  id: string
  jobId: string
  url: string
  data: any
  metadata?: any
  scrapedAt: string
  createdAt?: string
  updatedAt?: string
  job?: {
    name: string
    url: string
  }
}

export interface DataQueryParams {
  page?: number
  limit?: number
  jobId?: string
  search?: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  total?: number
  hasMore?: boolean
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  username: string
  password: string
  firstName?: string
  lastName?: string
}

export interface CreateJobRequest {
  name: string
  description?: string
  url: string
  config: ScrapingConfig
  schedule?: string
}

export interface UpdateJobRequest {
  name?: string
  description?: string
  url?: string
  config?: ScrapingConfig
  schedule?: string
  status?: Job['status']
}

export interface JobStats {
  totalJobs: number
  activeJobs: number
  completedJobs: number
  failedJobs: number
  totalDataPoints: number
  totalPagesScraped: number
  averageExecutionTime: number
}

export interface UserStats {
  jobs: {
    total: number
    active: number
    completed: number
    failed: number
  }
  data: {
    totalExecutions: number
    totalDataPoints: number
    averageExecutionTime: number
  }
  recentExecutions: JobExecution[]
}

export interface DashboardStats {
  jobs: JobStats
  recentExecutions: JobExecution[]
  recentData: ScrapedData[]
  systemHealth: {
    status: 'healthy' | 'warning' | 'error'
    uptime: number
    memoryUsage: number
    cpuUsage: number
  }
}
