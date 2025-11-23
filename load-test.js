require('dotenv').config();

const axios = require('axios');

const LOAD_BALANCER_URL = process.env.LB_URL || 'http://localhost:3000';
const REQUESTS_PER_SECOND = parseInt(process.env.RPS || '10');
const DURATION_SECONDS = parseInt(process.env.DURATION || '30');
const ENDPOINT = process.env.ENDPOINT || '/health';
const SERVICE_TYPE = process.env.SERVICE_TYPE || 'both';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const stats = {
  total: 0,
  success: 0,
  failed: 0,
  errors: 0,
  responseTimes: [],
  statusCodes: {},
  startTime: null,
  endTime: null
};

function getHealthEndpoint() {
  if (ENDPOINT.includes('/health')) {
    return '/health';
  }
  return ENDPOINT;
}

function getServiceEndpoint() {
  if (ENDPOINT !== '/health') {
    return ENDPOINT;
  }
  if (SERVICE_TYPE === 'data') {
    return '/api/data/health';
  } else if (SERVICE_TYPE === 'auth') {
    return '/api/auth/health';
  } else if (SERVICE_TYPE === 'both') {
    return (stats.total % 2 === 0) ? '/api/auth/health' : '/api/data/health';
  }
  return '/health';
}

async function makeRequest() {
  const startTime = Date.now();
  stats.total++;

  try {
    const actualEndpoint = getServiceEndpoint();
    let url = `${LOAD_BALANCER_URL}${actualEndpoint}`;
    let response;
    const timestamp = Date.now();
    const randomId = Math.floor(Math.random() * 1000000);

    if (actualEndpoint.includes('/api/auth/register') || actualEndpoint.includes('/api/auth/login')) {
      response = await axios.post(url, {
        username: `testuser${timestamp}${randomId}`,
        email: `test${timestamp}${randomId}@example.com`,
        password: 'test123'
      }, {
        timeout: 5000,
        validateStatus: () => true
      });
    }
    else if (actualEndpoint === '/health') {
      response = await axios.get(url, {
        timeout: 5000,
        validateStatus: () => true
      });
    }
    else if (actualEndpoint.includes('/api/data')) {
      const urlObj = new URL(url);
      const method = urlObj.searchParams.get('method')?.toUpperCase();
      const pathname = urlObj.pathname;
      const keyMatch = pathname.match(/\/api\/data\/(.+)$/);
      const hasKey = keyMatch !== null;
      const testKey = hasKey ? keyMatch[1] : `test-key-${timestamp}-${randomId}`;
      if (method === 'PUT' && hasKey) {
        url = `${LOAD_BALANCER_URL}/api/data/${testKey}`;
        response = await axios.put(url, {
          value: {
            foo: 'updated-bar',
            timestamp: timestamp,
            updated: true
          },
          metadata: {
            source: 'load-test',
            updated: true
          }
        }, {
          timeout: 5000,
          validateStatus: () => true
        });
      } else if (method === 'DELETE' && hasKey) {
        url = `${LOAD_BALANCER_URL}/api/data/${testKey}`;
        response = await axios.delete(url, {
          timeout: 5000,
          validateStatus: () => true
        });
      } else if (method === 'GET' && !hasKey) {
        response = await axios.get(url, {
          timeout: 5000,
          validateStatus: () => true
        });
      } else if (hasKey && !method) {
        url = `${LOAD_BALANCER_URL}/api/data/${testKey}`;
        response = await axios.get(url, {
          timeout: 5000,
          validateStatus: () => true
        });
      } else {
        response = await axios.post(url, {
          key: `test-key-${timestamp}-${randomId}`,
          value: {
            foo: 'bar',
            timestamp: timestamp,
            random: randomId
          },
          metadata: {
            source: 'load-test',
            testId: randomId
          }
        }, {
          timeout: 5000,
          validateStatus: () => true
        });
      }
    }
    else {
      response = await axios.get(url, {
        timeout: 5000,
        validateStatus: () => true
      });
    }

    const responseTime = Date.now() - startTime;
    stats.responseTimes.push(responseTime);

    const statusCode = response.status;
    stats.statusCodes[statusCode] = (stats.statusCodes[statusCode] || 0) + 1;

    if (statusCode >= 200 && statusCode < 300) {
      stats.success++;
    } else if (statusCode >= 400 && statusCode < 500) {
      stats.failed++;
    } else {
      stats.errors++;
    }

    return { success: true, statusCode, responseTime };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    stats.responseTimes.push(responseTime);
    stats.errors++;
    stats.statusCodes['ERROR'] = (stats.statusCodes['ERROR'] || 0) + 1;
    return { success: false, error: error.message, responseTime };
  }
}

function calculateStats() {
  const duration = (stats.endTime - stats.startTime) / 1000;
  const avgResponseTime = stats.responseTimes.length > 0
    ? (stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length).toFixed(2)
    : 0;
  const sortedTimes = [...stats.responseTimes].sort((a, b) => a - b);
  const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0;
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0;
  const min = sortedTimes[0] || 0;
  const max = sortedTimes[sortedTimes.length - 1] || 0;
  const actualRPS = (stats.total / duration).toFixed(2);
  const successRate = ((stats.success / stats.total) * 100).toFixed(2);
  return {
    duration,
    actualRPS,
    successRate,
    avgResponseTime,
    p50,
    p95,
    p99,
    min,
    max
  };
}

