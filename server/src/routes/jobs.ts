import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/database';
import { authenticateToken } from '../middleware/auth';
import { ApiResponse, CreateJobRequest, UpdateJobRequest, PaginatedResponse } from '../types';
import { jobQueue } from '../services/jobQueue';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Validation schemas
const createJobSchema = z.object({
  name: z.string().min(1, 'Job name is required'),
  description: z.string().optional(),
  url: z.string().url('Invalid URL format'),
  config: z.object({
    selectors: z.array(z.object({
      name: z.string(),
      selector: z.string(),
      type: z.enum(['text', 'html', 'attribute', 'link', 'image', 'number', 'date', 'email', 'phone']),
      attribute: z.string().optional(),
      required: z.boolean().optional(),
      multiple: z.boolean().optional()
    })),
    pagination: z.object({
      nextButtonSelector: z.string().optional(),
      nextPageSelector: z.string().optional(),
      maxPages: z.number().optional(),
      waitForLoad: z.string().optional()
    }).optional(),
    waitFor: z.string().optional(),
    timeout: z.number().optional(),
    userAgent: z.string().optional(),
    headers: z.record(z.string()).optional(),
    cookies: z.record(z.string()).optional(),
    screenshot: z.boolean().optional(),
    delay: z.number().optional()
  }),
  schedule: z.string().optional()
});

const updateJobSchema = createJobSchema.partial();

// Get all jobs for the authenticated user
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const skip = (page - 1) * limit;

    const where: any = {
      userId: req.user!.id
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { url: { contains: search } }
      ];
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          executions: {
            take: 1,
            orderBy: { startedAt: 'desc' }
          },
          _count: {
            select: {
              executions: true,
              scrapedData: true
            }
          }
        }
      }),
      prisma.job.count({ where })
    ]);

    const response: PaginatedResponse<any> = {
      success: true,
      data: jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Get jobs error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch jobs'
    };
    res.status(500).json(response);
  }
});

// Get job by ID
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const job = await prisma.job.findFirst({
      where: {
        id,
        userId: req.user!.id
      },
      include: {
        executions: {
          orderBy: { startedAt: 'desc' },
          take: 10
        },
        scrapedData: {
          orderBy: { scrapedAt: 'desc' },
          take: 10
        },
        _count: {
          select: {
            executions: true,
            scrapedData: true
          }
        }
      }
    });

    if (!job) {
      const response: ApiResponse = {
        success: false,
        error: 'Job not found'
      };
      res.status(404).json(response);
    }

    const response: ApiResponse<any> = {
      success: true,
      data: job
    };

    res.json(response);
  } catch (error) {
    console.error('Get job error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch job'
    };
    res.status(500).json(response);
  }
});

// Create new job
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = createJobSchema.parse(req.body);
    const { name, description, url, config, schedule } = validatedData;

    const job = await prisma.job.create({
      data: {
        name,
        description,
        url,
        config: JSON.stringify(config),
        schedule,
        userId: req.user!.id
      }
    });

    // Add job to queue for execution
    if (schedule) {
      // Schedule recurring job
      await jobQueue.addScheduledJob(job.id, req.user!.id, schedule);
    } else {
      // Execute immediately
      await jobQueue.addJob(job.id, req.user!.id, 0);
    }

    const response: ApiResponse<any> = {
      success: true,
      data: job,
      message: 'Job created successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const response: ApiResponse = {
        success: false,
        error: error.errors[0].message
      };
      res.status(400).json(response);
    }

    console.error('Create job error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to create job'
    };
    res.status(500).json(response);
  }
});

// Update job
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const validatedData = updateJobSchema.parse(req.body);

    const job = await prisma.job.findFirst({
      where: {
        id,
        userId: req.user!.id
      }
    });

    if (!job) {
      const response: ApiResponse = {
        success: false,
        error: 'Job not found'
      };
      res.status(404).json(response);
    }

    // Serialize config to JSON string if present
    const updateData: any = { ...validatedData };
    if (updateData.config) {
      updateData.config = JSON.stringify(updateData.config);
    }

    const updatedJob = await prisma.job.update({
      where: { id },
      data: updateData
    });

    const response: ApiResponse<any> = {
      success: true,
      data: updatedJob,
      message: 'Job updated successfully'
    };

    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const response: ApiResponse = {
        success: false,
        error: error.errors[0].message
      };
      res.status(400).json(response);
    }

    console.error('Update job error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to update job'
    };
    res.status(500).json(response);
  }
});

// Delete job
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const job = await prisma.job.findFirst({
      where: {
        id,
        userId: req.user!.id
      }
    });

    if (!job) {
      const response: ApiResponse = {
        success: false,
        error: 'Job not found'
      };
      res.status(404).json(response);
    }

    await prisma.job.delete({
      where: { id }
    });

    const response: ApiResponse = {
      success: true,
      message: 'Job deleted successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Delete job error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to delete job'
    };
    res.status(500).json(response);
  }
});

// Start job execution
router.post('/:id/start', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { priority = 0 } = req.body;

    const job = await prisma.job.findFirst({
      where: {
        id,
        userId: req.user!.id
      }
    });

    if (!job) {
      const response: ApiResponse = {
        success: false,
        error: 'Job not found'
      };
      res.status(404).json(response);
      return;
    }

    if (job!.status === 'RUNNING') {
      const response: ApiResponse = {
        success: false,
        error: 'Job is already running'
      };
      res.status(400).json(response);
      return;
    }

    // Add job to queue
    await jobQueue.addJob(id, req.user!.id, priority);

    const response: ApiResponse = {
      success: true,
      message: 'Job added to queue successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Start job error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to start job'
    };
    res.status(500).json(response);
  }
});

// Stop job execution
router.post('/:id/stop', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const job = await prisma.job.findFirst({
      where: {
        id,
        userId: req.user!.id
      }
    });

    if (!job) {
      const response: ApiResponse = {
        success: false,
        error: 'Job not found'
      };
      res.status(404).json(response);
    }

    // Cancel job in queue
    const { jobQueue } = await import('../services/jobQueue');
    const cancelled = await jobQueue.cancelJob(id);

    if (cancelled) {
      // Update job status to cancelled
      await prisma.job.update({
        where: { id },
        data: { status: 'CANCELLED' }
      });

      // Update any running executions
      await prisma.jobExecution.updateMany({
        where: {
          jobId: id,
          status: 'RUNNING'
        },
        data: {
          status: 'CANCELLED',
          completedAt: new Date()
        }
      });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Job stopped successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Stop job error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to stop job'
    };
    res.status(500).json(response);
  }
});

// Get queue status
router.get('/queue/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobQueue } = await import('../services/jobQueue');
    const status = await jobQueue.getQueueStatus();

    const response: ApiResponse<any> = {
      success: true,
      data: status
    };

    res.json(response);
  } catch (error) {
    console.error('Get queue status error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get queue status'
    };
    res.status(500).json(response);
  }
});

// Get queue jobs
router.get('/queue/jobs', async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobQueue } = await import('../services/jobQueue');
    const jobs = await jobQueue.getQueueJobs();

    const response: ApiResponse<any> = {
      success: true,
      data: jobs
    };

    res.json(response);
  } catch (error) {
    console.error('Get queue jobs error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get queue jobs'
    };
    res.status(500).json(response);
  }
});

export default router;
