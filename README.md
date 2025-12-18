# Distributed-Network-Simulation

A distributed microservices system demonstrating load balancing, fault tolerance, dynamic service discovery, and shared data persistence using local SQLite database.

## 🚀 Quick Reference

**Prerequisites:** Node.js 14+, npm 6+, Bash shell

**Quick Start:**
```bash
# Install dependencies
npm install --prefix shared auth-service data-service compute-service load-balancer fault-detector service-registry

# Start with 3 instances (recommended)
chmod +x start-3-instances.sh && ./start-3-instances.sh

# Or start with 10 instances (load testing)
chmod +x start-10-instances.sh && ./start-10-instances.sh
```

**Access Points:**
- Load Balancer: http://localhost:3000
- Dashboard: http://localhost:3004
- Service Registry: http://localhost:3005

**Stop Services:** Press `Ctrl+C` in the terminal running the script

---

## 📋 Environment Requirements

### System Requirements

- **Operating System**: macOS, Linux, or Windows (with WSL/Git Bash)
- **Node.js**: Version 14.x or higher (recommended: 16.x or 18.x)
- **npm**: Version 6.x or higher (comes with Node.js)
- **Bash**: Required for running startup scripts (macOS/Linux have it by default, Windows needs Git Bash or WSL)
- **Ports**: Multiple ports must be available (see Port Configuration section)

### Verify Your Environment

```bash
# Check Node.js version
node --version  # Should be v14.x or higher

# Check npm version
npm --version   # Should be 6.x or higher

# Check if bash is available
bash --version
```

### Required Ports

The system uses the following ports:

**Core Services (Always Required):**
- `3000`: Load Balancer
- `3004`: Fault Detector & Dashboard
- `3005`: Service Registry

**Service Instances - 3 Instances Mode:**
- `3001-3003`: Auth Service instances (3 ports)
- `4002-4004`: Data Service instances (3 ports)
- `5002-5004`: Compute Service instances (3 ports)
- **Total: 12 ports for service instances**

**Service Instances - 10 Instances Mode:**
- `3001-3010`: Auth Service instances (10 ports)
- `4002-4011`: Data Service instances (10 ports)
- `5002-5011`: Compute Service instances (10 ports)
- **Total: 30 ports for service instances**

**Total Ports Required:**
- **3 instances mode**: 15 ports (3 core + 12 service instances)
- **10 instances mode**: 33 ports (3 core + 30 service instances)

**Checking Available Ports:**
```bash
# Check if a specific port is in use
lsof -i :3001

# Check multiple ports
for port in 3000 3004 3005 3001 3002 3003; do
  echo "Port $port:"
  lsof -i :$port || echo "  Available"
done
```

**Freeing Up Ports:**
The startup scripts automatically kill processes using required ports. To manually free a port:
```bash
# Find and kill process using port 3001
lsof -ti:3001 | xargs kill -9
```

### Environment Variables

The following environment variables can be set (all are optional with defaults):

**Global:**
- `SERVICE_HOST`: Service hostname (default: `localhost`)
- `SERVICE_REGISTRY_URL`: Service registry URL (default: `http://localhost:3005`)
- `USE_SERVICE_REGISTRY`: Enable service registry (default: `true`)
- `USE_DYNAMIC_DISCOVERY`: Enable dynamic discovery (default: `true`)

**Auth Service:**
- `PORT`: Service port (required, no default)
- `SERVICE_NAME`: Service instance name (required, e.g., `auth-service-1`)
- `JWT_SECRET`: JWT signing secret (default: `'your-secret-key-change-in-production'`)
  - **Critical**: All auth instances MUST use the same `JWT_SECRET`
- `JWT_EXPIRY`: Token expiration (default: `24h`)

**Data Service:**
- `PORT`: Service port (required, no default)
- `SERVICE_NAME`: Service instance name (required, e.g., `data-service-1`)

**Compute Service:**
- `PORT`: Service port (required, no default)
- `SERVICE_NAME`: Service instance name (required, e.g., `compute-service-1`)
- `REDIS_HOST`: Redis host for job queue (default: `localhost`)
- `REDIS_PORT`: Redis port (default: `6379`)

**Load Balancer:**
- `PORT`: Load balancer port (default: `3000`)

**Service Registry:**
- `PORT`: Registry port (default: `3005`)

