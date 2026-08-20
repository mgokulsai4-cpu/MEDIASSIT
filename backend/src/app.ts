import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authRouter } from './routes/auth.js';
import { aiRouter } from './routes/ai.js';
import { doctorRouter } from './routes/doctors.js';
import { appointmentRouter } from './routes/appointments.js';
import { queueRouter } from './routes/queue.js';
import { reportRouter } from './routes/reports.js';
import { patientRouter } from './routes/patients.js';
import { preconsultRouter } from './routes/preconsult.js';
import { doctorDashboardRouter } from './routes/doctorDashboard.js';
import { slotRouter } from './routes/slotRecommendation.js';
import { notificationRouter } from './routes/notifications.js';
import { prescriptionRouter } from './routes/prescriptions.js';
import { familyRouter } from './routes/family.js';
import { timelineRouter } from './routes/timeline.js';
import { scanRouter } from './routes/scan.js';

export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins.includes('*') ? true : env.corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '12mb' }));

  const limiter = rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: env.isTest ? 10000 : env.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later' },
  });
  app.use('/api', limiter);

  app.get('/', (_req, res) => {
    res.json({ name: 'MedAssist+ API', version: '1.0.0', docs: '/api/health' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/doctors', doctorRouter);
  app.use('/api/appointments', appointmentRouter);
  app.use('/api/queue', queueRouter);
  app.use('/api/reports', reportRouter);
  app.use('/api/patients', patientRouter);
  app.use('/api/preconsult', preconsultRouter);
  app.use('/api/doctor-dashboard', doctorDashboardRouter);
  app.use('/api/slots', slotRouter);
  app.use('/api/notifications', notificationRouter);
  app.use('/api/prescriptions', prescriptionRouter);
  app.use('/api/family', familyRouter);
  app.use('/api/timeline', timelineRouter);
  app.use('/api/scan', scanRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}