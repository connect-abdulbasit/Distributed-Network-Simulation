# Distributed-Network-Simulation

A distributed microservices system demonstrating load balancing, fault tolerance, and shared data persistence using local SQLite database.

## Architecture

- **Auth Service** (Port 3001): User authentication and JWT token management
- **Data Service** (Port 3002): CRUD operations for data items
- **Compute Service** (Port 3003): Heavy computation tasks and job queue
- **Load Balancer** (Port 3000): Routes requests across multiple service instances
- **Fault Detector** (Port 3004): Monitors service health and sends alerts
- **Shared Local Database**: SQLite database (`data/local-db.sqlite`) shared across all services

## Quick Start

### 1. Install Dependencies

```bash
npm install --prefix shared
npm install --prefix auth-service
npm install --prefix data-service
npm install --prefix compute-service
npm install --prefix load-balancer
npm install --prefix fault-detector
```

### 2. Start Services

```bash
# Auth Service
cd auth-service
NODE_ENV=development PORT=3001 SERVICE_NAME=auth-service-1 node auth-server.js

# Data Service (in another terminal)
cd data-service
PORT=3002 SERVICE_NAME=data-service-1 node data-server.js

# Compute Service (in another terminal)
cd compute-service
PORT=3003 SERVICE_NAME=compute-service-1 node compute-server.js

# Load Balancer (in another terminal)
cd load-balancer
PORT=3000 node load-balancer.js

# Fault Detector (in another terminal)
cd fault-detector
PORT=3004 node fault-detector.js
```

## API Endpoints & cURL Commands

### Health Checks

#### Check Service Health
```bash
# Auth Service
curl http://localhost:3001/health

# Data Service
curl http://localhost:3002/health

# Compute Service
curl http://localhost:3003/health

# Load Balancer
curl http://localhost:3000/health

# Fault Detector
curl http://localhost:3004/health
```

#### Check Service Readiness
```bash
# Auth Service
curl http://localhost:3001/ready

# Data Service
curl http://localhost:3002/ready

# Compute Service
curl http://localhost:3003/ready
```

---

## Auth Service (Port 3001)

### Register a New User
```bash
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
curl -X POST http://localhost:3001/api/auth/login \
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

curl http://localhost:3001/api/auth/verify \
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

curl http://localhost:3001/api/auth/profile \
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

## Data Service (Port 3002)

### Create Data Item
```bash
curl -X POST http://localhost:3002/api/data \
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
curl http://localhost:3002/api/data/sample-key
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
curl http://localhost:3002/api/data
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
curl -X PUT http://localhost:3002/api/data/sample-key \
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
curl -X DELETE http://localhost:3002/api/data/sample-key
```

**Response:**
```json
{
  "message": "Data deleted successfully"
}
```

---

## Compute Service (Port 3003)

### Direct Computation (Synchronous)
```bash
# Addition
curl -X POST http://localhost:3003/api/compute/direct \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "add",
    "operands": [1, 2, 3, 4, 5]
  }'

# Multiplication
curl -X POST http://localhost:3003/api/compute/direct \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "multiply",
    "operands": [2, 3, 4]
  }'

# Factorial
curl -X POST http://localhost:3003/api/compute/direct \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "factorial",
    "operands": [5]
  }'

# Fibonacci
curl -X POST http://localhost:3003/api/compute/direct \
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
curl -X POST http://localhost:3003/api/compute/job \
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
curl http://localhost:3003/api/compute/job/1
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
curl http://localhost:3003/api/compute/stats
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

## Load Balancer (Port 3000)

### Route Requests Through Load Balancer

All service endpoints can be accessed through the load balancer:

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

### Get Service Health Status
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
- `PORT`: Service port (default: 3002)
- `SERVICE_NAME`: Service instance name (default: data-service-1)

### Compute Service
- `PORT`: Service port (default: 3003)
- `SERVICE_NAME`: Service instance name (default: compute-service-1)
- `REDIS_HOST`: Redis host for job queue (default: localhost)
- `REDIS_PORT`: Redis port (default: 6379)

### Shared Database
- `LOCAL_DB_DIR`: Directory for database file (default: `data/`)
- `LOCAL_DB_PATH`: Full path to database file (default: `data/local-db.sqlite`)

---

## Testing Multiple Instances

See [HOW-MULTIPLE-SERVERS-WORK.md](./HOW-MULTIPLE-SERVERS-WORK.md) for detailed information on running multiple instances of each service.

### Quick Test with Multiple Auth Instances

```bash
# Start 3 auth service instances
cd auth-service
PORT=3001 SERVICE_NAME=auth-service-1 node auth-server.js &
PORT=3002 SERVICE_NAME=auth-service-2 node auth-server.js &
PORT=3003 SERVICE_NAME=auth-service-3 node auth-server.js &

# Test each instance
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
```

---

## Notes

- All services share the same SQLite database file (`data/local-db.sqlite`)
- JWT tokens are valid across all service instances (same `JWT_SECRET`)
- Health checks are used by load balancer and fault detector for routing decisions
- The database file is created automatically on first use
- For production, consider using MongoDB Atlas or a proper database server
