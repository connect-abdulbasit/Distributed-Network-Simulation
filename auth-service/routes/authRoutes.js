const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: process.env.SERVICE_NAME || 'auth-service-1',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});


router.get('/auth-worker', authController.authWorker);
router.post('/auth-worker', authController.authWorker);
router.get('/auth-work', authController.authWorker);
router.post('/auth-work', authController.authWorker);

router.post('/signup', authController.register);


router.post('/signin', authController.login);

module.exports = router;