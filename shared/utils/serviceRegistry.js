const axios = require('axios');

const REGISTRY_URL = process.env.SERVICE_REGISTRY_URL || 'http://localhost:3005';
const HEARTBEAT_INTERVAL = 10000;

let registeredServiceId = null;
let heartbeatInterval = null;
let isRegistered = false;

async function registerService(serviceInfo) {
  const { serviceId, serviceType, url, name, metadata = {} } = serviceInfo;

  if (!serviceId || !serviceType || !url || !name) {
    throw new Error('Missing required fields: serviceId, serviceType, url, name');
  }

  try {
    const response = await axios.post(`${REGISTRY_URL}/api/registry/register`, {
      serviceId,
      serviceType,
      url,
      name,
      metadata
    });

    registeredServiceId = serviceId;
    isRegistered = true;

    console.log(`[SERVICE-REGISTRY] Successfully registered: ${name} (${serviceId})`);

    startHeartbeat();

    return response.data;
  } catch (error) {
    console.error(`[SERVICE-REGISTRY] Failed to register service: ${error.message}`);
    if (error.response) {
      console.error(`[SERVICE-REGISTRY] Response:`, error.response.data);
    }
    throw error;
  }
}

async function sendHeartbeat() {
  if (!registeredServiceId || !isRegistered) {
    return;
  }

  try {
    await axios.post(`${REGISTRY_URL}/api/registry/heartbeat`, {
      serviceId: registeredServiceId
    });
  } catch (error) {
    console.error(`[SERVICE-REGISTRY] Failed to send heartbeat: ${error.message}`);
    if (error.code === 'ECONNREFUSED' || error.response?.status >= 500) {
      isRegistered = false;
    }
  }
}

function startHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  heartbeatInterval = setInterval(() => {
    sendHeartbeat();
  }, HEARTBEAT_INTERVAL);

  sendHeartbeat();
}

async function deregisterService() {
  if (!registeredServiceId || !isRegistered) {
    return;
  }

  try {
    await axios.post(`${REGISTRY_URL}/api/registry/deregister`, {
      serviceId: registeredServiceId
    });

    console.log(`[SERVICE-REGISTRY] Successfully deregistered: ${registeredServiceId}`);

    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }

    registeredServiceId = null;
    isRegistered = false;
  } catch (error) {
    console.error(`[SERVICE-REGISTRY] Failed to deregister service: ${error.message}`);
  }
}

async function discoverServices(serviceType, healthyOnly = true) {
  try {
    const url = `${REGISTRY_URL}/api/registry/services/${serviceType}${healthyOnly ? '?healthy=true' : ''}`;
    const response = await axios.get(url);
    return response.data.services || [];
  } catch (error) {
    console.error(`[SERVICE-REGISTRY] Failed to discover services: ${error.message}`);
    return [];
  }
}

async function getAllServices(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.healthy !== undefined) params.append('healthy', filters.healthy.toString());

    const url = `${REGISTRY_URL}/api/registry/services${params.toString() ? '?' + params.toString() : ''}`;
    const response = await axios.get(url);
    return response.data.services || [];
  } catch (error) {
    console.error(`[SERVICE-REGISTRY] Failed to get all services: ${error.message}`);
    return [];
  }
}

process.on('SIGTERM', async () => {
  await deregisterService();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await deregisterService();
  process.exit(0);
});

module.exports = {
  registerService,
  deregisterService,
  discoverServices,
  getAllServices,
  sendHeartbeat
};

