import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../utils/database';
import { authenticateToken } from '../middleware/auth';
import { ApiResponse } from '../types';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Admin-only: Get all users
router.get('/all', async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      const response: ApiResponse = {
        success: false,
        error: 'Unauthorized. Admin access required.'
      };
      res.status(403).json(response);
      return;
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const response: ApiResponse<any> = {
      success: true,
      data: users,
      message: `Found ${users.length} users`
    };

    res.json(response);
  } catch (error) {
    console.error('Get all users error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch users'
    };
    res.status(500).json(response);
  }
});

// Admin-only: Delete user
router.delete('/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      const response: ApiResponse = {
        success: false,
        error: 'Unauthorized. Admin access required.'
      };
      res.status(403).json(response);
      return;
    }

    const { userId } = req.params;

    // Prevent admin from deleting themselves
    if (req.user?.id === userId) {
      const response: ApiResponse = {
        success: false,
        error: 'You cannot delete your own account'
      };
      res.status(400).json(response);
      return;
    }

    // Check if user exists
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!userToDelete) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found'
      };
      res.status(404).json(response);
      return;
    }

    // Delete the user
    await prisma.user.delete({
      where: { id: userId }
    });

    const response: ApiResponse = {
      success: true,
      message: `User ${userToDelete.username} deleted successfully`
    };

    res.json(response);
  } catch (error) {
    console.error('Delete user error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to delete user'
    };
    res.status(500).json(response);
  }
});

// Update profile schema
const updateProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email('Invalid email format').optional(),
  username: z.string().min(3, 'Username must be at least 3 characters').optional()
});

// Change password schema
const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters')
});

// Get user profile
router.get('/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found'
      };
      res.status(404).json(response);
    }

    const response: ApiResponse<any> = {
      success: true,
      data: user
    };

    res.json(response);
  } catch (error) {
    console.error('Get profile error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch profile'
    };
    res.status(500).json(response);
  }
});

// Update user profile
router.put('/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = updateProfileSchema.parse(req.body);
    const { firstName, lastName, email, username } = validatedData;

    // Check if email or username already exists (if being changed)
    if (email || username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: req.user!.id } },
            {
              OR: [
                ...(email ? [{ email }] : []),
                ...(username ? [{ username }] : [])
              ]
            }
          ]
        }
      });

      if (existingUser) {
        const response: ApiResponse = {
          success: false,
          error: 'Email or username already exists'
        };
        res.status(400).json(response);
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email && { email }),
        ...(username && { username })
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const response: ApiResponse<any> = {
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully'
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

    console.error('Update profile error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to update profile'
    };
    res.status(500).json(response);
  }
});

// Change password
router.put('/password', async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = changePasswordSchema.parse(req.body);
    const { currentPassword, newPassword } = validatedData;

    // Get current user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found'
      };
      res.status(404).json(response);
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user!.password);

    if (!isValidPassword) {
      const response: ApiResponse = {
        success: false,
        error: 'Current password is incorrect'
      };
      res.status(400).json(response);
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { password: hashedNewPassword }
    });

    const response: ApiResponse = {
      success: true,
      message: 'Password changed successfully'
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

    console.error('Change password error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to change password'
    };
    res.status(500).json(response);
  }
});

// Get user statistics
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const [
      totalJobs,
      activeJobs,
      completedJobs,
      failedJobs,
      totalExecutions,
      totalDataPoints,
      recentExecutions
    ] = await Promise.all([
      prisma.job.count({ where: { userId } }),
      prisma.job.count({ where: { userId, status: 'RUNNING' } }),
      prisma.job.count({ where: { userId, status: 'COMPLETED' } }),
      prisma.job.count({ where: { userId, status: 'FAILED' } }),
      prisma.jobExecution.count({
        where: { job: { userId } }
      }),
      prisma.scrapedData.count({
        where: { job: { userId } }
      }),
      prisma.jobExecution.findMany({
        where: { job: { userId } },
        orderBy: { startedAt: 'desc' },
        take: 5,
        include: {
          job: {
            select: {
              name: true,
              url: true
            }
          }
        }
      })
    ]);

    const averageExecutionTime = await prisma.jobExecution.aggregate({
      where: {
        job: { userId },
        status: 'COMPLETED',
        duration: { not: null }
      },
      _avg: {
        duration: true
      }
    });

    const stats = {
      jobs: {
        total: totalJobs,
        active: activeJobs,
        completed: completedJobs,
        failed: failedJobs
      },
      data: {
        totalExecutions,
        totalDataPoints,
        averageExecutionTime: averageExecutionTime._avg.duration || 0
      },
      recentExecutions
    };

    const response: ApiResponse<any> = {
      success: true,
      data: stats
    };

    res.json(response);
  } catch (error) {
    console.error('Get user stats error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch user statistics'
    };
    res.status(500).json(response);
  }
});

export default router;
