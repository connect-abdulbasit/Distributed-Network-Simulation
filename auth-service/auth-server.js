const express = require('express');
const authRoutes = require('./routes/authRoutes');
const { connectDB } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3001;
const SERVICE_NAME = process.env.SERVICE_NAME || 'auth-service-1';

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Ready check endpoint
app.get('/ready', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = await connectDB();
    res.json({
      status: 'ready',
      service: SERVICE_NAME,
      database: dbStatus ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      service: SERVICE_NAME,
      error: error.message
    });
  }
});

// Auth routes
app.use('/api/auth', authRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[${SERVICE_NAME}] Error:`, err);
  res.status(500).json({
    error: 'Internal server error',
    service: SERVICE_NAME
  });
});

app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] Auth Service running on port ${PORT}`);
  connectDB().catch(err => console.error('Database connection error:', err));
});

module.exports = app;