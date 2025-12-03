const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const alerts = require('./alerts');

const servicesConfig = require('./services.json');

const SERVICE_HOST = process.env.SERVICE_HOST || 'localhost';
const IS_LOCAL = SERVICE_HOST === 'localhost';
const SERVICE_REGISTRY_URL = process.env.SERVICE_REGISTRY_URL || 'http://localhost:3005';
const USE_SERVICE_REGISTRY = process.env.USE_SERVICE_REGISTRY !== 'false';

const serviceHealth = new Map();

const requestMetrics = new Map();

const CHECK_INTERVAL = 5000;
const ALERT_THRESHOLD = 3;
const RESPONSE_TIME_WARNING = 1000;

function getServiceUrl(instanceUrl, serviceType) {
  if (IS_LOCAL) {
    const url = new URL(instanceUrl);
    const hostname = url.hostname;
    if (hostname.includes('auth-service-1')) return 'http://localhost:3001';
    if (hostname.includes('auth-service-2')) return 'http://localhost:3002';
    if (hostname.includes('auth-service-3')) return 'http://localhost:3003';
    
    if (hostname.includes('data-service-1')) return 'http://localhost:4002';
    if (hostname.includes('data-service-2')) return 'http://localhost:4003';
    if (hostname.includes('data-service-3')) return 'http://localhost:4004';
    
    if (hostname.includes('compute-service-1')) return 'http://localhost:5002';
    if (hostname.includes('compute-service-2')) return 'http://localhost:5003';
    if (hostname.includes('compute-service-3')) return 'http://localhost:5004';
    
    if (hostname.includes('load-balancer')) return 'http://localhost:3000';
    
    return instanceUrl.replace(hostname, 'localhost');
  }
  
  return instanceUrl;
}

function createHealthEntry(name, type, url, registryManaged = false) {
  return {
    name,
    type,
    url,
    status: 'unknown',
    consecutiveFailures: 0,
    lastCheck: null,
    lastSuccess: null,
    responseTime: null,
    uptime: 0,
    totalChecks: 0,
    successfulChecks: 0,
    registryManaged
  };
}

function createMetricsEntry() {
  return {
    total: 0,
    success: 0,
    failed: 0,
    lastRequest: null,
    requestsPerSecond: 0,
    recentRequests: []
  };
}

function ensureServiceTracked({ name, type, url, registryManaged = false }) {
  const normalizedUrl = getServiceUrl(url, type);
  if (!serviceHealth.has(normalizedUrl)) {
    serviceHealth.set(normalizedUrl, createHealthEntry(name, type, normalizedUrl, registryManaged));
    requestMetrics.set(normalizedUrl, createMetricsEntry());
  } else {
    const entry = serviceHealth.get(normalizedUrl);
    entry.name = name;
    entry.type = type;
    entry.registryManaged = registryManaged;
  }
}

function loadStaticServices() {
  for (const [serviceType, instances] of Object.entries(servicesConfig.services)) {
    instances.forEach(instance => {
      ensureServiceTracked({
        name: instance.name,
        type: serviceType,
        url: instance.url,
        registryManaged: false
      });
    });
  }
}

async function fetchServicesFromRegistry() {
  try {
    const response = await axios.get(`${SERVICE_REGISTRY_URL}/api/registry/services`);
    return response.data.services || [];
  } catch (error) {
    console.error('[FAULT DETECTOR] Failed to fetch services from registry:', error.message);
    return null;
  }
}

async function syncServicesFromRegistry() {
  if (!USE_SERVICE_REGISTRY) {
    return;
  }

  const registryServices = await fetchServicesFromRegistry();
  if (!registryServices || registryServices.length === 0) {
    return;
  }

  const registryUrls = new Set();

  registryServices.forEach(service => {
    const serviceType = service.serviceType || service.type;
    if (!serviceType || !service.url) {
      return;
    }

    const normalizedUrl = getServiceUrl(service.url, serviceType);
    registryUrls.add(normalizedUrl);

    ensureServiceTracked({
      name: service.name || service.serviceId || `${serviceType}-${normalizedUrl}`,
      type: serviceType,
      url: service.url,
      registryManaged: true
    });
  });

  const servicesToRemove = [];
  for (const [url, health] of serviceHealth.entries()) {
    if (!registryUrls.has(url)) {
      servicesToRemove.push({ url, health });
    }
  }

  servicesToRemove.forEach(({ url, health }) => {
    if (health.registryManaged) {
      console.log(`[FAULT DETECTOR] Removing service ${health.name} (${url}) - no longer in registry`);
    } else {
      console.log(`[FAULT DETECTOR] Removing static service ${health.name} (${url}) - not found in registry`);
    }
    serviceHealth.delete(url);
    requestMetrics.delete(url);
  });
}

