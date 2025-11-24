# Service Registry

Dynamic service registry for service discovery in the distributed network simulation.

## Overview

The service registry allows services to:
- **Register** themselves on startup
- **Send heartbeats** to maintain registration
- **Deregister** themselves on shutdown
- **Discover** other services dynamically

The load balancer uses the registry to discover available services instead of using static configuration.

## Quick Start

### 1. Install Dependencies

```bash
cd service-registry
npm install
```

### 2. Start the Registry

```bash
PORT=3005 node registry-server.js
```

The registry will be available at `http://localhost:3005`

## API Endpoints

### Register Service
```bash
POST /api/registry/register
Content-Type: application/json

{
  "serviceId": "auth-service-1-3001",
  "serviceType": "auth",
  "url": "http://localhost:3001",
  "name": "auth-service-1",
  "metadata": {
    "port": 3001,
    "host": "localhost"
  }
}
```

### Send Heartbeat
```bash
POST /api/registry/heartbeat
Content-Type: application/json

{
  "serviceId": "auth-service-1-3001"
}
```

### Deregister Service
```bash
POST /api/registry/deregister
Content-Type: application/json

{
  "serviceId": "auth-service-1-3001"
}
```

### Discover Services
```bash
# Get all services
GET /api/registry/services

# Get services by type
GET /api/registry/services/auth?healthy=true

# Get specific service
GET /api/registry/service/auth-service-1-3001
```

### Health Check
```bash
GET /health
```

## Environment Variables

- `PORT`: Registry port (default: 3005)

## How It Works

1. **Service Registration**: When a service starts, it registers itself with the registry
2. **Heartbeats**: Services send heartbeats every 10 seconds to keep their registration alive
3. **Service Discovery**: The load balancer queries the registry every 15 seconds to discover available services
4. **Health Filtering**: Only healthy services (those sending heartbeats) are returned by default
5. **Automatic Cleanup**: Services that don't send heartbeats for 30 seconds are marked as unhealthy

## Integration

All services (auth, data, compute) automatically register with the registry on startup. The load balancer automatically discovers services from the registry.

To disable dynamic discovery and use static configuration:
```bash
USE_DYNAMIC_DISCOVERY=false node load-balancer.js
```

