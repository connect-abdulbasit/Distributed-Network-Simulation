const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const alerts = require('./alerts');

// Load services configuration
const servicesConfig = require('./services.json');

// Service health tracking
const serviceHealth = new Map();

const CHECK_INTERVAL = 5000; // 5 seconds
const ALERT_THRESHOLD = 3; // Alert after 3 consecutive failures
const RESPONSE_TIME_WARNING = 1000; // Warn if response time > 1s

// Initialize health tracking
function initializeHealthTracking() {
  for (const [serviceType, instances] of Object.entries(servicesConfig.services)) {
    for (const instance of instances) {
      serviceHealth.set(instance.url, {
        name: instance.name,
        type: serviceType,
        url: instance.url,
        status: 'unknown',
        consecutiveFailures: 0,
        lastCheck: null,
        lastSuccess: null,
        responseTime: null,
        uptime: 0,
        totalChecks: 0,
        successfulChecks: 0
      });
    }
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

      // Alert if service recovered
      if (wasUnhealthy) {
        alerts.sendRecoveryAlert(healthData);
      }

      // Warn if response time is slow
      if (responseTime > RESPONSE_TIME_WARNING) {
        logger.logWarning(healthData.name, `Slow response time: ${responseTime}ms`);
        alerts.sendSlowResponseAlert(healthData, responseTime);
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

    // Send alert if threshold reached
    if (healthData.consecutiveFailures >= ALERT_THRESHOLD) {
      alerts.sendFailureAlert(healthData, error.message);
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
const app = express();
const PORT = process.env.PORT || 3004;

app.use(express.json());

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
  
  res.json({
    summary,
    services: status,
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
  
  res.json({
    message: 'Health check completed',
    status,
    timestamp: new Date().toISOString()
  });
});

// Start server and monitoring
app.listen(PORT, () => {
  console.log(`[FAULT DETECTOR] Running on port ${PORT}`);
  
  // Initialize and start monitoring
  initializeHealthTracking();
  checkAllServices(); // Run immediately
  
  // Schedule periodic checks
  setInterval(checkAllServices, CHECK_INTERVAL);
});

module.exports = app;