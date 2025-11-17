const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Service registry with health status
const services = {
  auth: [
    { url: 'http://auth-service-1:3001', healthy: true, failures: 0 },
    { url: 'http://auth-service-2:3001', healthy: true, failures: 0 },
    { url: 'http://auth-service-3:3001', healthy: true, failures: 0 }
  ],
  data: [
    { url: 'http://data-service-1:3002', healthy: true, failures: 0 },
    { url: 'http://data-service-2:3002', healthy: true, failures: 0 },
    { url: 'http://data-service-3:3002', healthy: true, failures: 0 }
  ],
  compute: [
    { url: 'http://compute-service-1:3003', healthy: true, failures: 0 },
    { url: 'http://compute-service-2:3003', healthy: true, failures: 0 },
    { url: 'http://compute-service-3:3003', healthy: true, failures: 0 }
  ]
};

// Round-robin counters
const roundRobin = {
  auth: 0,
  data: 0,
  compute: 0
};

const MAX_FAILURES = 3;
const HEALTH_CHECK_INTERVAL = 10000; // 10 seconds
const REQUEST_TIMEOUT = 5000; // 5 seconds

// Get next healthy service using round-robin
function getNextHealthyService(serviceType) {
  const serviceList = services[serviceType];
  const healthyServices = serviceList.filter(s => s.healthy);

  if (healthyServices.length === 0) {
    throw new Error(`No healthy ${serviceType} services available`);
  }

  // Round-robin selection
  const index = roundRobin[serviceType] % healthyServices.length;
  roundRobin[serviceType]++;

  return healthyServices[index];
}

// Mark service as unhealthy
function markServiceUnhealthy(serviceType, serviceUrl) {
  const service = services[serviceType].find(s => s.url === serviceUrl);
  if (service) {
    service.failures++;
    if (service.failures >= MAX_FAILURES) {
      service.healthy = false;
      console.log(`[LOAD BALANCER] Marked ${serviceUrl} as unhealthy`);
    }
  }
}

// Health check all services
async function healthCheck() {
  console.log('[LOAD BALANCER] Running health checks...');

  for (const [serviceType, serviceList] of Object.entries(services)) {
    for (const service of serviceList) {
      try {
        const response = await axios.get(`${service.url}/health`, {
          timeout: 3000
        });

        if (response.status === 200) {
          service.healthy = true;
          service.failures = 0;
          console.log(`[LOAD BALANCER] ${service.url} is healthy`);
        }
      } catch (error) {
        service.failures++;
        if (service.failures >= MAX_FAILURES) {
          service.healthy = false;
        }
        console.log(`[LOAD BALANCER] ${service.url} health check failed:`, error.message);
      }
    }
  }
}

// Start periodic health checks
setInterval(healthCheck, HEALTH_CHECK_INTERVAL);
healthCheck(); // Run immediately on startup

// Proxy request to service
async function proxyRequest(req, res, serviceType) {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const service = getNextHealthyService(serviceType);
      const targetUrl = `${service.url}${req.path}`;

      console.log(`[LOAD BALANCER] Routing ${req.method} ${req.path} to ${service.url} (attempt ${attempts + 1})`);

      const response = await axios({
        method: req.method,
        url: targetUrl,
        data: req.body,
        headers: {
          ...req.headers,
          host: new URL(service.url).host
        },
        timeout: REQUEST_TIMEOUT,
        validateStatus: () => true // Accept any status code
      });

      // Mark service as healthy on successful request
      service.failures = 0;

      return res.status(response.status).json(response.data);

    } catch (error) {
      attempts++;
      console.error(`[LOAD BALANCER] Request failed (attempt ${attempts}):`, error.message);

      if (error.config?.url) {
        const failedUrl = new URL(error.config.url).origin;
        markServiceUnhealthy(serviceType, failedUrl);
      }

      if (attempts >= maxAttempts) {
        return res.status(503).json({
          error: 'Service unavailable',
          message: `Failed to reach ${serviceType} service after ${maxAttempts} attempts`,
          timestamp: new Date().toISOString()
        });
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

// Route handlers
app.all('/api/auth/*', (req, res) => proxyRequest(req, res, 'auth'));
app.all('/api/data/*', (req, res) => proxyRequest(req, res, 'data'));
app.all('/api/compute/*', (req, res) => proxyRequest(req, res, 'compute'));

// Load balancer health endpoint
app.get('/health', (req, res) => {
  const healthStatus = {};
  
  for (const [serviceType, serviceList] of Object.entries(services)) {
    healthStatus[serviceType] = {
      total: serviceList.length,
      healthy: serviceList.filter(s => s.healthy).length,
      unhealthy: serviceList.filter(s => !s.healthy).length,
      services: serviceList.map(s => ({
        url: s.url,
        healthy: s.healthy,
        failures: s.failures
      }))
    };
  }

  res.json({
    status: 'healthy',
    loadBalancer: 'operational',
    timestamp: new Date().toISOString(),
    services: healthStatus
  });
});

// Service status endpoint
app.get('/status', (req, res) => {
  res.json({
    services,
    roundRobin,
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('[LOAD BALANCER] Error:', err);
  res.status(500).json({
    error: 'Load balancer error',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`[LOAD BALANCER] Running on port ${PORT}`);
  console.log('[LOAD BALANCER] Service configuration:');
  console.log(JSON.stringify(services, null, 2));
});

module.exports = app;