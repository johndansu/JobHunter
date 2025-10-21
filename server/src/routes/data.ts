import { Router, Request, Response } from 'express';
import { prisma } from '../utils/database';
import { authenticateToken } from '../middleware/auth';
import { ApiResponse, PaginatedResponse } from '../types';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get scraped data for a specific job
router.get('/job/:jobId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const skip = (page - 1) * limit;

    // Verify job belongs to user
    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
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

    const [data, total] = await Promise.all([
      prisma.scrapedData.findMany({
        where: { jobId },
        skip,
        take: limit,
        orderBy: { scrapedAt: 'desc' }
      }),
      prisma.scrapedData.count({ where: { jobId } })
    ]);

    const response: PaginatedResponse<any> = {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Get scraped data error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch scraped data'
    };
    res.status(500).json(response);
  }
});

// Get all scraped data for user
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const jobId = req.query.jobId as string;

    const skip = (page - 1) * limit;

    const where: any = {
      job: {
        userId: req.user!.id
      }
    };

    if (jobId) {
      where.jobId = jobId;
    }

    const [data, total] = await Promise.all([
      prisma.scrapedData.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scrapedAt: 'desc' },
        include: {
          job: {
            select: {
              id: true,
              name: true,
              url: true
            }
          }
        }
      }),
      prisma.scrapedData.count({ where })
    ]);

    const response: PaginatedResponse<any> = {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Get all scraped data error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch scraped data'
    };
    res.status(500).json(response);
  }
});

// Export data as CSV
router.get('/export/:jobId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const format = req.query.format as string || 'csv';

    // Verify job belongs to user
    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
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

    const data = await prisma.scrapedData.findMany({
      where: { jobId },
      orderBy: { scrapedAt: 'desc' }
    });

    if (format === 'csv') {
      // Convert to CSV
      if (data.length === 0) {
        const response: ApiResponse = {
          success: false,
          error: 'No data to export'
        };
        res.status(404).json(response);
      }

      // Get headers from first data item
      const firstItem = JSON.parse(data[0].data);
      const headers = Object.keys(firstItem);
      
      const csvContent = [
        headers.join(','),
        ...data.map(item => {
          const parsedData = JSON.parse(item.data);
          const row = headers.map(header => {
            const value = parsedData[header];
            return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
          });
          return row.join(',');
        })
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${job!.name}-data.csv"`);
      res.send(csvContent);
    } else {
      const response: ApiResponse<any[]> = {
        success: true,
        data
      };
      res.json(response);
    }
  } catch (error) {
    console.error('Export data error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to export data'
    };
    res.status(500).json(response);
  }
});

// Delete scraped data
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Verify data belongs to user's job
    const data = await prisma.scrapedData.findFirst({
      where: {
        id,
        job: {
          userId: req.user!.id
        }
      }
    });

    if (!data) {
      const response: ApiResponse = {
        success: false,
        error: 'Data not found'
      };
      res.status(404).json(response);
    }

    await prisma.scrapedData.delete({
      where: { id }
    });

    const response: ApiResponse = {
      success: true,
      message: 'Data deleted successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Delete data error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to delete data'
    };
    res.status(500).json(response);
  }
});

export default router;