async function initializeHealthTracking() {
  if (USE_SERVICE_REGISTRY) {
    await syncServicesFromRegistry();
    if (serviceHealth.size === 0) {
      console.log('[FAULT DETECTOR] No services found in registry, loading static services as fallback');
      loadStaticServices();
    } else {
      const loadBalancerUrl = getServiceUrl('http://localhost:3000', 'loadbalancer');
      if (!serviceHealth.has(loadBalancerUrl)) {
        ensureServiceTracked({
          name: 'load-balancer',
          type: 'loadbalancer',
          url: 'http://localhost:3000',
          registryManaged: false
        });
      }
    }
  } else {
    loadStaticServices();
  }
  console.log(`[FAULT DETECTOR] Monitoring ${serviceHealth.size} services`);
  if (IS_LOCAL) {
    console.log(`[FAULT DETECTOR] Running in LOCAL mode (using localhost)`);
    Array.from(serviceHealth.values()).forEach(health => {
      console.log(`  - ${health.name}: ${health.url} ${health.registryManaged ? '(registry)' : '(static)'}`);
    });
  } else {
    console.log(`[FAULT DETECTOR] Running in DOCKER mode (using ${SERVICE_HOST})`);
  }
}

async function checkServiceHealth(serviceUrl) {
  const startTime = Date.now();
  const healthData = serviceHealth.get(serviceUrl);

  try {
    const response = await axios.get(`${serviceUrl}/health`, {
      timeout: 5000
    });

    const responseTime = Date.now() - startTime;
    const now = new Date().toISOString();

    if (response.status === 200) {
      const wasUnhealthy = healthData.status === 'unhealthy';
      
      healthData.status = 'healthy';
      healthData.consecutiveFailures = 0;
      healthData.lastCheck = now;
      healthData.lastSuccess = now;
      healthData.responseTime = responseTime;
      healthData.totalChecks++;
      healthData.successfulChecks++;

      healthData.uptime = (healthData.successfulChecks / healthData.totalChecks) * 100;

      logger.logHealthCheck(healthData.name, 'healthy', responseTime);

      emitWebSocketEvent('service-health-update', {
        type: 'health-update',
        service: {
          name: healthData.name,
          type: healthData.type,
          url: healthData.url,
          status: 'healthy',
          responseTime: responseTime,
          uptime: healthData.uptime.toFixed(2) + '%',
          lastCheck: now
        }
      });

      if (wasUnhealthy) {
        alerts.sendRecoveryAlert(healthData);
        emitWebSocketEvent('service-recovery', {
          type: 'recovery',
          service: {
            name: healthData.name,
            type: healthData.type,
            url: healthData.url,
            status: 'healthy',
            responseTime: responseTime
          }
        });
      }

      if (responseTime > RESPONSE_TIME_WARNING) {
        logger.logWarning(healthData.name, `Slow response time: ${responseTime}ms`);
        alerts.sendSlowResponseAlert(healthData, responseTime);
        emitWebSocketEvent('slow-response', {
          type: 'slow-response',
          service: {
            name: healthData.name,
            type: healthData.type,
            url: healthData.url,
            responseTime: responseTime
          }
        });
      }

      return true;
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const now = new Date().toISOString();

    healthData.status = 'unhealthy';
    healthData.consecutiveFailures++;
    healthData.lastCheck = now;
    healthData.responseTime = responseTime;
    healthData.totalChecks++;
    healthData.uptime = (healthData.successfulChecks / healthData.totalChecks) * 100;

    logger.logHealthCheck(healthData.name, 'unhealthy', responseTime, error.message);

    emitWebSocketEvent('service-health-update', {
      type: 'health-update',
      service: {
        name: healthData.name,
        type: healthData.type,
        url: healthData.url,
        status: 'unhealthy',
        consecutiveFailures: healthData.consecutiveFailures,
        responseTime: responseTime,
        uptime: healthData.uptime.toFixed(2) + '%',
        lastCheck: now,
        error: error.message
      }
    });

    if (healthData.consecutiveFailures >= ALERT_THRESHOLD) {
      alerts.sendFailureAlert(healthData, error.message);
      emitWebSocketEvent('service-failure', {
        type: 'failure',
        severity: 'CRITICAL',
        service: {
          name: healthData.name,
          type: healthData.type,
          url: healthData.url,
          consecutiveFailures: healthData.consecutiveFailures,
          error: error.message
        }
      });
    }

    return false;
  }
}

async function checkAllServices() {
  if (USE_SERVICE_REGISTRY) {
    await syncServicesFromRegistry();
    const loadBalancerUrl = getServiceUrl('http://localhost:3000', 'loadbalancer');
    if (!serviceHealth.has(loadBalancerUrl)) {
      ensureServiceTracked({
        name: 'load-balancer',
        type: 'loadbalancer',
        url: 'http://localhost:3000',
        registryManaged: false
      });
    }
  }
  logger.log('Running health checks on all services...');

  const checks = Array.from(serviceHealth.keys()).map(url => 
    checkServiceHealth(url)
  );

  await Promise.all(checks);

  const summary = generateHealthSummary();
  logger.logSummary(summary);
  
  const status = getHealthStatus();
  const metrics = getRequestMetrics();
  emitWebSocketEvent('health-summary', {
    type: 'summary',
    summary,
    services: status,
    requestMetrics: metrics
  });
}

function generateHealthSummary() {
  const summary = {
    timestamp: new Date().toISOString(),
    total: serviceHealth.size,
    healthy: 0,
    unhealthy: 0,
    unknown: 0,
    services: {}
  };

  for (const [url, health] of serviceHealth.entries()) {
    if (health.status === 'healthy') summary.healthy++;
    else if (health.status === 'unhealthy') summary.unhealthy++;
    else summary.unknown++;

    if (!summary.services[health.type]) {
      summary.services[health.type] = {
        total: 0,
        healthy: 0,
        unhealthy: 0
      };
    }

    summary.services[health.type].total++;
    if (health.status === 'healthy') {
      summary.services[health.type].healthy++;
    } else if (health.status === 'unhealthy') {
      summary.services[health.type].unhealthy++;
    }
  }

  return summary;
}

function getHealthStatus() {
  const status = {};
  
  for (const [url, health] of serviceHealth.entries()) {
    if (!status[health.type]) {
      status[health.type] = [];
    }
    status[health.type].push({
      name: health.name,
      url: health.url,
      status: health.status,
      consecutiveFailures: health.consecutiveFailures,
      responseTime: health.responseTime,
      uptime: health.uptime ? health.uptime.toFixed(2) + '%' : 'N/A',
      lastCheck: health.lastCheck,
      lastSuccess: health.lastSuccess
    });
  }

  return status;
}

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 3004;

app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/dashboard.html');
});

