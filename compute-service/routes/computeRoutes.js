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

router.get('/compute-worker', computeController.computeWorker);
router.post('/compute-worker', computeController.computeWorker);

router.post('/direct', computeController.computeDirect);


module.exports = router;

