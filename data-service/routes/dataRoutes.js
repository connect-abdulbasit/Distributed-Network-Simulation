const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');

// Health check endpoint (must be before /:key route to avoid conflict)
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: process.env.SERVICE_NAME || 'data-service-1',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

router.post('/', dataController.createData);
router.get('/', dataController.getAllData);
router.get('/:key', dataController.getData);
router.put('/:key', dataController.updateData);
router.delete('/:key', dataController.deleteData);

module.exports = router;