io.on('connection', (socket) => {
  console.log(`[WebSocket] Client connected: ${socket.id}`);
  
  const status = getHealthStatus();
  const summary = generateHealthSummary();
  const metrics = getRequestMetrics();
  socket.emit('health-status', {
    summary,
    services: status,
    requestMetrics: metrics,
    timestamp: new Date().toISOString()
  });
  
  socket.on('disconnect', () => {
    console.log(`[WebSocket] Client disconnected: ${socket.id}`);
  });
  
  socket.on('request-status', () => {
    const status = getHealthStatus();
    const summary = generateHealthSummary();
    const metrics = getRequestMetrics();
    socket.emit('health-status', {
      summary,
      services: status,
      requestMetrics: metrics,
      timestamp: new Date().toISOString()
    });
  });
});

function updateRequestRate(serviceUrl) {
  const metrics = requestMetrics.get(serviceUrl);
  if (!metrics) return;
  
  const now = Date.now();
  metrics.recentRequests = metrics.recentRequests.filter(
    time => now - time < 60000
  );
  metrics.recentRequests.push(now);
  metrics.requestsPerSecond = metrics.recentRequests.length / 60;
}

function getRequestMetrics() {
  const metrics = {};
  for (const [url, health] of serviceHealth.entries()) {
    const requestData = requestMetrics.get(url);
    if (requestData) {
      metrics[url] = {
        name: health.name,
        type: health.type,
        url: url,
        total: requestData.total,
        success: requestData.success,
        failed: requestData.failed,
        requestsPerSecond: requestData.requestsPerSecond.toFixed(2),
        lastRequest: requestData.lastRequest,
        successRate: requestData.total > 0 
          ? ((requestData.success / requestData.total) * 100).toFixed(2) + '%'
          : '0%'
      };
    }
  }
  
  const lbUrl = LOAD_BALANCER_URL || 'http://localhost:3000';
  const lbMetrics = requestMetrics.get(lbUrl);
  if (lbMetrics) {
    metrics[lbUrl] = {
      name: 'load-balancer',
      type: 'loadbalancer',
      url: lbUrl,
      total: lbMetrics.total,
      success: lbMetrics.success,
      failed: lbMetrics.failed,
      requestsPerSecond: lbMetrics.requestsPerSecond.toFixed(2),
      lastRequest: lbMetrics.lastRequest,
      successRate: lbMetrics.total > 0 
        ? ((lbMetrics.success / lbMetrics.total) * 100).toFixed(2) + '%'
        : '0%'
    };
  }
  
  return metrics;
}

