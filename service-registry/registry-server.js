const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(express.json());
app.use(cors());

const serviceRegistry = new Map();
const serviceHeartbeats = new Map();

const HEARTBEAT_TIMEOUT = 30000;
const HEARTBEAT_CHECK_INTERVAL = 10000;

app.post('/api/registry/register', (req, res) => {
  const { serviceId, serviceType, url, name, metadata = {} } = req.body;

  if (!serviceId || !serviceType || !url || !name) {
    return res.status(400).json({
      error: 'Missing required fields: serviceId, serviceType, url, name'
    });
  }

  const serviceInfo = {
    serviceId,
    serviceType,
    url,
    name,
    metadata,
    registeredAt: new Date().toISOString(),
    lastHeartbeat: Date.now(),
    healthy: true
  };

  serviceRegistry.set(serviceId, serviceInfo);
  serviceHeartbeats.set(serviceId, Date.now());

  console.log(`[REGISTRY] Service registered: ${name} (${serviceId}) at ${url}`);
  console.log(`[REGISTRY] Total services: ${serviceRegistry.size}`);

  res.json({
    success: true,
    message: 'Service registered successfully',
    service: serviceInfo
  });
});

app.post('/api/registry/heartbeat', (req, res) => {
  const { serviceId } = req.body;

  if (!serviceId) {
    return res.status(400).json({ error: 'serviceId is required' });
  }

  const service = serviceRegistry.get(serviceId);
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }

  service.lastHeartbeat = Date.now();
  serviceHeartbeats.set(serviceId, Date.now());
  service.healthy = true;

  res.json({
    success: true,
    message: 'Heartbeat received',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/registry/deregister', (req, res) => {
  const { serviceId } = req.body;

  if (!serviceId) {
    return res.status(400).json({ error: 'serviceId is required' });
  }

  const service = serviceRegistry.get(serviceId);
  if (service) {
    serviceRegistry.delete(serviceId);
    serviceHeartbeats.delete(serviceId);
    console.log(`[REGISTRY] Service deregistered: ${service.name} (${serviceId})`);
    console.log(`[REGISTRY] Total services: ${serviceRegistry.size}`);
  }

  res.json({
    success: true,
    message: 'Service deregistered successfully'
  });
});

app.get('/api/registry/services', (req, res) => {
  const { type, healthy } = req.query;

  let services = Array.from(serviceRegistry.values());

  if (type) {
    services = services.filter(s => s.serviceType === type);
  }

  if (healthy !== undefined) {
    const isHealthy = healthy === 'true';
    services = services.filter(s => s.healthy === isHealthy);
  }

  res.json({
    services,
    total: services.length,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/registry/services/:type', (req, res) => {
  const { type } = req.params;
  const { healthy } = req.query;

  let services = Array.from(serviceRegistry.values())
    .filter(s => s.serviceType === type);

  if (healthy !== undefined) {
    const isHealthy = healthy === 'true';
    services = services.filter(s => s.healthy === isHealthy);
  }

  res.json({
    services,
    type,
    total: services.length,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/registry/service/:serviceId', (req, res) => {
  const { serviceId } = req.params;
  const service = serviceRegistry.get(serviceId);

  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }

  res.json(service);
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'service-registry',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    registeredServices: serviceRegistry.size
  });
});

function cleanupStaleServices() {
  const now = Date.now();
  const staleServices = [];

  for (const [serviceId, lastHeartbeat] of serviceHeartbeats.entries()) {
    if (now - lastHeartbeat > HEARTBEAT_TIMEOUT) {
      const service = serviceRegistry.get(serviceId);
      if (service) {
        service.healthy = false;
        staleServices.push(service);
        console.log(`[REGISTRY] Service marked as stale: ${service.name} (${serviceId}) - last heartbeat: ${new Date(lastHeartbeat).toISOString()}`);
      }
    }
  }

  return staleServices;
}

setInterval(() => {
  cleanupStaleServices();
}, HEARTBEAT_CHECK_INTERVAL);

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('Service Registry started');
  console.log(`Listening on port ${PORT}`);
  console.log('='.repeat(60) + '\n');
});

process.on('SIGTERM', () => {
  console.log('[REGISTRY] SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[REGISTRY] SIGINT received, shutting down gracefully...');
  process.exit(0);
});

module.exports = app;

