import express from 'express';
import { runTriage } from '../engine.js';

const router = express.Router();

router.post('/triage', (req, res) => {
  try {
    const result = runTriage(req.body);

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('Triage error:', err);

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;