function emitWebSocketEvent(event, data) {
  io.emit(event, {
    ...data,
    timestamp: new Date().toISOString()
  });
}

const LOAD_BALANCER_URL = process.env.LOAD_BALANCER_URL || 'http://localhost:3000';

let previousMetrics = {};

async function fetchRequestMetricsFromLoadBalancer() {
  try {
    const response = await axios.get(`${LOAD_BALANCER_URL}/api/metrics`, {
      timeout: 2000
    });
    
    if (response.data && response.data.metrics) {
      for (const [url, metrics] of Object.entries(response.data.metrics)) {
        if (metrics.type === 'loadbalancer' || url === 'load-balancer') {
          const lbUrl = metrics.url || 'http://localhost:3000';
          if (!requestMetrics.has(lbUrl)) {
            requestMetrics.set(lbUrl, createMetricsEntry());
            serviceHealth.set(lbUrl, createHealthEntry('load-balancer', 'loadbalancer', lbUrl, false));
          }
          const existingMetrics = requestMetrics.get(lbUrl);
          const prev = previousMetrics[url] || { total: 0, success: 0, failed: 0, failuresByServiceType: { auth: 0, data: 0, compute: 0 } };
          
          if (metrics.failuresByServiceType) {
            const prevFailures = prev.failuresByServiceType || { auth: 0, data: 0, compute: 0 };
            
            ['auth', 'data', 'compute'].forEach(serviceType => {
              const newFailures = (metrics.failuresByServiceType[serviceType] || 0) - (prevFailures[serviceType] || 0);
              if (newFailures > 0) {
                let firstServiceUrl = null;
                for (const [serviceUrl, health] of serviceHealth.entries()) {
                  if (health.type === serviceType) {
                    firstServiceUrl = serviceUrl;
                    break;
                  }
                }
                
                if (firstServiceUrl) {
                  const serviceMetrics = requestMetrics.get(firstServiceUrl);
                  const health = serviceHealth.get(firstServiceUrl);
                  if (serviceMetrics) {
                    serviceMetrics.failed += newFailures;
                    serviceMetrics.total += newFailures;
                    for (let i = 0; i < newFailures; i++) {
                      emitWebSocketEvent('request-event', {
                        type: 'request',
                        service: {
                          name: health.name,
                          url: firstServiceUrl,
                          type: serviceType
                        },
                        status: 'failed',
                        timestamp: new Date().toISOString()
                      });
                    }
                  }
                }
              }
            });
          }
          
          if (metrics.failed > prev.failed) {
            const newFailures = metrics.failed - prev.failed;
            for (let i = 0; i < newFailures; i++) {
              emitWebSocketEvent('request-event', {
                type: 'request',
                service: {
                  name: 'load-balancer',
                  url: lbUrl,
                  type: 'loadbalancer'
                },
                status: 'failed',
                timestamp: new Date().toISOString()
              });
            }
          }
          
          existingMetrics.total = metrics.total;
          existingMetrics.success = metrics.success;
          existingMetrics.failed = metrics.failed;
          existingMetrics.lastRequest = new Date().toISOString();
          existingMetrics.requestsPerSecond = parseFloat(metrics.requestsPerSecond);
          updateRequestRate(lbUrl);
          continue;
        }
        
        for (const [serviceUrl, health] of serviceHealth.entries()) {
          const servicePort = new URL(serviceUrl).port;
          const metricsPort = new URL(metrics.url).port;
          
          if (serviceUrl === metrics.url || servicePort === metricsPort) {
            const existingMetrics = requestMetrics.get(serviceUrl);
            if (existingMetrics) {
              const prev = previousMetrics[url] || { total: 0, success: 0, failed: 0 };
              
              if (metrics.total > prev.total) {
                const isSuccess = metrics.success > prev.success;
                emitWebSocketEvent('request-event', {
                  type: 'request',
                  service: {
                    name: health.name,
                    url: serviceUrl,
                    type: health.type
                  },
                  status: isSuccess ? 'success' : 'failed',
                  timestamp: new Date().toISOString()
                });
              }
              
              existingMetrics.total = metrics.total;
              existingMetrics.success = metrics.success;
              existingMetrics.failed = metrics.failed;
              existingMetrics.lastRequest = new Date().toISOString();
              existingMetrics.requestsPerSecond = parseFloat(metrics.requestsPerSecond);
              updateRequestRate(serviceUrl);
            }
            break;
          }
        }
      }
      
      previousMetrics = JSON.parse(JSON.stringify(response.data.metrics));
      
      const allMetrics = getRequestMetrics();
      emitWebSocketEvent('request-metrics', {
        type: 'metrics',
        metrics: allMetrics
      });
    }
  } catch (error) {
    if (!error.message.includes('ECONNREFUSED')) {
      console.error('[FAULT DETECTOR] Failed to fetch metrics from load balancer:', error.message);
    }
  }
}