**Fault Detector:**
- `PORT`: Fault detector port (default: `3004`)

## Architecture

The system consists of multiple microservices with load balancing and fault detection:

- **Service Registry** (Port 3005): Central service discovery and registration system
- **Auth Service** (3 or 10 instances): User authentication and JWT token management
  - 3 instances: Ports 3001-3003
  - 10 instances: Ports 3001-3010
- **Data Service** (3 or 10 instances): CRUD operations for data items
  - 3 instances: Ports 4002-4004
  - 10 instances: Ports 4002-4011
- **Compute Service** (3 or 10 instances): Heavy computation tasks and job queue
  - 3 instances: Ports 5002-5004
  - 10 instances: Ports 5002-5011
- **Load Balancer** (Port 3000): Routes requests across multiple service instances using round-robin and health-based routing
- **Fault Detector** (Port 3004): Monitors service health, sends alerts, and provides real-time dashboard
- **Shared Local Database**: SQLite database (`data/local-db.sqlite`) shared across all services

### Service Discovery

All services automatically register with the Service Registry on startup and send periodic heartbeats. The Load Balancer dynamically discovers healthy services from the registry and routes traffic accordingly. If a service becomes unhealthy or stops sending heartbeats, it's automatically removed from the routing pool.

## Quick Start

### 1. Install Dependencies

Install dependencies for all services:

```bash
npm install --prefix shared
npm install --prefix auth-service
npm install --prefix data-service
npm install --prefix compute-service
npm install --prefix load-balancer
npm install --prefix fault-detector
npm install --prefix service-registry
```

**Or install all at once:**
```bash
for dir in shared auth-service data-service compute-service load-balancer fault-detector service-registry; do
  echo "Installing dependencies for $dir..."
  npm install --prefix $dir
done
```

### 2. Start All Services

Choose between two startup scripts based on your needs:

#### Option A: Start with 3 Instances (Recommended for Development)

```bash
chmod +x start-3-instances.sh
./start-3-instances.sh
```

**This script will:**
- Clear any processes using required ports
- Start the Service Registry (port 3005)
- Start 3 instances of Auth Service (ports 3001-3003)
- Start 3 instances of Data Service (ports 4002-4004)
- Start 3 instances of Compute Service (ports 5002-5004)
- Start the Load Balancer (port 3000)
- Start the Fault Detector with dashboard (port 3004)

**Total Services:** 10 (1 registry + 9 service instances + 1 load balancer + 1 fault detector)

#### Option B: Start with 10 Instances (For Load Testing)

```bash
chmod +x start-10-instances.sh
./start-10-instances.sh
```

**This script will:**
- Clear any processes using required ports
- Start the Service Registry (port 3005)
- Start 10 instances of Auth Service (ports 3001-3010)
- Start 10 instances of Data Service (ports 4002-4011)
- Start 10 instances of Compute Service (ports 5002-5011)
- Start the Load Balancer (port 3000)
- Start the Fault Detector with dashboard (port 3004)

**Total Services:** 33 (1 registry + 30 service instances + 1 load balancer + 1 fault detector)

**Note:** Make sure you have enough available ports before running the 10-instance script.

**Press Ctrl+C to stop all services gracefully.**

---

## 🚀 How to Run the System (Step-by-Step Sequence)

### **Understanding the Startup Sequence**

The system must be started in a specific order because services depend on each other:

```
1. Service Registry (Port 3005)
   ↓
2. Backend Services (Auth, Data, Compute) - Register with Registry
   ↓
3. Load Balancer (Port 3000) - Discovers services from Registry
   ↓
4. Fault Detector (Port 3004) - Monitors all services
```

### **Detailed Startup Sequence**

#### **Step 1: Service Registry** (MUST START FIRST)
```bash
cd service-registry
PORT=3005 node registry-server.js
```
**Why First?** All services register with the registry on startup. If the registry isn't running, services will fail to register.

**Wait Time:** 3 seconds (for registry to fully start)

---

#### **Step 2: Backend Services** (Can start in parallel)
Start these services - they will automatically register with the registry:

