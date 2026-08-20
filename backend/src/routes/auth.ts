import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import {
  handleChangePassword,
  handleLogin,
  handleLogout,
  handleMe,
  handleRegister,
} from '../controllers/authController.js';

export const authRouter = Router();

authRouter.post(
  '/register',
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional().trim().isLength({ min: 7, max: 20 }).withMessage('Invalid phone number'),
  body('age').optional().isInt({ min: 0, max: 130 }),
  body('gender').optional().isIn(['male', 'female', 'other', '']),
  body('role').optional().isIn(['patient', 'doctor']),
  validate,
  handleRegister,
);

authRouter.post(
  '/login',
  body('identifier').trim().notEmpty().withMessage('Email or phone is required'),
  body('password').notEmpty().withMessage('Password is required'),
  body('role').optional().isIn(['patient', 'doctor']).withMessage('Invalid account type'),
  validate,
  handleLogin,
);

authRouter.post('/logout', requireAuth, handleLogout);

authRouter.get('/me', requireAuth, handleMe);

authRouter.patch(
  '/password',
  requireAuth,
  body('current_password').notEmpty().withMessage('Current password is required'),
  body('new_password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  validate,
  handleChangePassword,
);
