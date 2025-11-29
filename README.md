# Distributed-Network-Simulation

A distributed microservices system demonstrating load balancing, fault tolerance, dynamic service discovery, and shared data persistence using local SQLite database.

## Architecture

The system consists of multiple microservices with load balancing and fault detection:

- **Service Registry** (Port 3005): Central service discovery and registration system
- **Auth Service** (3 instances on ports 3001-3003): User authentication and JWT token management
- **Data Service** (3 instances on ports 4002-4004): CRUD operations for data items
- **Compute Service** (3 instances on ports 5002-5004): Heavy computation tasks and job queue
- **Load Balancer** (Port 3000): Routes requests across multiple service instances using round-robin and health-based routing
- **Fault Detector** (Port 3004): Monitors service health, sends alerts, and provides real-time dashboard
- **Shared Local Database**: SQLite database (`data/local-db.sqlite`) shared across all services

### Service Discovery

All services automatically register with the Service Registry on startup and send periodic heartbeats. The Load Balancer dynamically discovers healthy services from the registry and routes traffic accordingly. If a service becomes unhealthy or stops sending heartbeats, it's automatically removed from the routing pool.

## Quick Start

### 1. Install Dependencies

```bash
npm install --prefix shared
npm install --prefix auth-service
npm install --prefix data-service
npm install --prefix compute-service
npm install --prefix load-balancer
npm install --prefix fault-detector
npm install --prefix service-registry
```

### 2. Start All Services (Recommended)

Use the automated startup script to start all services with proper orchestration:

```bash
chmod +x start-with-load-balancer.sh
./start-with-load-balancer.sh
```

This script will:
- Clear any processes using required ports
- Start the Service Registry (port 3005)
- Start 3 instances of Auth Service (ports 3001-3003)
- Start 3 instances of Data Service (ports 4002-4004)
- Start 3 instances of Compute Service (ports 5002-5004)
- Start the Load Balancer (port 3000)
- Start the Fault Detector with dashboard (port 3004)

**Press Ctrl+C to stop all services gracefully.**

### 3. Start Services Manually (Alternative)

If you prefer to start services individually:

**Important**: Start the Service Registry first, then other services will register automatically.

```bash
# Service Registry (start this first)
cd service-registry
PORT=3005 node registry-server.js

# Auth Service Instances (in separate terminals)
cd auth-service
PORT=3001 SERVICE_NAME=auth-service-1 JWT_SECRET=your-secret-key node auth-server.js
PORT=3002 SERVICE_NAME=auth-service-2 JWT_SECRET=your-secret-key node auth-server.js
PORT=3003 SERVICE_NAME=auth-service-3 JWT_SECRET=your-secret-key node auth-server.js

# Data Service Instances (in separate terminals)
cd data-service
PORT=4002 SERVICE_NAME=data-service-1 node data-server.js
PORT=4003 SERVICE_NAME=data-service-2 node data-server.js
PORT=4004 SERVICE_NAME=data-service-3 node data-server.js

# Compute Service Instances (in separate terminals)
cd compute-service
PORT=5002 SERVICE_NAME=compute-service-1 node compute-server.js
PORT=5003 SERVICE_NAME=compute-service-2 node compute-server.js
PORT=5004 SERVICE_NAME=compute-service-3 node compute-server.js

# Load Balancer (in another terminal)
cd load-balancer
PORT=3000 node load-balancer.js

# Fault Detector (in another terminal)
cd fault-detector
PORT=3004 node fault-detector.js
```

**Note**: The load balancer uses **dynamic service discovery** by default. Services automatically register themselves on startup and the load balancer discovers them from the registry. To use static configuration instead, set `USE_DYNAMIC_DISCOVERY=false`.

## API Endpoints & cURL Commands

### Health Checks

#### Check Service Health
```bash
# Service Registry
curl http://localhost:3005/health

# Auth Service Instances
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health

# Data Service Instances
curl http://localhost:4002/health
curl http://localhost:4003/health
curl http://localhost:4004/health

# Compute Service Instances
curl http://localhost:5002/health
curl http://localhost:5003/health
curl http://localhost:5004/health

# Load Balancer
curl http://localhost:3000/health

# Fault Detector
curl http://localhost:3004/health
```