**Auth Services:**
```bash
# Terminal 2
cd auth-service
# If JWT_SECRET is in .env, omit it; otherwise specify it
PORT=3001 SERVICE_NAME=auth-service-1 JWT_SECRET=your-secret-key node auth-server.js

# Terminal 3
cd auth-service
PORT=3002 SERVICE_NAME=auth-service-2 JWT_SECRET=your-secret-key node auth-server.js

# Terminal 4
cd auth-service
PORT=3003 SERVICE_NAME=auth-service-3 JWT_SECRET=your-secret-key node auth-server.js
```

**Note on JWT_SECRET:**
- **Optional**: If `JWT_SECRET` is already set in your environment (`.env` file or exported), you can omit it from the command
- **Critical**: All auth service instances MUST use the same `JWT_SECRET` value, otherwise tokens generated by one instance won't be valid on another
- **Default**: If not specified anywhere, it defaults to `'your-secret-key-change-in-production'` (not recommended for production)
- **Best Practice**: Set it once in `.env` file or export it, then omit from commands:
  ```bash
  # In .env file or export:
  export JWT_SECRET=your-secret-key
  
  # Then start services without specifying it:
  PORT=3001 SERVICE_NAME=auth-service-1 node auth-server.js
  ```

**Data Services:**
```bash
# Terminal 5
cd data-service
PORT=4002 SERVICE_NAME=data-service-1 node data-server.js

# Terminal 6
cd data-service
PORT=4003 SERVICE_NAME=data-service-2 node data-server.js

# Terminal 7
cd data-service
PORT=4004 SERVICE_NAME=data-service-3 node data-server.js
```

**Compute Services:**
```bash
# Terminal 8
cd compute-service
PORT=5002 SERVICE_NAME=compute-service-1 node compute-server.js

# Terminal 9
cd compute-service
PORT=5003 SERVICE_NAME=compute-service-2 node compute-server.js

# Terminal 10
cd compute-service
PORT=5004 SERVICE_NAME=compute-service-3 node compute-server.js
```

**Wait Time:** 2 seconds between each service (to allow registration)

---

#### **Step 3: Load Balancer** (Start after services are registered)
```bash
# Terminal 11
cd load-balancer
PORT=3000 node load-balancer.js
```

**Why After Services?** The load balancer discovers services from the registry. If services aren't registered yet, the load balancer will have an empty service list initially (but will discover them within 15 seconds).

**Wait Time:** 3 seconds (for services to register)

---

#### **Step 4: Fault Detector** (Start last)
```bash
# Terminal 12
cd fault-detector
PORT=3004 node fault-detector.js
```

**Why Last?** The fault detector monitors all services. Starting it last ensures all services are already running and registered.

**Access Dashboard:** Open `http://localhost:3004` in your browser

---

### **Quick Verification Sequence**

After starting all services, verify in this order:

```bash
# 1. Check Service Registry
curl http://localhost:3005/health
curl http://localhost:3005/api/registry/services

# 2. Check individual services (pick one of each type)
curl http://localhost:3001/health  # Auth
curl http://localhost:4002/health  # Data
curl http://localhost:5002/health  # Compute

# 3. Check Load Balancer
curl http://localhost:3000/health
curl http://localhost:3000/status

# 4. Check Fault Detector
curl http://localhost:3004/health
# Or open dashboard: http://localhost:3004
```

---

### **Using the Automated Scripts (Recommended)**

Two automated scripts are available:

#### **3 Instances Script** (`start-3-instances.sh`)

```bash
./start-3-instances.sh
```

**What it does:**
1. ✅ Kills any processes on required ports
2. ✅ Starts Service Registry (waits 3s)
3. ✅ Starts 3 Auth service instances (waits 1s between each)
4. ✅ Starts 3 Data service instances (waits 1s between each)
5. ✅ Starts 3 Compute service instances (waits 1s between each)
6. ✅ Waits 3s for services to register
7. ✅ Starts Load Balancer (waits 2s)
8. ✅ Starts Fault Detector

**Total startup time:** ~15-20 seconds

#### **10 Instances Script** (`start-10-instances.sh`)

```bash
./start-10-instances.sh
```

**What it does:**
1. ✅ Kills any processes on required ports
2. ✅ Starts Service Registry (waits 3s)
3. ✅ Starts 10 Auth service instances (waits 1s between each)
4. ✅ Starts 10 Data service instances (waits 1s between each)
5. ✅ Starts 10 Compute service instances (waits 1s between each)
6. ✅ Waits 3s for services to register
7. ✅ Starts Load Balancer (waits 2s)
8. ✅ Starts Fault Detector

