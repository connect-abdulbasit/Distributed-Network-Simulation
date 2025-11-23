const express = require('express');
const router = express.Router();
const computeController = require('../controllers/computeController');

// Health check endpoint (accessible at /api/compute/health)
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: process.env.SERVICE_NAME || 'compute-service-1',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Direct computation (synchronous) - POST /api/compute/direct
router.post('/direct', computeController.computeDirect);

// Job-based computation (asynchronous)
// POST /api/compute/job - Submit a computation job
router.post('/job', computeController.submitJob);
// GET /api/compute/job/:jobId - Get job status
router.get('/job/:jobId', computeController.getJobStatus);

// Queue statistics - GET /api/compute/stats
router.get('/stats', computeController.getStats);

module.exports = router;