#### Check Service Registry
```bash
# Get all registered services
curl http://localhost:3005/api/registry/services

# Get services by type
curl http://localhost:3005/api/registry/services/auth
curl http://localhost:3005/api/registry/services/data
curl http://localhost:3005/api/registry/services/compute

# Get only healthy services
curl http://localhost:3005/api/registry/services?healthy=true
```

---

## Auth Service (Ports 3001-3003)

The Auth Service handles user authentication and JWT token management. Multiple instances run behind the load balancer for high availability.

### Register a New User
```bash
# Via Load Balancer (recommended - routes to available instance)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "demo",
    "email": "demo@example.com",
    "password": "secret123"
  }'

# Or directly to a specific instance
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "demo",
    "email": "demo@example.com",
    "password": "secret123"
  }'
```

**Response:**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1763720729512",
    "username": "demo",
    "email": "demo@example.com"
  }
}
```

### Login
```bash
# Via Load Balancer (recommended)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "password": "secret123"
  }'
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1763720729512",
    "username": "demo",
    "email": "demo@example.com"
  }
}
```

### Verify Token
```bash
# Save token from login/register response
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Via Load Balancer (recommended)
curl http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "id": "1763720729512",
    "username": "demo",
    "email": "demo@example.com"
  }
}
```

### Get User Profile (Protected)
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Via Load Balancer (recommended)
curl http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "user": {
    "id": "1763720729512",
    "username": "demo",
    "email": "demo@example.com",
    "createdAt": "2025-11-21T09:56:15.118Z"
  }
}
```

---

## Data Service (Ports 4002-4004)

The Data Service provides CRUD operations for data items. Multiple instances run behind the load balancer for high availability.

### Create Data Item
```bash
# Via Load Balancer (recommended)
curl -X POST http://localhost:3000/api/data \
  -H "Content-Type: application/json" \
  -d '{
    "key": "sample-key",
    "value": {"foo": "bar", "count": 42},
    "metadata": {"source": "test", "version": "1.0"}
  }'
```

**Response:**
```json
{
  "message": "Data created successfully",
  "data": {
    "id": "1763720729512",
    "key": "sample-key",
    "value": {"foo": "bar", "count": 42},
    "metadata": {"source": "test", "version": "1.0"},
    "createdAt": "2025-11-21T09:56:15.118Z",
    "updatedAt": "2025-11-21T09:56:15.118Z"
  }
}
```

### Get Data Item by Key
```bash
# Via Load Balancer (recommended)
curl http://localhost:3000/api/data/sample-key
```

**Response:**
```json
{
  "message": "Data retrieved successfully",
  "data": {
    "id": "1763720729512",
    "key": "sample-key",
    "value": {"foo": "bar", "count": 42},
    "metadata": {"source": "test", "version": "1.0"},
    "createdAt": "2025-11-21T09:56:15.118Z",
    "updatedAt": "2025-11-21T09:56:15.118Z"
  }
}
```

### Get All Data Items
```bash
# Via Load Balancer (recommended)
curl http://localhost:3000/api/data
```

**Response:**
```json
{
  "message": "Data retrieved successfully",
  "count": 2,
  "data": [
    {
      "id": "1763720729512",
      "key": "sample-key",
      "value": {"foo": "bar"},
      "metadata": {},
      "createdAt": "2025-11-21T09:56:15.118Z",
      "updatedAt": "2025-11-21T09:56:15.118Z"
    }
  ]
}
```

### Update Data Item
```bash
# Via Load Balancer (recommended)
curl -X PUT http://localhost:3000/api/data/sample-key \
  -H "Content-Type: application/json" \
  -d '{
    "value": {"foo": "updated-bar", "count": 100},
    "metadata": {"source": "test", "version": "2.0", "updated": true}
  }'
```

**Response:**
```json
{
  "message": "Data updated successfully",
  "data": {
    "id": "1763720729512",
    "key": "sample-key",
    "value": {"foo": "updated-bar", "count": 100},
    "metadata": {"source": "test", "version": "2.0", "updated": true},
    "createdAt": "2025-11-21T09:56:15.118Z",
    "updatedAt": "2025-11-21T10:00:00.000Z"
  }
}
```

