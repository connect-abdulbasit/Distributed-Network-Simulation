const express = require('express');
const computeRoutes = require('./routes/computeRoutes');
const { createQueue } = require('./queue/bullQueue');

const app = express();
const PORT = process.env.PORT || 3003;
const SERVICE_NAME = process.env.SERVICE_NAME || 'compute-service-1';

app.use(express.json());

// Initialize queue
const jobQueue = createQueue('compute-jobs');

// Health check endpoint (root level)
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
    const queueHealth = await jobQueue.isReady();
    res.json({
      status: 'ready',
      service: SERVICE_NAME,
      queue: queueHealth ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      service: SERVICE_NAME,
      error: error.message
    });
  }
});

// Compute routes
app.use('/api/compute', computeRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[${SERVICE_NAME}] Error:`, err);
  res.status(500).json({
    error: 'Internal server error',
    service: SERVICE_NAME
  });
});

app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] Compute Service running on port ${PORT}`);
});

module.exports = app;