**Total startup time:** ~30-40 seconds

**Note:** The 10-instance script requires 33 ports to be available. Make sure no other services are using ports 3001-3010, 4002-4011, and 5002-5011.

---

### **Troubleshooting Startup Issues**

**Problem: Services not registering**
- **Solution:** Make sure Service Registry is running first
- **Check:** `curl http://localhost:3005/health`

**Problem: Load Balancer shows no services**
- **Solution:** Wait 15 seconds (discovery interval) or check registry
- **Check:** `curl http://localhost:3005/api/registry/services`

**Problem: Port already in use**
- **Solution:** The startup script automatically kills processes, but if manual:
  ```bash
  lsof -ti:3005 | xargs kill -9  # Replace 3005 with your port
  ```

**Problem: Services start but immediately crash**
- **Solution:** Check dependencies are installed
  ```bash
  npm install --prefix <service-directory>
  ```

### 3. Start Services Manually (Alternative)

If you prefer to start services individually:

**Important**: Start the Service Registry first, then other services will register automatically.

```bash
# Service Registry (start this first)
cd service-registry
PORT=3005 node registry-server.js

# Auth Service Instances (in separate terminals)
cd auth-service
PORT=3001 SERVICE_NAME=auth-service-1 node auth-server.js
PORT=3002 SERVICE_NAME=auth-service-2 node auth-server.js
PORT=3003 SERVICE_NAME=auth-service-3 node auth-server.js


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

### API Endpoints

- `GET /health` - Health check
- `GET/POST /api/auth/auth-work` - Test endpoint (300ms delay)
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login

### Register a New User
```bash
# Via Load Balancer (recommended - routes to available instance)
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "demo",
    "email": "demo@example.com",
    "password": "secret123"
  }'

# Or directly to a specific instance
curl -X POST http://localhost:3001/api/auth/signup \
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
curl -X POST http://localhost:3000/api/auth/signin \
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

### Test Endpoint (Load Testing)
```bash
# Via Load Balancer (recommended)
curl http://localhost:3000/api/auth/auth-work
# or
curl -X POST http://localhost:3000/api/auth/auth-work

# Response time: ~300ms (as designed)
```

---

## Data Service (Ports 4002-4004)

The Data Service provides data retrieval operations. Multiple instances run behind the load balancer for high availability.

### API Endpoints

- `GET /health` - Health check
- `GET/POST /api/data/data-work` - Test endpoint (200ms delay)
- `GET /api/data/:id` - Get data item by ID

### Get Data Item by ID
```bash
# Via Load Balancer (recommended)
curl http://localhost:3000/api/data/data-1

# Direct access
curl http://localhost:4002/api/data/data-1
```

**Response:**
```json
{
  "message": "Data retrieved successfully",
  "data": {
    "id": "data-1",
    "key": "default-key-1",
    "value": {
      "title": "Data Item 1",
      "description": "This is default data item number 1",
      "number": 1,
      "active": false
    },
    "metadata": {
      "category": "category-a",
      "priority": "high"
    },
    "createdAt": "2025-01-21T09:56:15.118Z",
    "updatedAt": "2025-01-21T09:56:15.118Z"
  }
}
```

**Note:** The database is pre-populated with 10 default data items (data-1 through data-10) on first startup.

### Test Endpoint (Load Testing)
```bash
# Via Load Balancer (recommended)
curl http://localhost:3000/api/data/data-work
# or
curl -X POST http://localhost:3000/api/data/data-work

# Response time: ~200ms (as designed)
```

---

## Compute Service (Ports 5002-5004)

The Compute Service handles computation tasks. Multiple instances run behind the load balancer for high availability and parallel processing.

### API Endpoints

- `GET /health` - Health check
- `GET/POST /api/compute/compute-worker` - Test endpoint (350ms delay)
- `POST /api/compute/direct` - Direct computation (optional)

### Test Endpoint (Load Testing)
```bash
# Via Load Balancer (recommended)
curl http://localhost:3000/api/compute/compute-worker
# or
curl -X POST http://localhost:3000/api/compute/compute-worker

# Response time: ~350ms (as designed)
```

**Response:**
```json
{
  "message": "Compute worker completed",
  "service": "compute-service-1",
  "delayMs": 350,
  "timestamp": "2025-01-21T09:56:15.118Z"
}
```

