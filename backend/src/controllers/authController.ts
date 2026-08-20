import { Request, Response } from 'express';
import { register, login, changePassword } from '../services/authService.js';
import { logger } from '../utils/logger.js';

export async function handleRegister(req: Request, res: Response) {
  const data = await register(req.body);
  res.status(201).json({ success: true, data });
}

export async function handleLogin(req: Request, res: Response) {
  const data = await login(req.body);
  res.json({ success: true, data });
}

export async function handleLogout(_req: Request, res: Response) {
  // Stateless JWT: the client discards the token. The endpoint exists for
  // audit-friendliness and to allow server-side revocation in the future.
  logger.audit('auth-logout');
  res.json({ success: true, message: 'Logged out' });
}

export async function handleMe(req: Request, res: Response) {
  res.json({ success: true, data: { user: req.user } });
}

export async function handleChangePassword(req: Request, res: Response) {
  await changePassword(
    req.user!.user_id,
    req.body.current_password,
    req.body.new_password,
  );
  res.json({ success: true, message: 'Password updated' });
}