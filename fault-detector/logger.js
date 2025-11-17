const fs = require('fs');
const path = require('path');

const LOG_DIR = process.env.LOG_DIR || './logs';
const LOG_FILE = path.join(LOG_DIR, 'fault-detector.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function formatLog(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...(data && { data })
  };
  return JSON.stringify(logEntry);
}

function writeLog(logEntry) {
  console.log(logEntry);
  fs.appendFileSync(LOG_FILE, logEntry + '\n');
}

exports.log = (message, data = null) => {
  writeLog(formatLog('INFO', message, data));
};

exports.logError = (message, error = null) => {
  writeLog(formatLog('ERROR', message, error));
};

exports.logWarning = (serviceName, message) => {
  writeLog(formatLog('WARNING', `[${serviceName}] ${message}`));
};

exports.logHealthCheck = (serviceName, status, responseTime, error = null) => {
  const message = `[${serviceName}] Health check: ${status} (${responseTime}ms)`;
  const data = error ? { error } : null;
  writeLog(formatLog('INFO', message, data));
};

exports.logSummary = (summary) => {
  writeLog(formatLog('SUMMARY', 'Health check summary', summary));
};