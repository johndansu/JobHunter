import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', error);

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  const response: ApiResponse = {
    success: false,
    error: message
  };

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    response.error = 'Something went wrong';
  }

  res.status(statusCode).json(response);
};
