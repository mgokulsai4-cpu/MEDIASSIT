import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { Errors } from '../utils/ApiError.js';

export function validate(req: Request, _res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(Errors.badRequest('Validation failed', errors.array()));
  }
  next();
}