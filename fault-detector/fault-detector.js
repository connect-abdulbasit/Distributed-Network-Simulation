const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const alerts = require('./alerts');

// Load services configuration
const servicesConfig = require('./services.json');

// Determine if running locally or in Docker/Kubernetes
const SERVICE_HOST = process.env.SERVICE_HOST || 'localhost';
const IS_LOCAL = SERVICE_HOST === 'localhost';

// Service health tracking
const serviceHealth = new Map();

// Request metrics tracking
const requestMetrics = new Map(); // url -> { total, success, failed, lastRequest }

const CHECK_INTERVAL = 5000; // 5 seconds
const ALERT_THRESHOLD = 3; // Alert after 3 consecutive failures
const RESPONSE_TIME_WARNING = 1000; // Warn if response time > 1s

// Convert service URLs based on environment (local vs Docker)
function getServiceUrl(instanceUrl, serviceType) {
  if (IS_LOCAL) {
    // For local development, use localhost with correct ports
    const url = new URL(instanceUrl);
    const hostname = url.hostname;
    
    // Map Docker service names to localhost ports
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
    
    // Fallback: replace hostname with localhost, keep port
    return instanceUrl.replace(hostname, 'localhost');
  }
  
  // For Docker/Kubernetes, use original URL
  return instanceUrl;
}

// Initialize health tracking
function initializeHealthTracking() {
  for (const [serviceType, instances] of Object.entries(servicesConfig.services)) {
    for (const instance of instances) {
      const serviceUrl = getServiceUrl(instance.url, serviceType);
      serviceHealth.set(serviceUrl, {
        name: instance.name,
        type: serviceType,
        url: serviceUrl,
        status: 'unknown',
        consecutiveFailures: 0,
        lastCheck: null,
        lastSuccess: null,
        responseTime: null,
        uptime: 0,
        totalChecks: 0,
        successfulChecks: 0
      });
      
      // Initialize request metrics
      requestMetrics.set(serviceUrl, {
        total: 0,
        success: 0,
        failed: 0,
        lastRequest: null,
        requestsPerSecond: 0,
        recentRequests: [] // Last 60 seconds of requests
      });
    }
  }
  
  // Log service URLs being monitored
  console.log(`[FAULT DETECTOR] Monitoring ${serviceHealth.size} services`);
  if (IS_LOCAL) {
    console.log(`[FAULT DETECTOR] Running in LOCAL mode (using localhost)`);
    Array.from(serviceHealth.values()).forEach(health => {
      console.log(`  - ${health.name}: ${health.url}`);
    });
  } else {
    console.log(`[FAULT DETECTOR] Running in DOCKER mode (using ${SERVICE_HOST})`);
  }
}