### Delete Data Item
```bash
# Via Load Balancer (recommended)
curl -X DELETE http://localhost:3000/api/data/sample-key
```

**Response:**
```json
{
  "message": "Data deleted successfully"
}
```

---

## Compute Service (Ports 5002-5004)

The Compute Service handles heavy computation tasks and asynchronous job processing. Multiple instances run behind the load balancer for high availability and parallel processing.

### Direct Computation (Synchronous)
```bash
# Addition (via Load Balancer - recommended)
curl -X POST http://localhost:3000/api/compute/direct \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "add",
    "operands": [1, 2, 3, 4, 5]
  }'

# Multiplication
curl -X POST http://localhost:3000/api/compute/direct \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "multiply",
    "operands": [2, 3, 4]
  }'

# Factorial
curl -X POST http://localhost:3000/api/compute/direct \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "factorial",
    "operands": [5]
  }'

# Fibonacci
curl -X POST http://localhost:3000/api/compute/direct \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "fibonacci",
    "operands": [10]
  }'
```

**Response:**
```json
{
  "operation": "add",
  "operands": [1, 2, 3, 4, 5],
  "result": 15,
  "service": "compute-service-1",
  "computedAt": "2025-11-21T09:56:15.118Z"
}
```

### Submit Computation Job (Asynchronous)
```bash
# Via Load Balancer (recommended)
curl -X POST http://localhost:3000/api/compute/job \
  -H "Content-Type: application/json" \
  -d '{
    "type": "heavy-computation",
    "data": {"operation": "factorial", "n": 100}
  }'
```

**Response:**
```json
{
  "message": "Job submitted successfully",
  "jobId": "1",
  "status": "pending"
}
```

### Get Job Status
```bash
# Via Load Balancer (recommended)
curl http://localhost:3000/api/compute/job/1
```

**Response:**
```json
{
  "jobId": "1",
  "status": "completed",
  "progress": 100,
  "data": {
    "type": "heavy-computation",
    "data": {"operation": "factorial", "n": 100}
  },
  "result": {
    "result": "Job completed",
    "processedAt": "2025-11-21T09:56:16.118Z"
  }
}
```

### Get Queue Statistics
```bash
# Via Load Balancer (recommended)
curl http://localhost:3000/api/compute/stats
```

**Response:**
```json
{
  "service": "compute-service-1",
  "queue": {
    "waiting": 0,
    "active": 0,
    "completed": 1,
    "failed": 0,
    "delayed": 0
  }
}
```

---

## Service Registry (Port 3005)

The Service Registry provides dynamic service discovery and registration. All services automatically register on startup and send periodic heartbeats to maintain their registration.

### Service Registration

Services register themselves with:
- `serviceId`: Unique identifier (e.g., `auth-service-1-3001`)
- `serviceType`: Service type (`auth`, `data`, or `compute`)
- `url`: Service URL
- `name`: Service name
- `metadata`: Additional information (port, host, etc.)

### Heartbeat Mechanism

Services send heartbeats every 10 seconds. If a service doesn't send a heartbeat for 30 seconds, it's marked as unhealthy and removed from the routing pool.

### API Endpoints

```bash
# Register a service
curl -X POST http://localhost:3005/api/registry/register \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "test-service-1",
    "serviceType": "auth",
    "url": "http://localhost:3001",
    "name": "test-service-1"
  }'

# Send heartbeat
curl -X POST http://localhost:3005/api/registry/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"serviceId": "test-service-1"}'

# Get all services
curl http://localhost:3005/api/registry/services

# Get services by type
curl http://localhost:3005/api/registry/services/auth

# Get only healthy services
curl http://localhost:3005/api/registry/services?healthy=true

# Deregister a service
curl -X POST http://localhost:3005/api/registry/deregister \
  -H "Content-Type: application/json" \
  -d '{"serviceId": "test-service-1"}'
```

---

## Load Balancer (Port 3000)

