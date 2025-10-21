import { Job } from '../types'
import { scrapingService } from './scrapingService'
import { prisma } from '../utils/database'
import cron from 'node-cron'

export interface QueueJob {
  id: string
  jobId: string
  userId: string
  priority: number
  scheduledFor: Date
  retries: number
  maxRetries: number
}

export class JobQueue {
  private static instance: JobQueue
  private queue: QueueJob[] = []
  private processing = false
  private maxConcurrentJobs: number
  private activeJobs = new Set<string>()

  private constructor() {
    this.maxConcurrentJobs = parseInt(process.env.MAX_CONCURRENT_JOBS || '5')
    this.startProcessor()
    this.startScheduler()
  }

  static getInstance(): JobQueue {
    if (!JobQueue.instance) {
      JobQueue.instance = new JobQueue()
    }
    return JobQueue.instance
  }

  async addJob(jobId: string, userId: string, priority: number = 0, scheduledFor?: Date): Promise<void> {
    const queueJob: QueueJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      jobId,
      userId,
      priority,
      scheduledFor: scheduledFor || new Date(),
      retries: 0,
      maxRetries: 3
    }

    // Insert job in priority order (higher priority first)
    const insertIndex = this.queue.findIndex(job => job.priority < priority)
    if (insertIndex === -1) {
      this.queue.push(queueJob)
    } else {
      this.queue.splice(insertIndex, 0, queueJob)
    }

    console.log(`Job ${jobId} added to queue with priority ${priority}`)
  }

  async addScheduledJob(jobId: string, userId: string, cronExpression: string): Promise<void> {
    try {
      // Validate cron expression
      if (!cron.validate(cronExpression)) {
        throw new Error('Invalid cron expression')
      }

      // Schedule the job
      const task = cron.schedule(cronExpression, async () => {
        await this.addJob(jobId, userId, 1) // Scheduled jobs have priority 1
      }, {
        scheduled: true,
        timezone: 'UTC'
      })

      // Update job with next run time
      const nextRun = this.getNextCronRun(cronExpression)
      await prisma.job.update({
        where: { id: jobId },
        data: { nextRunAt: nextRun }
      })

      console.log(`Scheduled job ${jobId} with cron expression: ${cronExpression}`)
    } catch (error) {
      console.error('Error scheduling job:', error)
      throw error
    }
  }

  private getNextCronRun(cronExpression: string): Date {
    // This is a simplified implementation
    // In production, you'd want to use a proper cron parser
    const now = new Date()
    const nextRun = new Date(now.getTime() + 60000) // Default to 1 minute from now
    return nextRun
  }

  private startProcessor(): void {
    setInterval(async () => {
      if (!this.processing && this.queue.length > 0 && this.activeJobs.size < this.maxConcurrentJobs) {
        await this.processNextJob()
      }
    }, 1000) // Check every second
  }

  private async processNextJob(): Promise<void> {
    if (this.processing || this.queue.length === 0 || this.activeJobs.size >= this.maxConcurrentJobs) {
      return
    }

    this.processing = true

    try {
      // Find the next job to process
      const now = new Date()
      const jobIndex = this.queue.findIndex(job => job.scheduledFor <= now)
      
      if (jobIndex === -1) {
        this.processing = false
        return
      }

      const queueJob = this.queue.splice(jobIndex, 1)[0]
      this.activeJobs.add(queueJob.jobId)

      console.log(`Processing job ${queueJob.jobId}`)

      // Process the job
      try {
        await scrapingService.scrapeJob(queueJob.jobId, queueJob.userId)
        console.log(`Job ${queueJob.jobId} completed successfully`)
      } catch (error) {
        console.error(`Job ${queueJob.jobId} failed:`, error)
        
        // Retry logic
        if (queueJob.retries < queueJob.maxRetries) {
          queueJob.retries++
          queueJob.scheduledFor = new Date(Date.now() + (queueJob.retries * 60000)) // Exponential backoff
          this.queue.push(queueJob)
          console.log(`Job ${queueJob.jobId} scheduled for retry ${queueJob.retries}/${queueJob.maxRetries}`)
        } else {
          console.log(`Job ${queueJob.jobId} exceeded max retries, giving up`)
        }
      } finally {
        this.activeJobs.delete(queueJob.jobId)
      }

    } catch (error) {
      console.error('Error processing job:', error)
    } finally {
      this.processing = false
    }
  }

  private startScheduler(): void {
    // Check for scheduled jobs every minute
    setInterval(async () => {
      try {
        const scheduledJobs = await prisma.job.findMany({
          where: {
            status: 'PENDING',
            schedule: { not: null },
            nextRunAt: { lte: new Date() }
          }
        })

        for (const job of scheduledJobs) {
          if (job.schedule) {
            await this.addScheduledJob(job.id, job.userId, job.schedule)
          }
        }
      } catch (error) {
        console.error('Error checking scheduled jobs:', error)
      }
    }, 60000) // Check every minute
  }

  async getQueueStatus(): Promise<{
    queueLength: number
    activeJobs: number
    maxConcurrentJobs: number
    processing: boolean
  }> {
    return {
      queueLength: this.queue.length,
      activeJobs: this.activeJobs.size,
      maxConcurrentJobs: this.maxConcurrentJobs,
      processing: this.processing
    }
  }

  async getQueueJobs(): Promise<QueueJob[]> {
    return [...this.queue]
  }

  async cancelJob(jobId: string): Promise<boolean> {
    // Remove from queue
    const queueIndex = this.queue.findIndex(job => job.jobId === jobId)
    if (queueIndex !== -1) {
      this.queue.splice(queueIndex, 1)
      return true
    }

    // Stop active job
    if (this.activeJobs.has(jobId)) {
      await scrapingService.stopJob(jobId)
      this.activeJobs.delete(jobId)
      return true
    }

    return false
  }

  async clearQueue(): Promise<void> {
    this.queue = []
    this.activeJobs.clear()
  }
}

export const jobQueue = JobQueue.getInstance()