// Check service health
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
      // Service is healthy
      const wasUnhealthy = healthData.status === 'unhealthy';
      
      healthData.status = 'healthy';
      healthData.consecutiveFailures = 0;
      healthData.lastCheck = now;
      healthData.lastSuccess = now;
      healthData.responseTime = responseTime;
      healthData.totalChecks++;
      healthData.successfulChecks++;

      // Calculate uptime percentage
      healthData.uptime = (healthData.successfulChecks / healthData.totalChecks) * 100;

      logger.logHealthCheck(healthData.name, 'healthy', responseTime);

      // Emit WebSocket event for health status update (NOT counting health checks as requests)
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

      // Alert if service recovered
      if (wasUnhealthy) {
        alerts.sendRecoveryAlert(healthData);
        // Emit recovery event via WebSocket
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

      // Warn if response time is slow
      if (responseTime > RESPONSE_TIME_WARNING) {
        logger.logWarning(healthData.name, `Slow response time: ${responseTime}ms`);
        alerts.sendSlowResponseAlert(healthData, responseTime);
        // Emit slow response warning via WebSocket
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
    // Service is unhealthy
    const responseTime = Date.now() - startTime;
    const now = new Date().toISOString();

    healthData.status = 'unhealthy';
    healthData.consecutiveFailures++;
    healthData.lastCheck = now;
    healthData.responseTime = responseTime;
    healthData.totalChecks++;
    healthData.uptime = (healthData.successfulChecks / healthData.totalChecks) * 100;

    logger.logHealthCheck(healthData.name, 'unhealthy', responseTime, error.message);

    // Emit WebSocket event for health status update (NOT counting health checks as requests)
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

    // Send alert if threshold reached
    if (healthData.consecutiveFailures >= ALERT_THRESHOLD) {
      alerts.sendFailureAlert(healthData, error.message);
      // Emit failure alert via WebSocket
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

// Check all services
async function checkAllServices() {
  logger.log('Running health checks on all services...');

  const checks = Array.from(serviceHealth.keys()).map(url => 
    checkServiceHealth(url)
  );

  await Promise.all(checks);

  // Generate summary
  const summary = generateHealthSummary();
  logger.logSummary(summary);
  
  // Emit periodic health summary via WebSocket
  const status = getHealthStatus();
  const metrics = getRequestMetrics();
  emitWebSocketEvent('health-summary', {
    type: 'summary',
    summary,
    services: status,
    requestMetrics: metrics
  });
}

// Generate health summary
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

// Get current health status
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

// Express API for fault detector
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
const PORT = process.env.PORT || 3005;

app.use(express.json());

// Serve dashboard HTML
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/dashboard.html');
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`[WebSocket] Client connected: ${socket.id}`);
  
  // Send current health status to newly connected client
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
  
  // Allow clients to request current status
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

// Update request rate (requests per second)
function updateRequestRate(serviceUrl) {
  const metrics = requestMetrics.get(serviceUrl);
  if (!metrics) return;
  
  const now = Date.now();
  // Keep only requests from last 60 seconds
  metrics.recentRequests = metrics.recentRequests.filter(
    time => now - time < 60000
  );
  metrics.recentRequests.push(now);
  metrics.requestsPerSecond = metrics.recentRequests.length / 60;
}

// Get request metrics for all services
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
  return metrics;
}

// Helper function to emit WebSocket events
function emitWebSocketEvent(event, data) {
  io.emit(event, {
    ...data,
    timestamp: new Date().toISOString()
  });
}

// Fetch request metrics from load balancer
const LOAD_BALANCER_URL = process.env.LOAD_BALANCER_URL || 'http://localhost:3000';

let previousMetrics = {}; // Track previous metrics to detect changes

async function fetchRequestMetricsFromLoadBalancer() {
  try {
    const response = await axios.get(`${LOAD_BALANCER_URL}/api/metrics`, {
      timeout: 2000
    });
    
    if (response.data && response.data.metrics) {
      // Update request metrics from load balancer
      for (const [url, metrics] of Object.entries(response.data.metrics)) {
        // Find matching service by URL (exact match or port match)
        for (const [serviceUrl, health] of serviceHealth.entries()) {
          const servicePort = new URL(serviceUrl).port;
          const metricsPort = new URL(metrics.url).port;
          
          if (serviceUrl === metrics.url || servicePort === metricsPort) {
            const existingMetrics = requestMetrics.get(serviceUrl);
            if (existingMetrics) {
              // Check if metrics changed (new request)
              const prev = previousMetrics[url] || { total: 0, success: 0, failed: 0 };
              
              if (metrics.total > prev.total) {
                // New request detected - emit event for animation
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
              
              // Update with load balancer metrics
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
      
      // Store current metrics for next comparison
      previousMetrics = JSON.parse(JSON.stringify(response.data.metrics));
      
      // Emit updated metrics
      const allMetrics = getRequestMetrics();
      emitWebSocketEvent('request-metrics', {
        type: 'metrics',
        metrics: allMetrics
      });
    }
  } catch (error) {
    // Silently fail - load balancer might not be available
    // Only log if it's a new error (not just connection refused)
    if (!error.message.includes('ECONNREFUSED')) {
      console.error('[FAULT DETECTOR] Failed to fetch metrics from load balancer:', error.message);
    }
  }
}

// Fetch request metrics from load balancer periodically
setInterval(fetchRequestMetricsFromLoadBalancer, 1000); // Every second
fetchRequestMetricsFromLoadBalancer(); // Fetch immediately

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'fault-detector',
    timestamp: new Date().toISOString()
  });
});

// Get service health status
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

// Get specific service status
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

// Manual health check trigger
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

// Get request metrics
app.get('/api/metrics', (req, res) => {
  const metrics = getRequestMetrics();
  res.json({
    metrics,
    timestamp: new Date().toISOString()
  });
});

// Start server and monitoring
server.listen(PORT, () => {
  console.log(`[FAULT DETECTOR] Running on port ${PORT}`);
  console.log(`[WebSocket] Server ready for connections on ws://localhost:${PORT}`);
  
  // Initialize and start monitoring
  initializeHealthTracking();
  checkAllServices(); // Run immediately
  
  // Schedule periodic checks
  setInterval(checkAllServices, CHECK_INTERVAL);
});

module.exports = app;