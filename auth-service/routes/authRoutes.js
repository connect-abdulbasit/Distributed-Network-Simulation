const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/verify', authController.verify);

// Protected routes
router.get('/profile', authController.getProfile);

module.exports = router;