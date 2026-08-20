import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Errors } from '../utils/ApiError.js';
import { User } from '../models/User.js';
import { AuthUser, Role } from '../types/auth.js';
import '../types/auth.js';

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization ?? '';
    if (!header.startsWith('Bearer ')) {
      throw Errors.unauthorized('Missing or malformed authorization header');
    }
    const token = header.slice(7);
    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload;
    } catch {
      throw Errors.unauthorized('Invalid or expired token');
    }
    const sub = payload.sub as string | undefined;
    if (!sub) throw Errors.unauthorized('Invalid token payload');
    const user = await User.findOne({ user_id: sub }).select('-password_hash').lean();
    if (!user) throw Errors.unauthorized('Account no longer exists');
    const authUser: AuthUser = {
      user_id: user.user_id,
      role: user.role as Role,
      email: user.email,
      name: user.name,
    };
    req.user = authUser;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRoles(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(Errors.unauthorized());
    if (!roles.includes(req.user.role)) return next(Errors.forbidden());
    next();
  };
}