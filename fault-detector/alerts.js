const logger = require('./logger');

// Alert cooldown to prevent spam
const alertCooldown = new Map();
const COOLDOWN_PERIOD = 60000; // 1 minute

function canSendAlert(serviceUrl, alertType) {
  const key = `${serviceUrl}-${alertType}`;
  const lastAlert = alertCooldown.get(key);
  
  if (!lastAlert) {
    return true;
  }
  
  return Date.now() - lastAlert > COOLDOWN_PERIOD;
}

function recordAlert(serviceUrl, alertType) {
  const key = `${serviceUrl}-${alertType}`;
  alertCooldown.set(key, Date.now());
}

exports.sendFailureAlert = (healthData, errorMessage) => {
  if (!canSendAlert(healthData.url, 'failure')) {
    return;
  }

  const alert = {
    type: 'SERVICE_FAILURE',
    severity: 'CRITICAL',
    service: healthData.name,
    serviceType: healthData.type,
    url: healthData.url,
    consecutiveFailures: healthData.consecutiveFailures,
    error: errorMessage,
    timestamp: new Date().toISOString()
  };

  logger.logError(`ALERT: ${healthData.name} is down!`, alert);
  
  // TODO: Integrate with alerting systems (PagerDuty, Slack, Email, etc.)
  console.error('\n🚨 CRITICAL ALERT 🚨');
  console.error(JSON.stringify(alert, null, 2));
  console.error('');

  recordAlert(healthData.url, 'failure');
};

exports.sendRecoveryAlert = (healthData) => {
  if (!canSendAlert(healthData.url, 'recovery')) {
    return;
  }

  const alert = {
    type: 'SERVICE_RECOVERY',
    severity: 'INFO',
    service: healthData.name,
    serviceType: healthData.type,
    url: healthData.url,
    timestamp: new Date().toISOString()
  };

  logger.log(`ALERT: ${healthData.name} has recovered!`, alert);
  
  console.log('\n✅ RECOVERY ALERT ✅');
  console.log(JSON.stringify(alert, null, 2));
  console.log('');

  recordAlert(healthData.url, 'recovery');
};

exports.sendSlowResponseAlert = (healthData, responseTime) => {
  if (!canSendAlert(healthData.url, 'slow')) {
    return;
  }

  const alert = {
    type: 'SLOW_RESPONSE',
    severity: 'WARNING',
    service: healthData.name,
    serviceType: healthData.type,
    url: healthData.url,
    responseTime: `${responseTime}ms`,
    timestamp: new Date().toISOString()
  };

  logger.logWarning(healthData.name, `Slow response: ${responseTime}ms`);
  
  console.warn('\n⚠️  PERFORMANCE WARNING ⚠️');
  console.warn(JSON.stringify(alert, null, 2));
  console.warn('');

  recordAlert(healthData.url, 'slow');
};