setInterval(fetchRequestMetricsFromLoadBalancer, 1000);
fetchRequestMetricsFromLoadBalancer();

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'fault-detector',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/status', (req, res) => {
  const status = getHealthStatus();
  const summary = generateHealthSummary();
  const metrics = getRequestMetrics();
  
  res.json({
    summary,
    services: status,
    requestMetrics: metrics,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/status/:serviceType', (req, res) => {
  const { serviceType } = req.params;
  const status = getHealthStatus();

  if (!status[serviceType]) {
    return res.status(404).json({ error: 'Service type not found' });
  }

  res.json({
    serviceType,
    services: status[serviceType],
    timestamp: new Date().toISOString()
  });
});

app.post('/api/check', async (req, res) => {
  await checkAllServices();
  const status = getHealthStatus();
  const metrics = getRequestMetrics();
  
  res.json({
    message: 'Health check completed',
    status,
    requestMetrics: metrics,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/metrics', (req, res) => {
  const metrics = getRequestMetrics();
  res.json({
    metrics,
    timestamp: new Date().toISOString()
  });
});

async function startMonitoring() {
  await initializeHealthTracking();
  await checkAllServices();
  setInterval(checkAllServices, CHECK_INTERVAL);
}

startMonitoring().catch(error => {
  console.error('[FAULT DETECTOR] Failed to start monitoring:', error);
});

server.listen(PORT, () => {
  console.log(`[FAULT DETECTOR] Running on port ${PORT}`);
  console.log(`[WebSocket] Server ready for connections on ws://localhost:${PORT}`);
});

module.exports = app;