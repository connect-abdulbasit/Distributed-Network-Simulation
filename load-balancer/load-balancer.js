const express = require('express');
const axios = require('axios');
const path = require('path');
const { discoverServices } = require(path.join(__dirname, '../shared/utils/serviceRegistry'));

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const USE_DYNAMIC_DISCOVERY = process.env.USE_DYNAMIC_DISCOVERY !== 'false';
const SERVICE_DISCOVERY_INTERVAL = 15000;

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

const services = {
  auth: [],
  data: [],
  compute: []
};

const SERVICE_HOST = process.env.SERVICE_HOST || 'localhost';
const AUTH_PORTS = process.env.AUTH_PORTS ?
  process.env.AUTH_PORTS.split(',').map(p => parseInt(p.trim())) :
  [3001, 3002, 3003];
const DATA_PORTS = process.env.DATA_PORTS ?
  process.env.DATA_PORTS.split(',').map(p => parseInt(p.trim())) :
  [4002, 4003, 4004];
const COMPUTE_PORTS = process.env.COMPUTE_PORTS ?
  process.env.COMPUTE_PORTS.split(',').map(p => parseInt(p.trim())) :
  [5002, 5003, 5004];

function initializeStaticServices() {
  services.auth = AUTH_PORTS.map(port => ({
    url: `http://${SERVICE_HOST}:${port}`,
    healthy: true,
    failures: 0,
    serviceId: `static-auth-${port}`
  }));
  services.data = DATA_PORTS.map(port => ({
    url: `http://${SERVICE_HOST}:${port}`,
    healthy: true,
    failures: 0,
    serviceId: `static-data-${port}`
  }));
  services.compute = COMPUTE_PORTS.map(port => ({
    url: `http://${SERVICE_HOST}:${port}`,
    healthy: true,
    failures: 0,
    serviceId: `static-compute-${port}`
  }));
}

async function discoverServicesFromRegistry() {
  if (!USE_DYNAMIC_DISCOVERY) {
    return;
  }

  try {
    const [authServices, dataServices, computeServices] = await Promise.all([
      discoverServices('auth', true),
      discoverServices('data', true),
      discoverServices('compute', true)
    ]);

    const updateServiceList = (serviceType, discoveredServices) => {
      const existingServices = services[serviceType];
      const existingMap = new Map(existingServices.map(s => [s.url, s]));

      const newServices = discoveredServices.map(discovered => {
        const existing = existingMap.get(discovered.url);
        if (existing) {
          return {
            ...existing,
            serviceId: discovered.serviceId,
            name: discovered.name,
            metadata: discovered.metadata
          };
        } else {
          logger.info(`[DISCOVERY] New ${serviceType} service discovered: ${discovered.name} at ${discovered.url}`);
          return {
            url: discovered.url,
            healthy: true,
            failures: 0,
            serviceId: discovered.serviceId,
            name: discovered.name,
            metadata: discovered.metadata
          };
        }
      });

      const discoveredUrls = new Set(discoveredServices.map(s => s.url));
      const removedServices = existingServices.filter(s => !discoveredUrls.has(s.url));

      removedServices.forEach(service => {
        if (service.healthy) {
          logger.warning(`[DISCOVERY] ${serviceType} service removed from registry: ${service.url}`);
          service.healthy = false;
        }
      });

      return [...newServices, ...removedServices];
    };

    services.auth = updateServiceList('auth', authServices);
    services.data = updateServiceList('data', dataServices);
    services.compute = updateServiceList('compute', computeServices);

  } catch (error) {
    logger.warning(`[DISCOVERY] Failed to discover services: ${error.message}`);
    if (services.auth.length === 0 && services.data.length === 0 && services.compute.length === 0) {
      logger.info('[DISCOVERY] Falling back to static service configuration');
      initializeStaticServices();
    }
  }
}

const roundRobin = {
  auth: 0,
  data: 0,
  compute: 0
};

const requestMetrics = new Map();
const loadBalancerMetrics = {
  total: 0,
  success: 0,
  failed: 0,
  recentRequests: [],
  failuresByServiceType: {
    auth: 0,
    data: 0,
    compute: 0
  }
};

const MAX_FAILURES = 5;
const HEALTH_CHECK_INTERVAL = 10000;
const REQUEST_TIMEOUT = 10000;