### Direct Computation (Optional)
```bash
# Via Load Balancer
curl -X POST http://localhost:3000/api/compute/direct \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "add",
    "operands": [1, 2, 3, 4, 5]
  }'
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

- **Heartbeat Interval**: Services send heartbeats every **10 seconds**
- **Heartbeat Timeout**: If a service doesn't send a heartbeat for **30 seconds**, it's marked as unhealthy
- **Cleanup Check**: Registry checks for stale services every **10 seconds**
- **Automatic Cleanup**: Unhealthy services are automatically removed from discovery results

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
- **Round-Robin Algorithm** - Classic round-robin with modulo operation for even distribution
- **Health-Based Routing** - Only routes to healthy services (unhealthy services excluded)
- **Automatic Failover** - Removes unhealthy services from the routing pool
- **Dynamic Service Discovery** - Automatically discovers services from the registry every 15 seconds
- **Retry Mechanism** - Retries up to 3 times with different service instances on failure
- **Per-Service-Type Counters** - Independent round-robin counters for auth, data, and compute services

### Round-Robin Algorithm Details

The load balancer implements a **true Round-Robin algorithm** with the following characteristics:

- **Selection Formula**: `index = counter % healthyServiceCount`
- **Counter Increment**: Counter increments after each request
- **Automatic Wrapping**: When counter exceeds service count, modulo wraps it back to 0
- **Dynamic Adaptation**: Automatically adjusts when services are added/removed
- **Health-Aware**: Only includes healthy services in rotation

**Example with 3 Auth services:**
```
Request 1: counter=0 → index=0 → auth-service-1 (port 3001)
Request 2: counter=1 → index=1 → auth-service-2 (port 3002)
Request 3: counter=2 → index=2 → auth-service-3 (port 3003)
Request 4: counter=3 → index=0 → auth-service-1 (wraps!)
```

### Load Balancer Features

- **Service Discovery**: Fetches services from registry every 15 seconds
- **Health Checks**: Performs health checks every 20 seconds
- **Failure Thresholds**: 
  - Auth/Data services: 10 consecutive failures → unhealthy
  - Compute services: 15 consecutive failures → unhealthy
- **Request Timeout**: 10 seconds per request
- **Metrics Tracking**: Tracks requests per service, success/failure rates, RPS

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
    "counters": {
    "auth": 5,
    "data": 3,
    "compute": 2
  },
    "stats": {
      "auth": {
        "counter": 5,
        "healthyServiceCount": 3,
        "currentIndex": 2,
        "nextService": "http://localhost:3003",
        "algorithm": "Round-Robin"
      }
    }
  },
  "requestMetrics": {...},
  "timestamp": "2025-01-21T09:56:15.118Z"
}
```

### Get Request Metrics
```bash
curl http://localhost:3000/api/metrics
```

**Response includes:**
- Load balancer metrics (total, success, failed, RPS, failures by service type)
- Per-service metrics (total, success, failed, RPS, success rate)

### Reset Round-Robin Counters
```bash
# Reset all counters
curl -X POST http://localhost:3000/api/round-robin/reset

# Reset specific service type
curl -X POST http://localhost:3000/api/round-robin/reset \
  -H "Content-Type: application/json" \
  -d '{"serviceType": "auth"}'
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
- **Real-time service health status** - Live updates via WebSocket
- **Request metrics** - Total, success, failed requests per service
- **Requests per second (RPS)** - Actual incoming request rate
- **Request distribution** - Percentage of requests per service type (Auth, Data, Compute)
- **Service availability statistics** - Healthy/unhealthy counts
- **Visual alerts** - For unhealthy services and slow responses
- **Auto-refresh** - Live updates without page refresh

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

## Environment Variables Reference

### Global Configuration

These can be set in your shell environment or `.env` files:

```bash
# Service Registry Configuration
export SERVICE_REGISTRY_URL=http://localhost:3005
export USE_SERVICE_REGISTRY=true
export USE_DYNAMIC_DISCOVERY=true

