const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};


const logger = {
  timestamp: () => {
    const now = new Date();
    return now.toISOString().replace('T', ' ').substring(0, 19);
  },
  
  info: (message) => {
    console.log(`${colors.cyan}[${logger.timestamp()}]${colors.reset} ${colors.bright}ℹ${colors.reset}  ${message}`);
  },
  
  success: (message) => {
    console.log(`${colors.green}[${logger.timestamp()}]${colors.reset} ${colors.bright}✓${colors.reset}  ${message}`);
  },
  
  warning: (message) => {
    console.log(`${colors.yellow}[${logger.timestamp()}]${colors.reset} ${colors.bright}⚠${colors.reset}  ${message}`);
  },
  
  error: (message) => {
    console.log(`${colors.red}[${logger.timestamp()}]${colors.reset} ${colors.bright}✗${colors.reset}  ${message}`);
  },
  
  request: (method, path, serviceUrl, statusCode, responseTime, port = null) => {
    const statusColor = statusCode >= 500 ? colors.red : 
                       statusCode >= 400 ? colors.yellow : 
                       colors.green;
    const methodColor = method === 'GET' ? colors.blue : 
                       method === 'POST' ? colors.green : 
                       method === 'PUT' ? colors.yellow : 
                       method === 'DELETE' ? colors.red : colors.white;
    
    const portDisplay = port ? ` ${colors.cyan}[port ${port}]${colors.reset}` : '';
    console.log(
      `${colors.dim}[${logger.timestamp()}]${colors.reset} ` +
      `${methodColor}${method.padEnd(6)}${colors.reset} ` +
      `${colors.cyan}${path}${colors.reset} ` +
      `→ ${colors.magenta}${serviceUrl}${colors.reset}${portDisplay} ` +
      `${statusColor}${statusCode}${colors.reset} ` +
      `${colors.dim}(${responseTime}ms)${colors.reset}`
    );
  }
};

// Service registry with health status
// Use environment variable to determine if running in Docker or locally
const SERVICE_HOST = process.env.SERVICE_HOST || 'localhost';

// For local development: auth services use ports 3001, 3002, 3003
// For Docker: set SERVICE_HOST to service name (e.g., 'auth-service-1') and use port 3001
const AUTH_PORTS = process.env.AUTH_PORTS ? 
  process.env.AUTH_PORTS.split(',').map(p => parseInt(p.trim())) : 
  [3001, 3002, 3003];

// Data and compute services use different ports to avoid conflicts with auth services
const DATA_PORTS = process.env.DATA_PORTS ? 
  process.env.DATA_PORTS.split(',').map(p => parseInt(p.trim())) : 
  [4002, 4003, 4004]; // Multiple data service instances for load balancing

const COMPUTE_PORTS = process.env.COMPUTE_PORTS ? 
  process.env.COMPUTE_PORTS.split(',').map(p => parseInt(p.trim())) : 
  [5002, 5003, 5004]; // Multiple compute service instances for load balancing

const services = {
  auth: AUTH_PORTS.map(port => ({
    url: `http://${SERVICE_HOST}:${port}`,
    healthy: true,
    failures: 0
  })),
  data: DATA_PORTS.map(port => ({
    url: `http://${SERVICE_HOST}:${port}`,
    healthy: true,
    failures: 0
  })),
  compute: COMPUTE_PORTS.map(port => ({
    url: `http://${SERVICE_HOST}:${port}`,
    healthy: true,
    failures: 0
  }))
};

// Round-robin counters
const roundRobin = {
  auth: 0,
  data: 0,
  compute: 0
};

// Request metrics tracking (per service URL)
const requestMetrics = new Map(); // url -> { total, success, failed, recentRequests }

const MAX_FAILURES = 3;
const HEALTH_CHECK_INTERVAL = 10000; // 10 seconds
const REQUEST_TIMEOUT = 10000; // 10 seconds (increased for bcrypt operations)

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
      logger.error(`Service ${colors.magenta}${serviceUrl}${colors.reset} marked as ${colors.red}UNHEALTHY${colors.reset} (${service.failures} consecutive failures)`);
    } else {
      logger.warning(`Service ${colors.magenta}${serviceUrl}${colors.reset} has ${colors.yellow}${service.failures}${colors.reset} failures (threshold: ${MAX_FAILURES})`);
    }
  }
}