function getNextHealthyService(serviceType) {
  const serviceList = services[serviceType];
  const healthyServices = serviceList.filter(s => s.healthy);

  if (healthyServices.length === 0) {
    throw new Error(`No healthy ${serviceType} services available`);
  }

  const index = roundRobin[serviceType] % healthyServices.length;
  roundRobin[serviceType]++;

  return healthyServices[index];
}

function markServiceUnhealthy(serviceType, serviceUrl) {

  const service = services[serviceType].find(s => s.url === serviceUrl);
  if (service) {
    service.failures++;
    if (service.failures > 100) {
      service.failures = 0;
    }
  }
}

async function healthCheck() {
  let healthyCount = 0;
  let unhealthyCount = 0;

  for (const [serviceType, serviceList] of Object.entries(services)) {
    for (const service of serviceList) {
      try {
        const startTime = Date.now();
        const timeout = serviceType === 'compute' ? 10000 : 3000;
        const response = await axios.get(`${service.url}/health`, {
          timeout: timeout
        });
        const responseTime = Date.now() - startTime;

        if (response.status === 200) {
          const wasUnhealthy = !service.healthy;
          service.healthy = true;
          service.failures = 0;

          if (serviceType === 'auth' || serviceType === 'data' || serviceType === 'compute') {
            const serviceTypeLabel = `${colors.blue}${serviceType.toUpperCase()}${colors.reset}`;
            if (wasUnhealthy) {
              logger.success(`${serviceTypeLabel} service ${colors.magenta}${service.url}${colors.reset} ${colors.green}RECOVERED${colors.reset} (${responseTime}ms)`);
            }
          }
          healthyCount++;
        }
      } catch (error) {

        const failureThreshold = serviceType === 'compute' ? MAX_FAILURES * 3 : MAX_FAILURES * 2;

        service.failures++;
        if (service.failures >= failureThreshold) {
          service.healthy = false;
          unhealthyCount++;
          const serviceTypeLabel = `${colors.blue}${serviceType.toUpperCase()}${colors.reset}`;
          logger.error(`${serviceTypeLabel} service ${colors.magenta}${service.url}${colors.reset} marked as ${colors.red}UNHEALTHY${colors.reset} (${service.failures} consecutive health check failures)`);
        } else {
          if (serviceType === 'auth' || serviceType === 'data' || serviceType === 'compute') {
            if (service.failures % 5 === 0) {
              const serviceTypeLabel = `${colors.blue}${serviceType.toUpperCase()}${colors.reset}`;
              logger.warning(`${serviceTypeLabel} service ${colors.magenta}${service.url}${colors.reset} health check slow/busy: ${error.message} (${service.failures}/${failureThreshold})`);
            }
          }
        }
      }
    }
  }

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

if (USE_DYNAMIC_DISCOVERY) {
  discoverServicesFromRegistry();
  setInterval(discoverServicesFromRegistry, SERVICE_DISCOVERY_INTERVAL);
} else {
  initializeStaticServices();
}

setInterval(healthCheck, HEALTH_CHECK_INTERVAL * 2);
healthCheck();

async function proxyRequest(req, res, serviceType) {
  const requestStartTime = Date.now();
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const service = getNextHealthyService(serviceType);
      const targetUrl = `${service.url}${req.path}`;
      const attemptStartTime = Date.now();

      const headers = { ...req.headers };
      delete headers.host;
      delete headers.connection;

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

      if (service.failures > 0) {
        service.failures = 0;
      }

      const port = new URL(service.url).port;
      logger.request(req.method, req.path, service.url, response.status, responseTime, port);

      trackRequest(service.url, response.status < 400);
      trackLoadBalancerRequest(response.status < 400, serviceType);

      return res.status(response.status).json(response.data);

    } catch (error) {
      attempts++;
      const responseTime = Date.now() - requestStartTime;

      if (attempts >= maxAttempts) {
        logger.error(`Request ${colors.cyan}${req.method} ${req.path}${colors.reset} failed after ${maxAttempts} attempts (${responseTime}ms)`);

        if (error.config?.url) {
          const failedUrl = new URL(error.config.url).origin;
          trackRequest(failedUrl, false);
        }

        trackLoadBalancerRequest(false, serviceType);

        return res.status(503).json({
          error: 'Service unavailable',
          message: `Failed to reach ${serviceType} service after ${maxAttempts} attempts - service may be busy`,
          timestamp: new Date().toISOString()
        });
      }

      logger.warning(`Request ${colors.cyan}${req.method} ${req.path}${colors.reset} failed (attempt ${attempts}/${maxAttempts}): ${error.message}`);

      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

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

  const now = Date.now();
  metrics.recentRequests = metrics.recentRequests.filter(
    time => now - time < 60000
  );
  metrics.recentRequests.push(now);
}

function trackLoadBalancerRequest(isSuccess, serviceType = null) {
  loadBalancerMetrics.total++;
  if (isSuccess) {
    loadBalancerMetrics.success++;
  } else {
    loadBalancerMetrics.failed++;
    if (serviceType && loadBalancerMetrics.failuresByServiceType.hasOwnProperty(serviceType)) {
      loadBalancerMetrics.failuresByServiceType[serviceType]++;
    }
  }
  const now = Date.now();
  loadBalancerMetrics.recentRequests = loadBalancerMetrics.recentRequests.filter(
    time => now - time < 60000
  );
  loadBalancerMetrics.recentRequests.push(now);
}

function getRequestMetrics() {
  const metrics = {};

  metrics['load-balancer'] = {
    name: 'load-balancer',
    type: 'loadbalancer',
    url: `http://localhost:${PORT}`,
    total: loadBalancerMetrics.total,
    success: loadBalancerMetrics.success,
    failed: loadBalancerMetrics.failed,
    requestsPerSecond: (loadBalancerMetrics.recentRequests.length / 60).toFixed(2),
    successRate: loadBalancerMetrics.total > 0
      ? ((loadBalancerMetrics.success / loadBalancerMetrics.total) * 100).toFixed(2) + '%'
      : '0%',
    failuresByServiceType: loadBalancerMetrics.failuresByServiceType
  };

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

app.all('/api/auth/*', (req, res) => proxyRequest(req, res, 'auth'));
app.all('/api/data/*', (req, res) => proxyRequest(req, res, 'data'));
app.all('/api/compute/*', (req, res) => proxyRequest(req, res, 'compute'));

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

app.get('/status', (req, res) => {
  res.json({
    services,
    roundRobin,
    requestMetrics: getRequestMetrics(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/metrics', (req, res) => {
  res.json({
    metrics: getRequestMetrics(),
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  logger.error(`Internal error: ${err.message}`);
  res.status(500).json({
    error: 'Load balancer error',
    message: err.message
  });
});

app.listen(PORT, async () => {
  console.log('\n' + '='.repeat(60));
  logger.success(`${colors.bright}Load Balancer started${colors.reset}`);
  logger.info(`Listening on port ${colors.cyan}${PORT}${colors.reset}`);

  if (USE_DYNAMIC_DISCOVERY) {
    logger.info(`${colors.bright}Service Discovery:${colors.reset} ${colors.green}DYNAMIC${colors.reset} (registry)`);
  } else {
    logger.info(`${colors.bright}Service Discovery:${colors.reset} ${colors.yellow}STATIC${colors.reset} (config)`);
    initializeStaticServices();
  }

  console.log('='.repeat(60));

  setTimeout(() => {
    logger.info(`${colors.bright}Service Configuration:${colors.reset}`);
    for (const [serviceType, serviceList] of Object.entries(services)) {
      if (serviceList.length > 0) {
        console.log(`  ${colors.blue}${serviceType.toUpperCase()}${colors.reset}:`);
        serviceList.forEach((service, index) => {
          const status = service.healthy ?
            `${colors.green}●${colors.reset} healthy` :
            `${colors.red}●${colors.reset} unhealthy`;
          const name = service.name ? ` (${service.name})` : '';
          console.log(`    ${index + 1}. ${colors.magenta}${service.url}${colors.reset}${name} - ${status}`);
        });
      } else {
        console.log(`  ${colors.blue}${serviceType.toUpperCase()}${colors.reset}: ${colors.yellow}No services discovered${colors.reset}`);
      }
    }
    console.log('='.repeat(60) + '\n');
  }, 2000);
});

module.exports = app;