function displayStats() {
  const calc = calculateStats();
  console.log('\n' + '='.repeat(70));
  console.log(`${colors.bright}${colors.cyan}LOAD TEST RESULTS${colors.reset}`);
  console.log('='.repeat(70));
  console.log(`\n${colors.bright}Test Configuration:${colors.reset}`);
  const actualEndpoint = getServiceEndpoint();
  console.log(`  Target:        ${colors.magenta}${LOAD_BALANCER_URL}${actualEndpoint}${colors.reset}`);
  if (SERVICE_TYPE !== 'auto' && ENDPOINT === '/health') {
    console.log(`  Service Type:  ${colors.cyan}${SERVICE_TYPE}${colors.reset}`);
  }
  console.log(`  Expected RPS:  ${colors.yellow}${REQUESTS_PER_SECOND}${colors.reset}`);
  console.log(`  Duration:      ${colors.yellow}${DURATION_SECONDS}s${colors.reset}`);
  console.log(`\n${colors.bright}Request Statistics:${colors.reset}`);
  console.log(`  Total Requests:    ${colors.cyan}${stats.total}${colors.reset}`);
  console.log(`  Successful:        ${colors.green}${stats.success}${colors.reset} (${calc.successRate}%)`);
  console.log(`  Failed (4xx):      ${colors.yellow}${stats.failed}${colors.reset}`);
  console.log(`  Errors (5xx/Net):  ${colors.red}${stats.errors}${colors.reset}`);
  console.log(`  Actual RPS:        ${colors.cyan}${calc.actualRPS}${colors.reset}`);
  console.log(`\n${colors.bright}Response Time Statistics:${colors.reset}`);
  console.log(`  Average:  ${colors.cyan}${calc.avgResponseTime}ms${colors.reset}`);
  console.log(`  Min:      ${colors.green}${calc.min}ms${colors.reset}`);
  console.log(`  Max:      ${colors.red}${calc.max}ms${colors.reset}`);
  console.log(`  P50:      ${colors.cyan}${calc.p50}ms${colors.reset}`);
  console.log(`  P95:      ${colors.yellow}${calc.p95}ms${colors.reset}`);
  console.log(`  P99:      ${colors.red}${calc.p99}ms${colors.reset}`);
  if (Object.keys(stats.statusCodes).length > 0) {
    console.log(`\n${colors.bright}Status Code Distribution:${colors.reset}`);
    Object.entries(stats.statusCodes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([code, count]) => {
        const percentage = ((count / stats.total) * 100).toFixed(1);
        const color = code === 'ERROR' ? colors.red :
                     code >= 500 ? colors.red :
                     code >= 400 ? colors.yellow :
                     colors.green;
        console.log(`  ${color}${code}${colors.reset}: ${count} (${percentage}%)`);
      });
  }
  console.log('\n' + '='.repeat(70) + '\n');
}

function showProgress() {
  const elapsed = (Date.now() - stats.startTime) / 1000;
  const remaining = DURATION_SECONDS - elapsed;
  const progress = Math.min((elapsed / DURATION_SECONDS) * 100, 100);
  const barLength = 30;
  const filled = Math.floor((progress / 100) * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
  process.stdout.write(
    `\r${colors.cyan}[${bar}]${colors.reset} ` +
    `${progress.toFixed(1)}% | ` +
    `Elapsed: ${elapsed.toFixed(1)}s | ` +
    `Remaining: ${remaining.toFixed(1)}s | ` +
    `Requests: ${colors.green}${stats.total}${colors.reset} | ` +
    `Success: ${colors.green}${stats.success}${colors.reset} | ` +
    `Failed: ${colors.red}${stats.errors + stats.failed}${colors.reset}`
  );
}

async function runLoadTest() {
  console.log('\n' + '='.repeat(70));
  console.log(`${colors.bright}${colors.cyan}STARTING LOAD TEST${colors.reset}`);
  console.log('='.repeat(70));
  const expectedTotal = REQUESTS_PER_SECOND * DURATION_SECONDS;
  const actualEndpoint = getServiceEndpoint();
  console.log(`\nTarget:        ${colors.magenta}${LOAD_BALANCER_URL}${actualEndpoint}${colors.reset}`);
  if (SERVICE_TYPE !== 'auto' && ENDPOINT === '/health') {
    console.log(`Service Type:  ${colors.cyan}${SERVICE_TYPE}${colors.reset}`);
  }
  console.log(`Requests/sec:  ${colors.yellow}${REQUESTS_PER_SECOND}${colors.reset}`);
  console.log(`Duration:      ${colors.yellow}${DURATION_SECONDS} seconds${colors.reset}`);
  console.log(`Expected Total: ${colors.cyan}~${expectedTotal} requests${colors.reset}`);
  console.log(`\n${colors.yellow}Press Ctrl+C to stop early${colors.reset}\n`);

  stats.startTime = Date.now();
  const interval = 1000 / REQUESTS_PER_SECOND;
  const endTime = stats.startTime + (DURATION_SECONDS * 1000);

  const pendingRequests = new Set();
  let nextScheduledTime = stats.startTime;

  const scheduleRequest = () => {
    if (nextScheduledTime >= endTime) {
      return;
    }
    const requestPromise = makeRequest().finally(() => {
      pendingRequests.delete(requestPromise);
    });
    pendingRequests.add(requestPromise);
    nextScheduledTime += interval;
    const delay = Math.max(0, nextScheduledTime - Date.now());
    if (nextScheduledTime < endTime) {
      setTimeout(scheduleRequest, delay);
    }
  };

  scheduleRequest();

  const progressInterval = setInterval(showProgress, 100);

  await new Promise(resolve => setTimeout(resolve, DURATION_SECONDS * 1000));
  const maxWaitTime = 5000;
  const waitStart = Date.now();
  while (pendingRequests.size > 0 && (Date.now() - waitStart) < maxWaitTime) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  clearInterval(progressInterval);
  stats.endTime = Date.now();

  process.stdout.write('\n');

  displayStats();
}

runLoadTest().catch(error => {
  console.error(`${colors.red}Error:${colors.reset}`, error.message);
  process.exit(1);
});