The Load Balancer routes requests across multiple service instances using:
- **Round-robin** distribution for even load distribution
- **Health-based routing** - only routes to healthy services
- **Automatic failover** - removes unhealthy services from the pool
- **Dynamic service discovery** - automatically discovers services from the registry

### Route Requests Through Load Balancer

All service endpoints should be accessed through the load balancer for high availability:

```bash
# Auth endpoints via load balancer
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "user1", "email": "user1@example.com", "password": "pass123"}'

curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user1@example.com", "password": "pass123"}'

# Data endpoints via load balancer
curl -X POST http://localhost:3000/api/data \
  -H "Content-Type: application/json" \
  -d '{"key": "test", "value": {"data": "value"}}'

curl http://localhost:3000/api/data/test

# Compute endpoints via load balancer
curl -X POST http://localhost:3000/api/compute/direct \
  -H "Content-Type: application/json" \
  -d '{"operation": "add", "operands": [1, 2, 3]}'
```

### Get Load Balancer Status
```bash
curl http://localhost:3000/status
```

**Response:**
```json
{
  "services": {
    "auth": [...],
    "data": [...],
    "compute": [...]
  },
  "roundRobin": {
    "auth": 5,
    "data": 3,
    "compute": 2
  },
  "timestamp": "2025-11-21T09:56:15.118Z"
}
```

---

## Fault Detector (Port 3004)

The Fault Detector monitors all services, tracks their health status, and provides real-time alerts. It includes a web-based dashboard for visual monitoring.

### Access the Dashboard

Open your browser and navigate to:
```
http://localhost:3004
```

The dashboard provides:
- Real-time service health status
- Response time metrics
- Service availability statistics
- Visual alerts for unhealthy services
- Auto-refresh for live updates

### Get Service Health Status (API)
```bash
curl http://localhost:3004/api/status
```

**Response:**
```json
{
  "summary": {
    "timestamp": "2025-11-21T09:56:15.118Z",
    "total": 10,
    "healthy": 9,
    "unhealthy": 1,
    "unknown": 0,
    "services": {
      "auth": {"total": 3, "healthy": 3, "unhealthy": 0},
      "data": {"total": 3, "healthy": 2, "unhealthy": 1},
      "compute": {"total": 3, "healthy": 3, "unhealthy": 0}
    }
  },
  "services": {
    "auth": [...],
    "data": [...],
    "compute": [...]
  }
}
```

### Get Specific Service Type Status
```bash
curl http://localhost:3004/api/status/auth
```

### Trigger Manual Health Check
```bash
curl -X POST http://localhost:3004/api/check
```

---

## Database Management

### Inspect Database

The shared SQLite database is located at `data/local-db.sqlite`.

```bash
# Open SQLite CLI
sqlite3 data/local-db.sqlite

# List all tables
.tables

# View users table
SELECT id, username, email, created_at FROM users;

# View data items table
SELECT id, data_key, value_json, created_at FROM data_items;

# View schema
.schema users
.schema data_items

# Exit
.quit
```

### Reset Database

```bash
# Delete database file (will be recreated on next service start)
rm data/local-db.sqlite
```

---

## Environment Variables

### Auth Service
- `PORT`: Service port (default: 3001)
- `SERVICE_NAME`: Service instance name (default: auth-service-1)
- `JWT_SECRET`: Secret key for JWT signing (default: your-secret-key-change-in-production)
- `JWT_EXPIRY`: Token expiration time (default: 24h)
- `NODE_ENV`: Environment (development/production)

### Data Service
- `PORT`: Service port (default: 4002 for first instance)
- `SERVICE_NAME`: Service instance name (default: data-service-1)
- `SERVICE_HOST`: Service host (default: localhost)

### Compute Service
- `PORT`: Service port (default: 5002 for first instance)
- `SERVICE_NAME`: Service instance name (default: compute-service-1)
- `SERVICE_HOST`: Service host (default: localhost)
- `REDIS_HOST`: Redis host for job queue (default: localhost)
- `REDIS_PORT`: Redis port (default: 6379)