// Health check all services
async function healthCheck() {
  // Only log health checks for auth services, suppress others
  let healthyCount = 0;
  let unhealthyCount = 0;

  for (const [serviceType, serviceList] of Object.entries(services)) {
    for (const service of serviceList) {
      try {
        const startTime = Date.now();
        const response = await axios.get(`${service.url}/health`, {
          timeout: 3000
        });
        const responseTime = Date.now() - startTime;

        if (response.status === 200) {
          const wasUnhealthy = !service.healthy;
          service.healthy = true;
          service.failures = 0;
          
          // Log recovery for all services
          if (serviceType === 'auth' || serviceType === 'data' || serviceType === 'compute') {
            const serviceTypeLabel = `${colors.blue}${serviceType.toUpperCase()}${colors.reset}`;
            if (wasUnhealthy) {
              logger.success(`${serviceTypeLabel} service ${colors.magenta}${service.url}${colors.reset} ${colors.green}RECOVERED${colors.reset} (${responseTime}ms)`);
            }
            // Don't log healthy status to reduce noise
          }
          healthyCount++;
        }
      } catch (error) {
        service.failures++;
        if (service.failures >= MAX_FAILURES) {
          service.healthy = false;
          unhealthyCount++;
        }
        // Log failures for all services
        if (serviceType === 'auth' || serviceType === 'data' || serviceType === 'compute') {
          const serviceTypeLabel = `${colors.blue}${serviceType.toUpperCase()}${colors.reset}`;
          logger.warning(`${serviceTypeLabel} service ${colors.magenta}${service.url}${colors.reset} health check failed: ${error.message}`);
        }
      }
    }
  }
  
  // Show summary for all services if any are unhealthy
  const authServices = services.auth || [];
  const authHealthy = authServices.filter(s => s.healthy).length;
  const authTotal = authServices.length;
  
  if (authHealthy < authTotal) {
    logger.warning(`AUTH services: ${colors.green}${authHealthy}${colors.reset}/${colors.yellow}${authTotal}${colors.reset} healthy`);
  }
  
  const dataServices = services.data || [];
  const dataHealthy = dataServices.filter(s => s.healthy).length;
  const dataTotal = dataServices.length;
  
  if (dataHealthy < dataTotal) {
    logger.warning(`DATA services: ${colors.green}${dataHealthy}${colors.reset}/${colors.yellow}${dataTotal}${colors.reset} healthy`);
  }
  
  const computeServices = services.compute || [];
  const computeHealthy = computeServices.filter(s => s.healthy).length;
  const computeTotal = computeServices.length;
  
  if (computeHealthy < computeTotal) {
    logger.warning(`COMPUTE services: ${colors.green}${computeHealthy}${colors.reset}/${colors.yellow}${computeTotal}${colors.reset} healthy`);
  }
}

// Start periodic health checks (less frequent to reduce noise)
setInterval(healthCheck, HEALTH_CHECK_INTERVAL * 2); // Check every 20 seconds instead of 10
healthCheck(); // Run immediately on startup

// Proxy request to service
async function proxyRequest(req, res, serviceType) {
  const requestStartTime = Date.now();
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const service = getNextHealthyService(serviceType);
      const targetUrl = `${service.url}${req.path}`;
      const attemptStartTime = Date.now();

      // Prepare headers - remove host and connection headers that shouldn't be forwarded
      const headers = { ...req.headers };
      delete headers.host;
      delete headers.connection;
      
      // Ensure Content-Type is set for POST/PUT requests with body
      if ((req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') && req.body) {
        if (!headers['content-type']) {
          headers['content-type'] = 'application/json';
        }
      }

      const axiosConfig = {
        method: req.method,
        url: targetUrl,
        headers: headers,
        timeout: REQUEST_TIMEOUT,
        validateStatus: () => true,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      };

      if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
        axiosConfig.data = req.body;
        delete headers['content-length'];
      }

      const response = await axios(axiosConfig);
      const responseTime = Date.now() - attemptStartTime;
      const totalTime = Date.now() - requestStartTime;

      // Mark service as healthy on successful request
      if (service.failures > 0) {
        service.failures = 0;
      }

      // Log the request with port number highlighted
      const port = new URL(service.url).port;
      logger.request(req.method, req.path, service.url, response.status, responseTime, port);

      // Track request metrics
      trackRequest(service.url, response.status < 400);

      return res.status(response.status).json(response.data);

    } catch (error) {
      attempts++;
      const responseTime = Date.now() - requestStartTime;

      if (error.config?.url) {
        const failedUrl = new URL(error.config.url).origin;
        markServiceUnhealthy(serviceType, failedUrl);
      }

      if (attempts >= maxAttempts) {
        logger.error(`Request ${colors.cyan}${req.method} ${req.path}${colors.reset} failed after ${maxAttempts} attempts (${responseTime}ms)`);
        
        // Track failed request (if we know which service failed)
        if (error.config?.url) {
          const failedUrl = new URL(error.config.url).origin;
          trackRequest(failedUrl, false);
        }
        
        return res.status(503).json({
          error: 'Service unavailable',
          message: `Failed to reach ${serviceType} service after ${maxAttempts} attempts`,
          timestamp: new Date().toISOString()
        });
      }

      logger.warning(`Request ${colors.cyan}${req.method} ${req.path}${colors.reset} failed (attempt ${attempts}/${maxAttempts}): ${error.message}`);

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

// Route handlers
app.all('/api/auth/*', (req, res) => proxyRequest(req, res, 'auth'));
app.all('/api/data/*', (req, res) => proxyRequest(req, res, 'data'));
app.all('/api/compute/*', (req, res) => proxyRequest(req, res, 'compute'));

// Load balancer health endpoint - returns load balancer's own health status
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

  // Determine overall load balancer health
  const allServicesHealthy = Object.values(healthStatus).every(
    status => status.unhealthy === 0
  );

  res.json({
    status: allServicesHealthy ? 'healthy' : 'degraded',
    loadBalancer: 'operational',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: healthStatus
  });
});

