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

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/verify', authController.verify);

router.get('/profile', authController.getProfile);

module.exports = router;