export type Role = 'patient' | 'doctor' | 'admin';

export interface AuthUser {
  user_id: string;
  role: Role;
  email?: string;
  name?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}