// Track request metrics
function trackRequest(serviceUrl, isSuccess) {
  if (!requestMetrics.has(serviceUrl)) {
    requestMetrics.set(serviceUrl, {
      total: 0,
      success: 0,
      failed: 0,
      recentRequests: []
    });
  }
  
  const metrics = requestMetrics.get(serviceUrl);
  metrics.total++;
  
  if (isSuccess) {
    metrics.success++;
  } else {
    metrics.failed++;
  }
  
  // Keep only last 60 seconds of requests for rate calculation
  const now = Date.now();
  metrics.recentRequests = metrics.recentRequests.filter(
    time => now - time < 60000
  );
  metrics.recentRequests.push(now);
}

// Get request metrics
function getRequestMetrics() {
  const metrics = {};
  for (const [serviceType, serviceList] of Object.entries(services)) {
    serviceList.forEach(service => {
      const serviceMetrics = requestMetrics.get(service.url);
      if (serviceMetrics) {
        metrics[service.url] = {
          name: `${serviceType}-${service.url.split(':').pop()}`,
          type: serviceType,
          url: service.url,
          total: serviceMetrics.total,
          success: serviceMetrics.success,
          failed: serviceMetrics.failed,
          requestsPerSecond: (serviceMetrics.recentRequests.length / 60).toFixed(2),
          successRate: serviceMetrics.total > 0 
            ? ((serviceMetrics.success / serviceMetrics.total) * 100).toFixed(2) + '%'
            : '0%'
        };
      } else {
        // Initialize empty metrics
        metrics[service.url] = {
          name: `${serviceType}-${service.url.split(':').pop()}`,
          type: serviceType,
          url: service.url,
          total: 0,
          success: 0,
          failed: 0,
          requestsPerSecond: '0.00',
          successRate: '0%'
        };
      }
    });
  }
  return metrics;
}

// Service status endpoint
app.get('/status', (req, res) => {
  res.json({
    services,
    roundRobin,
    requestMetrics: getRequestMetrics(),
    timestamp: new Date().toISOString()
  });
});

// Request metrics endpoint (for fault detector)
app.get('/api/metrics', (req, res) => {
  res.json({
    metrics: getRequestMetrics(),
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error(`Internal error: ${err.message}`);
  res.status(500).json({
    error: 'Load balancer error',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  logger.success(`${colors.bright}Load Balancer started${colors.reset}`);
  logger.info(`Listening on port ${colors.cyan}${PORT}${colors.reset}`);
  console.log('='.repeat(60));
  
  logger.info(`${colors.bright}Service Configuration:${colors.reset}`);
  for (const [serviceType, serviceList] of Object.entries(services)) {
    console.log(`  ${colors.blue}${serviceType.toUpperCase()}${colors.reset}:`);
    serviceList.forEach((service, index) => {
      const status = service.healthy ? 
        `${colors.green}●${colors.reset} healthy` : 
        `${colors.red}●${colors.reset} unhealthy`;
      console.log(`    ${index + 1}. ${colors.magenta}${service.url}${colors.reset} - ${status}`);
    });
  }
  console.log('='.repeat(60) + '\n');
});

module.exports = app;