# Service Host Configuration
export SERVICE_HOST=localhost  # Use 'localhost' for local development
```

### Auth Service

**Required:**
- `PORT`: Service port (e.g., 3001, 3002, 3003, etc.)
- `SERVICE_NAME`: Service instance name (e.g., `auth-service-1`, `auth-service-2`)

**Optional:**
- `JWT_SECRET`: Secret key for JWT signing (default: `'your-secret-key-change-in-production'`)
  - **Critical**: All auth service instances MUST use the same `JWT_SECRET`
  - Can be set via environment variable, `.env` file, or command line
  - If set globally, you don't need to specify it per instance
- `JWT_EXPIRY`: Token expiration time (default: `24h`)
- `NODE_ENV`: Environment mode (default: `development`)

**Example:**
```bash
# Set JWT_SECRET globally (recommended)
export JWT_SECRET=your-secret-key

# Start instances (JWT_SECRET inherited from environment)
PORT=3001 SERVICE_NAME=auth-service-1 node auth-server.js
PORT=3002 SERVICE_NAME=auth-service-2 node auth-server.js
```

### Data Service

**Required:**
- `PORT`: Service port (e.g., 4002, 4003, 4004, etc.)
- `SERVICE_NAME`: Service instance name (e.g., `data-service-1`, `data-service-2`)

**Optional:**
- `SERVICE_HOST`: Service hostname (default: `localhost`)

**Example:**
```bash
PORT=4002 SERVICE_NAME=data-service-1 node data-server.js
PORT=4003 SERVICE_NAME=data-service-2 node data-server.js
```

### Compute Service

**Required:**
- `PORT`: Service port (e.g., 5002, 5003, 5004, etc.)
- `SERVICE_NAME`: Service instance name (e.g., `compute-service-1`, `compute-service-2`)

**Optional:**
- `SERVICE_HOST`: Service hostname (default: `localhost`)
- `REDIS_HOST`: Redis host for job queue (default: `localhost`)
- `REDIS_PORT`: Redis port (default: `6379`)

**Example:**
```bash
PORT=5002 SERVICE_NAME=compute-service-1 node compute-server.js
PORT=5003 SERVICE_NAME=compute-service-2 node compute-server.js
```

### Load Balancer

**Optional:**
- `PORT`: Load balancer port (default: `3000`)
- `USE_DYNAMIC_DISCOVERY`: Enable dynamic service discovery (default: `true`)
- `SERVICE_REGISTRY_URL`: Service registry URL (default: `http://localhost:3005`)
- `SERVICE_HOST`: Service host for static configuration (default: `localhost`)
- `AUTH_PORTS`: Comma-separated auth service ports (only used if `USE_DYNAMIC_DISCOVERY=false`)
- `DATA_PORTS`: Comma-separated data service ports (only used if `USE_DYNAMIC_DISCOVERY=false`)
- `COMPUTE_PORTS`: Comma-separated compute service ports (only used if `USE_DYNAMIC_DISCOVERY=false`)

**Example:**
```bash
# Dynamic discovery (recommended)
PORT=3000 node load-balancer.js

# Static configuration (if dynamic discovery disabled)
USE_DYNAMIC_DISCOVERY=false AUTH_PORTS=3001,3002,3003 DATA_PORTS=4002,4003,4004 COMPUTE_PORTS=5002,5003,5004 node load-balancer.js
```

### Service Registry

**Optional:**
- `PORT`: Registry port (default: `3005`)

**Example:**
```bash
PORT=3005 node registry-server.js
```

### Fault Detector

**Optional:**
- `PORT`: Fault detector port (default: `3004`)
- `SERVICE_REGISTRY_URL`: Service registry URL (default: `http://localhost:3005`)
- `USE_SERVICE_REGISTRY`: Enable dynamic service discovery (default: `true`)
- `SERVICE_HOST`: Service hostname (default: `localhost`)

**Example:**
```bash
PORT=3004 node fault-detector.js
```

### Shared Database

**Optional:**
- `LOCAL_DB_DIR`: Directory for database file (default: `data/`)
- `LOCAL_DB_PATH`: Full path to database file (default: `data/local-db.sqlite`)

### Setting Environment Variables

**Option 1: Export in Shell**
```bash
export JWT_SECRET=your-secret-key
export SERVICE_REGISTRY_URL=http://localhost:3005
```

**Option 2: Use .env File**
Create a `.env` file in the project root:
```env
JWT_SECRET=your-secret-key
SERVICE_REGISTRY_URL=http://localhost:3005
USE_SERVICE_REGISTRY=true
```

**Option 3: Inline with Command**
```bash
PORT=3001 SERVICE_NAME=auth-service-1 JWT_SECRET=your-secret-key node auth-server.js
```

