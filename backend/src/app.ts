import express from 'express';
import cors from 'cors';
import { runTriage } from './engine';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Health route
  app.get('/', (_req, res) => {
    res.json({
      name: 'MedAssist+ API',
      version: '1.0.0'
    });
  });

  // 🔥 TRIAGE ROUTE (FIXED)
  app.post('/api/triage', (req, res) => {
    try {
      const { messages, answers } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({
          success: false,
          message: 'messages array required'
        });
      }

      // ✅ FIXED CALL
      const result = runTriage({
        messages,
        answers: answers || []
      });

      return res.json({
        success: true,
        data: result
      });

    } catch (err) {
      console.error('Triage error:', err);

      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      code: 'NOT_FOUND'
    });
  });

  return app;
}