const express = require('express');
const computeRoutes = require('./routes/computeRoutes');
const { createQueue } = require('./queue/bullQueue');
const path = require('path');
function findProjectRoot(startPath) {
  let current = path.resolve(startPath);
  while (current !== path.dirname(current)) {
    if (require('fs').existsSync(path.join(current, 'shared', 'utils', 'serviceRegistry.js'))) {
      return current;
    }
    current = path.dirname(current);
  }
  return null;
}
const projectRoot = findProjectRoot(__dirname) || path.resolve(__dirname, '../..');
const { registerService, deregisterService } = require(path.join(projectRoot, 'shared', 'utils', 'serviceRegistry'));

const app = express();
const PORT = process.env.PORT || 3003;
const SERVICE_NAME = process.env.SERVICE_NAME || 'compute-service-1';
const SERVICE_ID = `${SERVICE_NAME}-${PORT}`;

app.use(express.json());

const jobQueue = createQueue('compute-jobs');

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

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

app.use('/api/compute', computeRoutes);

app.use((err, req, res, next) => {
  console.error(`[${SERVICE_NAME}] Error:`, err);
  res.status(500).json({
    error: 'Internal server error',
    service: SERVICE_NAME
  });
});

app.listen(PORT, async () => {
  console.log(`[${SERVICE_NAME}] Compute Service running on port ${PORT}`);
  
  try {
    const serviceUrl = `http://${process.env.SERVICE_HOST || 'localhost'}:${PORT}`;
    await registerService({
      serviceId: SERVICE_ID,
      serviceType: 'compute',
      url: serviceUrl,
      name: SERVICE_NAME,
      metadata: {
        port: PORT,
        host: process.env.SERVICE_HOST || 'localhost'
      }
    });
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Failed to register with service registry:`, error.message);
    console.log(`[${SERVICE_NAME}] Continuing without service registry...`);
  }
});

process.on('SIGTERM', async () => {
  console.log(`[${SERVICE_NAME}] SIGTERM received, shutting down gracefully...`);
  await deregisterService();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log(`[${SERVICE_NAME}] SIGINT received, shutting down gracefully...`);
  await deregisterService();
  process.exit(0);
});

module.exports = app;