**Note:** The startup scripts (`start-3-instances.sh` and `start-10-instances.sh`) handle all environment variables automatically. You only need to set them manually if starting services individually.

---

## Testing Multiple Instances

The system can run with either 3 or 10 instances of each service:

### 3 Instances Configuration (Default)
- **Auth Service**: Ports 3001, 3002, 3003
- **Data Service**: Ports 4002, 4003, 4004
- **Compute Service**: Ports 5002, 5003, 5004

### 10 Instances Configuration (Load Testing)
- **Auth Service**: Ports 3001-3010
- **Data Service**: Ports 4002-4011
- **Compute Service**: Ports 5002-5011

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
  curl -s http://localhost:3000/api/auth/auth-work \
    | grep -o '"service":"[^"]*"'
done

# Test round-robin distribution
for i in {1..9}; do
  echo "Request $i:"
  curl -s http://localhost:3000/api/auth/auth-work | jq -r '.service'
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

### Recommended Test Endpoints

```bash
# Test Auth service (300ms delay)
ENDPOINT=/api/auth/auth-work RPS=10 DURATION=30 node load-test.js

# Test Data service (200ms delay)
ENDPOINT=/api/data/data-work RPS=15 DURATION=30 node load-test.js

# Test Compute service (350ms delay)
ENDPOINT=/api/compute/compute-worker RPS=8 DURATION=30 node load-test.js

# High load test
ENDPOINT=/api/auth/auth-work RPS=50 DURATION=60 node load-test.js
```

### Example Output

The load test script provides:
- Real-time progress bar
- Request statistics (total, success, failed, errors)
- Response time metrics (average, min, max, P50, P95, P99)
- Status code distribution
- Actual requests per second achieved

## Key Features

### Service Discovery
- **Dynamic Registration**: Services automatically register with the registry on startup
- **Heartbeat Mechanism**: Services send heartbeats every 10 seconds
- **Automatic Cleanup**: Services without heartbeats for 30 seconds are marked unhealthy
- **Registry-Based Discovery**: Load balancer discovers services from registry every 15 seconds

### Load Balancing
- **Round-Robin Algorithm**: True round-robin with modulo operation (`index = counter % count`)
- **Health-Aware Routing**: Only routes to healthy services
- **Dynamic Adaptation**: Automatically adjusts when services are added/removed
- **Per-Service-Type Counters**: Independent counters for auth, data, and compute
- **Retry Mechanism**: Retries up to 3 times with different service instances

### Health Monitoring
- **Multi-Level Health Checks**:
  - Registry: Heartbeat-based (30s timeout)
  - Load Balancer: HTTP health checks every 20s (10-15 failure threshold)
  - Fault Detector: HTTP health checks every 5s (3 failure threshold)
- **Real-Time Dashboard**: WebSocket-based live updates
- **Metrics Tracking**: RPS, success rate, failure distribution

### Fault Tolerance
- **Automatic Failover**: Unhealthy services removed from routing pool
- **Service Recovery**: Automatically re-adds services when they recover
- **Graceful Degradation**: System continues with fewer services
- **Request Retry**: Automatic retry with different service instance

## Notes

- **Shared Database**: All services share the same SQLite database file (`data/local-db.sqlite`)
- **Default Data**: Database is pre-populated with 10 default data items (data-1 to data-10)
- **JWT Tokens**: Valid across all service instances (same `JWT_SECRET`)
- **Health Checks**: Used by load balancer and fault detector for routing decisions
- **Auto-Creation**: Database file is created automatically on first use
- **Service Discovery**: Services automatically register with the registry on startup
- **Heartbeats**: Services send heartbeats every 10 seconds to maintain registration
- **Fault Tolerance**: Unhealthy services are automatically removed from the routing pool
- **Load Balancing**: Round-robin distribution with health-based filtering
- **Request Timeouts**: 
  - Auth service: 300ms (test endpoint)
  - Data service: 200ms (test endpoint)
  - Compute service: 350ms (test endpoint)
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

## Documentation

- **Load Balancer Explanation**: See `LOAD-BALANCER-EXPLANATION.md` for detailed round-robin algorithm explanation
- **Key Modules to Study**: See `KEY-MODULES-TO-STUDY.md` for important algorithms and modules
