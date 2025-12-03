const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');

router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: process.env.SERVICE_NAME || 'data-service-1',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

router.get('/data-work', dataController.dataWorker);
router.post('/data-work', dataController.dataWorker);

router.get('/:id', dataController.getDataById);

module.exports = router;