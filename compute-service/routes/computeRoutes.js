const express = require('express');
const router = express.Router();
const computeController = require('../controllers/computeController');

router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: process.env.SERVICE_NAME || 'compute-service-1',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

router.post('/direct', computeController.computeDirect);

router.post('/job', computeController.submitJob);
router.get('/job/:jobId', computeController.getJobStatus);

router.get('/stats', computeController.getStats);

module.exports = router;

