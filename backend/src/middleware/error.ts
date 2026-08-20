import { NextFunction, Request, RequestHandler, Response } from 'express';
import mongoose from 'mongoose';
import { ApiError, ERROR_CODES } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const notFoundHandler: RequestHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found: ' + req.method + ' ' + req.originalUrl,
    code: ERROR_CODES.NOT_FOUND,
  });
};

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (res.headersSent) return;

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      details: err.details,
    });
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      code: ERROR_CODES.VALIDATION,
      details: Object.values(err.errors).map((e) => e.message),
    });
    return;
  }

  const anyErr = err as Record<string, unknown>;
  if (anyErr && anyErr.code === 11000) {
    res.status(409).json({
      success: false,
      message: 'A record with the same unique identifier already exists',
      code: ERROR_CODES.CONFLICT,
    });
    return;
  }

  if (err instanceof SyntaxError) {
    res.status(400).json({
      success: false,
      message: 'Malformed request body',
      code: ERROR_CODES.VALIDATION,
    });
    return;
  }

  logger.error('Unhandled error on', req.method, req.originalUrl, '-', err);
  res.status(500).json({
    success: false,
    message: env.isProd ? 'Internal server error' : String((anyErr && anyErr.message) || err),
    code: ERROR_CODES.INTERNAL,
  });
};