### Load Balancer
- `PORT`: Load balancer port (default: 3000)
- `USE_DYNAMIC_DISCOVERY`: Enable dynamic service discovery (default: true)
- `SERVICE_REGISTRY_URL`: Service registry URL (default: http://localhost:3005)
- `SERVICE_HOST`: Service host for static configuration (default: localhost)
- `AUTH_PORTS`: Comma-separated auth service ports (default: 3001,3002,3003)
- `DATA_PORTS`: Comma-separated data service ports (default: 4002,4003,4004)
- `COMPUTE_PORTS`: Comma-separated compute service ports (default: 5002,5003,5004)

### Service Registry
- `PORT`: Registry port (default: 3005)

### Fault Detector
- `PORT`: Fault detector port (default: 3004)
- `SERVICE_REGISTRY_URL`: Service registry URL (default: http://localhost:3005)
- `USE_SERVICE_REGISTRY`: Enable dynamic service discovery (default: true)

### Shared Database
- `LOCAL_DB_DIR`: Directory for database file (default: `data/`)
- `LOCAL_DB_PATH`: Full path to database file (default: `data/local-db.sqlite`)

---

## Testing Multiple Instances

The system is configured to run 3 instances of each service by default:
- **Auth Service**: Ports 3001, 3002, 3003
- **Data Service**: Ports 4002, 4003, 4004
- **Compute Service**: Ports 5002, 5003, 5004

### Quick Test with Multiple Instances

```bash
# Test individual instances
curl http://localhost:3001/health  # Auth instance 1
curl http://localhost:3002/health  # Auth instance 2
curl http://localhost:3003/health  # Auth instance 3

curl http://localhost:4002/health  # Data instance 1
curl http://localhost:4003/health  # Data instance 2
curl http://localhost:4004/health  # Data instance 3

curl http://localhost:5002/health  # Compute instance 1
curl http://localhost:5003/health  # Compute instance 2
curl http://localhost:5004/health  # Compute instance 3

# Test load balancing - same request routed to different instances
for i in {1..10}; do
  curl -s http://localhost:3000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"username":"user'$i'","email":"user'$i'@test.com","password":"pass"}' \
    | grep -o '"service":"[^"]*"'
done
```

---

## Load Testing

### Using the Load Test Script

Test the load balancer with multiple requests per second:

```bash
# Basic test (10 requests/second for 30 seconds)
node load-test.js

# High load test (50 requests/second for 60 seconds)
RPS=50 DURATION=60 node load-test.js

# Test specific endpoint
ENDPOINT=/api/auth/register node load-test.js

# Test with custom load balancer URL
LB_URL=http://localhost:3000 RPS=20 DURATION=45 node load-test.js

# View help
node load-test.js --help
```

### Load Test Options

- `LB_URL`: Load balancer URL (default: `http://localhost:3000`)
- `RPS`: Requests per second (default: `10`)
- `DURATION`: Test duration in seconds (default: `30`)
- `ENDPOINT`: Endpoint to test (default: `/health`)

### Example Output

The load test script provides:
- Real-time progress bar
- Request statistics (total, success, failed, errors)
- Response time metrics (average, min, max, P50, P95, P99)
- Status code distribution
- Actual requests per second achieved

## Notes

- **Shared Database**: All services share the same SQLite database file (`data/local-db.sqlite`)
- **JWT Tokens**: Valid across all service instances (same `JWT_SECRET`)
- **Health Checks**: Used by load balancer and fault detector for routing decisions
- **Auto-Creation**: Database file is created automatically on first use
- **Service Discovery**: Services automatically register with the registry on startup
- **Heartbeats**: Services send heartbeats every 10 seconds to maintain registration
- **Fault Tolerance**: Unhealthy services are automatically removed from the routing pool
- **Load Balancing**: Round-robin distribution with health-based filtering
- **Production Considerations**: 
  - Use MongoDB Atlas or a proper database server instead of SQLite
  - Use Redis for distributed job queues
  - Implement proper authentication and authorization
  - Add rate limiting and request validation
  - Use environment-specific configuration management
- **Logging**: Load balancer logs are color-coded for better readability:
  - 🟢 Green: Success/Healthy services
  - 🟡 Yellow: Warnings/Failed requests
  - 🔴 Red: Errors/Unhealthy services
  - 🔵 Blue: Info messages
