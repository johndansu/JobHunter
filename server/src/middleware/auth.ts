import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiResponse, User } from '../types';
import { prisma } from '../utils/database';

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      const response: ApiResponse = {
        success: false,
        error: 'Access token required'
      };
      res.status(401).json(response);
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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

    if (!user || !user.isActive) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid or inactive user'
      };
      res.status(401).json(response);
      return;
    }

    req.user = user as User;
    next();
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid token'
    };
    res.status(403).json(response);
    return;
  }
};

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== 'ADMIN') {
    const response: ApiResponse = {
      success: false,
      error: 'Admin access required'
    };
    res.status(403).json(response);
    return;
  }
  next();
};
