# How Your Distributed Network Simulation Works

## 📁 Project Structure & Roles

### Core Services

#### 1. **`service-registry/`** (Port 3005)
**Role**: Central service discovery registry
- **What it does**: 
  - Maintains a registry of all running services
  - Tracks service health via heartbeats
  - Allows services to register/deregister dynamically
  - Provides service discovery API for load balancer
- **Key Features**:
  - Services register on startup
  - Heartbeat mechanism (every 10 seconds)
  - Automatic cleanup of stale services (30-second timeout)
  - Health-based filtering
- **API Endpoints**:
  - `POST /api/registry/register` - Register a service
  - `POST /api/registry/heartbeat` - Send heartbeat
  - `POST /api/registry/deregister` - Remove service
  - `GET /api/registry/services` - List all services
  - `GET /api/registry/services/:type` - Get services by type

#### 2. **`auth-service/`** (Ports 3001-3003)
**Role**: User authentication and authorization
- **What it does**:
  - User registration and login
  - JWT token generation and verification
  - Password hashing (bcrypt)
  - User profile management
- **Key Features**:
  - Multiple instances can run (for load balancing)
  - Auto-registers with service registry on startup
  - Stores user data in shared SQLite database
  - Health check endpoints (`/health`, `/ready`)
- **API Endpoints**:
  - `POST /api/auth/register` - Register new user
  - `POST /api/auth/login` - User login
  - `GET /api/auth/verify` - Verify JWT token
  - `GET /api/auth/profile` - Get user profile

#### 3. **`data-service/`** (Ports 3002, 4002-4004)
**Role**: Data storage and CRUD operations
- **What it does**:
  - Key-value data storage
  - CRUD operations (Create, Read, Update, Delete)
  - Metadata support
  - Atomic operations to prevent race conditions
- **Key Features**:
  - Multiple instances for load balancing
  - Auto-registers with service registry
  - Uses shared SQLite database
  - Atomic transactions
- **API Endpoints**:
  - `POST /api/data` - Create data item
  - `GET /api/data/:key` - Get data by key
  - `GET /api/data` - Get all data items
  - `PUT /api/data/:key` - Update data item
  - `DELETE /api/data/:key` - Delete data item

#### 4. **`compute-service/`** (Ports 3003, 5002-5004)
**Role**: Heavy computation tasks
- **What it does**:
  - Synchronous computation (direct API calls)
  - Asynchronous job processing (Bull queue with Redis)
  - Mathematical operations (add, multiply, factorial, fibonacci, etc.)
- **Key Features**:
  - Multiple instances for load balancing
  - Job queue for long-running tasks
  - Auto-registers with service registry
  - Job status tracking
- **API Endpoints**:
  - `POST /api/compute/direct` - Direct computation
  - `POST /api/compute/job` - Submit async job
  - `GET /api/compute/job/:jobId` - Get job status
  - `GET /api/compute/stats` - Queue statistics

#### 5. **`load-balancer/`** (Port 3000)
**Role**: Request routing and load distribution
- **What it does**:
  - Routes client requests to appropriate services
  - Distributes load using round-robin algorithm
  - Performs health checks on services
  - Tracks request metrics
- **Key Features**:
  - **Dynamic service discovery** from service registry (every 15 seconds)
  - Health-based routing (only routes to healthy services)
  - Automatic failover (marks unhealthy services)
  - Request retry logic (3 attempts)
  - Request metrics tracking
  - Fallback to static config if registry unavailable
- **Routing**:
  - `/api/auth/*` → Auth services
  - `/api/data/*` → Data services
  - `/api/compute/*` → Compute services
- **API Endpoints**:
  - `GET /health` - Load balancer health
  - `GET /status` - Service status and metrics
  - `GET /api/metrics` - Request metrics

#### 6. **`fault-detector/`** (Port 3004)
**Role**: System monitoring and alerting
- **What it does**:
  - Monitors all services health (every 5 seconds)
  - Tracks response times
  - Sends alerts for service failures
  - Provides real-time dashboard
- **Key Features**:
  - WebSocket support for real-time updates
  - HTML dashboard at `http://localhost:3004`
  - Service failure alerts
  - Recovery notifications
  - Request metrics visualization
- **API Endpoints**:
  - `GET /` - Dashboard (HTML)
  - `GET /health` - Fault detector health
  - `GET /api/status` - All services status
  - `GET /api/status/:type` - Service type status
  - `POST /api/check` - Trigger manual health check

#### 7. **`shared/`**
**Role**: Shared utilities and database
- **What it contains**:
  - `db/localDb.js` - SQLite database wrapper
  - `utils/serviceRegistry.js` - Service registration utility
  - `utils/logger.js` - Logging utilities
  - `utils/apiClient.js` - API client utilities
  - `constants.js` - Shared constants
- **Used by**: All services

#### 8. **`data/`**
**Role**: Database storage
- **What it contains**:
  - `local-db.sqlite` - Shared SQLite database file
  - Used by all services for data persistence

---

## 🔄 How Everything Works Together

### Startup Sequence

1. **Service Registry starts** (Port 3005)
   - Creates empty registry
   - Waits for services to register

2. **Services start** (Auth, Data, Compute)
   - Each service starts on its port
   - **Automatically registers** with service registry
   - Starts sending heartbeats every 10 seconds
   - Connects to shared SQLite database

3. **Load Balancer starts** (Port 3000)
   - **Discovers services** from registry (every 15 seconds)
   - Starts health checking discovered services (every 20 seconds)
   - Ready to route requests

4. **Fault Detector starts** (Port 3004)
   - Begins monitoring all services
   - Dashboard available at `http://localhost:3004`
   - Sends WebSocket updates to dashboard

### Request Flow

```
Client Request
    ↓
Load Balancer (Port 3000)
    ↓ (Discovers services from registry)
    ↓ (Selects healthy service using round-robin)
    ↓
Service Instance (Auth/Data/Compute)
    ↓
Shared SQLite Database (if needed)
    ↓
Response back to Client
```

### Service Discovery Flow

```
Service Startup
    ↓
Register with Service Registry (Port 3005)
    ↓
Start sending heartbeats (every 10 seconds)
    ↓
Load Balancer discovers service (every 15 seconds)
    ↓
Load Balancer adds to routing pool
    ↓
Service receives requests
```

### Health Monitoring Flow

```
Fault Detector (Port 3004)
    ↓ (Checks every 5 seconds)
    ↓
Service Health Check
    ↓
If unhealthy → Alert
    ↓
Load Balancer marks service unhealthy
    ↓
Routes only to healthy services
```

---

## 🚀 How to Run Everything

### Prerequisites
- Node.js installed
- npm installed
- Redis (optional, for compute service job queue)

### Step-by-Step Startup

#### 1. Install Dependencies

```bash
# Install shared utilities first
npm install --prefix shared

# Install all service dependencies
npm install --prefix service-registry
npm install --prefix auth-service
npm install --prefix data-service
npm install --prefix compute-service
npm install --prefix load-balancer
npm install --prefix fault-detector
```

#### 2. Start Services (In Order)

**Terminal 1: Service Registry** (MUST START FIRST)
```bash
cd service-registry
PORT=3005 node registry-server.js
```
Expected output:
```
[REGISTRY] Service Registry started
Listening on port 3005
```

**Terminal 2: Auth Service**
```bash
cd auth-service
PORT=3001 SERVICE_NAME=auth-service-1 node auth-server.js
```
Expected output:
```
[auth-service-1] Auth Service running on port 3001
[SERVICE-REGISTRY] Successfully registered: auth-service-1
```

**Terminal 3: Data Service**
```bash
cd data-service
PORT=3002 SERVICE_NAME=data-service-1 node data-server.js
```
Expected output:
```
[data-service-1] Data Service running on port 3002
[SERVICE-REGISTRY] Successfully registered: data-service-1
```

**Terminal 4: Compute Service**
```bash
cd compute-service
PORT=3003 SERVICE_NAME=compute-service-1 node compute-server.js
```
Expected output:
```
[compute-service-1] Compute Service running on port 3003
[SERVICE-REGISTRY] Successfully registered: compute-service-1
```

**Terminal 5: Load Balancer**
```bash
cd load-balancer
PORT=3000 node load-balancer.js
```
Expected output:
```
Load Balancer started
Listening on port 3000
Service Discovery: DYNAMIC (from service registry)
[DISCOVERY] New auth service discovered: auth-service-1
[DISCOVERY] New data service discovered: data-service-1
[DISCOVERY] New compute service discovered: compute-service-1
```

**Terminal 6: Fault Detector**
```bash
cd fault-detector
PORT=3004 node fault-detector.js
```
Expected output:
```
[FAULT DETECTOR] Running on port 3004
[WebSocket] Server ready for connections on ws://localhost:3004
[FAULT DETECTOR] Monitoring X services
```

### 3. Access Points

- **Load Balancer**: `http://localhost:3000`
- **Fault Detector Dashboard**: `http://localhost:3004` (Open in browser)
- **Service Registry API**: `http://localhost:3005`
- **Direct Service Access**:
  - Auth: `http://localhost:3001`
  - Data: `http://localhost:3002`
  - Compute: `http://localhost:3003`

---

## 🧪 Testing the System

### 1. Test Service Registration
```bash
# Check registered services
curl http://localhost:3005/api/registry/services
```

### 2. Test Load Balancer
```bash
# Route through load balancer
curl http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"pass123"}'
```

### 3. Test Health Monitoring
```bash
# Check service status
curl http://localhost:3004/api/status
```

### 4. View Dashboard
Open browser: `http://localhost:3004`
- See real-time service health
- View request metrics
- Monitor service status

---

## 🔧 Running Multiple Instances (3 of Each Service)

### Port Assignments

When running multiple instances, use these port ranges to avoid conflicts:

- **Auth Services**: Ports 3001, 3002, 3003
- **Data Services**: Ports 4002, 4003, 4004 (avoid conflict with auth)
- **Compute Services**: Ports 5002, 5003, 5004 (avoid conflict with others)

### Complete Setup: 3 Auth + 3 Data + 3 Compute

#### Step 1: Start Service Registry (Required First)
```bash
# Terminal 1
cd service-registry
PORT=3005 node registry-server.js
```

#### Step 2: Start 3 Auth Service Instances

**Terminal 2: Auth Service Instance 1**
```bash
cd auth-service
PORT=3001 SERVICE_NAME=auth-service-1 node auth-server.js
```

**Terminal 3: Auth Service Instance 2**
```bash
cd auth-service
PORT=3002 SERVICE_NAME=auth-service-2 node auth-server.js
```

**Terminal 4: Auth Service Instance 3**
```bash
cd auth-service
PORT=3003 SERVICE_NAME=auth-service-3 node auth-server.js
```

#### Step 3: Start 3 Data Service Instances

**Terminal 5: Data Service Instance 1**
```bash
cd data-service
PORT=4002 SERVICE_NAME=data-service-1 node data-server.js
```

**Terminal 6: Data Service Instance 2**
```bash
cd data-service
PORT=4003 SERVICE_NAME=data-service-2 node data-server.js
```

**Terminal 7: Data Service Instance 3**
```bash
cd data-service
PORT=4004 SERVICE_NAME=data-service-3 node data-server.js
```

#### Step 4: Start 3 Compute Service Instances

**Terminal 8: Compute Service Instance 1**
```bash
cd compute-service
PORT=5002 SERVICE_NAME=compute-service-1 node compute-server.js
```

**Terminal 9: Compute Service Instance 2**
```bash
cd compute-service
PORT=5003 SERVICE_NAME=compute-service-2 node compute-server.js
```

**Terminal 10: Compute Service Instance 3**
```bash
cd compute-service
PORT=5004 SERVICE_NAME=compute-service-3 node compute-server.js
```

#### Step 5: Start Load Balancer
```bash
# Terminal 11
cd load-balancer
PORT=3000 node load-balancer.js
```

The load balancer will automatically discover all 9 service instances from the registry!

#### Step 6: Start Fault Detector
```bash
# Terminal 12
cd fault-detector
PORT=3004 node fault-detector.js
```

### What Happens Automatically

1. **All 9 services register** with the service registry on startup
2. **Load balancer discovers** all instances (every 15 seconds)
3. **Round-robin distribution**:
   - Auth requests → distributed across 3 auth instances
   - Data requests → distributed across 3 data instances
   - Compute requests → distributed across 3 compute instances
4. **Health monitoring**: Fault detector monitors all 9 instances
5. **Dashboard shows**: All 9 services in the monitoring dashboard

### Verify All Instances Are Running

#### Check Service Registry
```bash
# See all registered services
curl http://localhost:3005/api/registry/services

# See only auth services
curl http://localhost:3005/api/registry/services/auth

# See only data services
curl http://localhost:3005/api/registry/services/data

# See only compute services
curl http://localhost:3005/api/registry/services/compute
```

#### Check Load Balancer Status
```bash
# See all discovered services
curl http://localhost:3000/status
```

#### Check Individual Service Health
```bash
# Auth instances
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health

# Data instances
curl http://localhost:4002/health
curl http://localhost:4003/health
curl http://localhost:4004/health

# Compute instances
curl http://localhost:5002/health
curl http://localhost:5003/health
curl http://localhost:5004/health
```

### Testing Load Distribution

Send multiple requests through the load balancer and watch them distribute:

```bash
# Send 10 requests - they'll be distributed across 3 auth instances
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"user$i\",\"email\":\"user$i@test.com\",\"password\":\"pass123\"}"
  echo ""
done
```

Watch the load balancer logs - you'll see requests going to different ports (3001, 3002, 3003) in round-robin fashion!

### Using Helper Scripts (Optional)

Some services have helper scripts to start multiple instances:

**Auth Service:**
```bash
cd auth-service
chmod +x start-multiple.sh
./start-multiple.sh
```

This starts 3 auth instances in the background. You can create similar scripts for data and compute services.

### Quick Start Script (All 9 Instances)

Create a script `start-all-instances.sh` in the root directory:

```bash
#!/bin/bash

# Start Service Registry
cd service-registry && PORT=3005 node registry-server.js &
sleep 2

# Start 3 Auth Services
cd ../auth-service
PORT=3001 SERVICE_NAME=auth-service-1 node auth-server.js &
PORT=3002 SERVICE_NAME=auth-service-2 node auth-server.js &
PORT=3003 SERVICE_NAME=auth-service-3 node auth-server.js &
sleep 3

# Start 3 Data Services
cd ../data-service
PORT=4002 SERVICE_NAME=data-service-1 node data-server.js &
PORT=4003 SERVICE_NAME=data-service-2 node data-server.js &
PORT=4004 SERVICE_NAME=data-service-3 node data-server.js &
sleep 3

# Start 3 Compute Services
cd ../compute-service
PORT=5002 SERVICE_NAME=compute-service-1 node compute-server.js &
PORT=5003 SERVICE_NAME=compute-service-2 node compute-server.js &
PORT=5004 SERVICE_NAME=compute-service-3 node compute-server.js &
PORT=5005 SERVICE_NAME=compute-service-4 node compute-server.js &
PORT=5006 SERVICE_NAME=compute-service-5 node compute-server.js &
sleep 3

# Start Load Balancer
cd ../load-balancer
PORT=3000 node load-balancer.js &
sleep 2

# Start Fault Detector
cd ../fault-detector
PORT=3004 node fault-detector.js

echo "All services started!"
```

### Architecture with Multiple Instances

```
                    ┌─────────────┐
                    │   Client    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Load        │ (Port 3000)
                    │ Balancer    │
                    └──┬───────┬──┘
                       │       │
        ┌───────────────┼───────┼───────────────┐
        │               │       │               │
   ┌────▼────┐    ┌────▼────┐  ┌────▼────┐
   │  Auth   │    │  Data   │  │ Compute │
   │Service  │    │ Service │  │ Service │
   │         │    │         │  │         │
   │ 3001    │    │ 4002    │  │ 5002    │
   │ 3002    │    │ 4003    │  │ 5003    │
   │ 3003    │    │ 4004    │  │ 5004    │
   └────┬────┘    └────┬────┘  └────┬────┘
        │              │             │
        └──────────────┼─────────────┘
                       │
                ┌──────▼──────┐
                │   Shared    │
                │  SQLite DB  │
                └─────────────┘

        ┌───────────────┐
        │   Service     │ (Port 3005)
        │   Registry    │
        └───────────────┘
              ▲
              │ (All 9 instances register here)
              │
        ┌─────┴─────┐
        │           │
   ┌────▼────┐  ┌──▼──────┐
   │  Auth   │  │  Data   │
   │ 1,2,3   │  │ 1,2,3   │
   └─────────┘  └─────────┘
        │
   ┌────▼────┐
   │ Compute │
   │ 1,2,3   │
   └─────────┘

        ┌───────────────┐
        │   Fault       │ (Port 3004)
        │   Detector    │
        │  + Dashboard  │
        │ (Monitors all │
        │   9 instances)│
        └───────────────┘
```

### Benefits of Multiple Instances

1. **High Availability**: If one instance fails, others continue serving requests
2. **Load Distribution**: Requests spread across instances, reducing load per instance
3. **Scalability**: Can handle more concurrent requests
4. **Zero Downtime**: Can restart individual instances without affecting others
5. **Automatic Failover**: Load balancer automatically routes away from unhealthy instances

### Monitoring Multiple Instances

Open the dashboard at `http://localhost:3004` to see:
- All 9 service instances
- Health status of each
- Request distribution across instances
- Real-time metrics per instance

---

## 📊 System Architecture

### Single Instance Architecture
```
                    ┌─────────────┐
                    │   Client    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Load        │ (Port 3000)
                    │ Balancer    │
                    └──┬───────┬──┘
                       │       │
        ┌───────────────┼───────┼───────────────┐
        │               │       │               │
   ┌────▼────┐    ┌────▼────┐  ┌────▼────┐
   │  Auth   │    │  Data   │  │ Compute │
   │Service  │    │ Service │  │ Service │
   │(3001)   │    │ (3002)  │  │ (3003)  │
   └────┬────┘    └────┬────┘  └────┬────┘
        │              │             │
        └──────────────┼─────────────┘
                       │
                ┌──────▼──────┐
                │   Shared    │
                │  SQLite DB  │
                └─────────────┘

        ┌───────────────┐
        │   Service     │ (Port 3005)
        │   Registry    │
        └───────────────┘
              ▲
              │ (Registration & Discovery)
              │
        ┌─────┴─────┐
        │           │
   ┌────▼────┐  ┌──▼──────┐
   │  Auth   │  │  Data   │
   │Service  │  │ Service │
   └─────────┘  └─────────┘

        ┌───────────────┐
        │   Fault       │ (Port 3004)
        │   Detector    │
        │  + Dashboard  │
        └───────────────┘
```

### Multiple Instances Architecture (3 of Each)
```
                    ┌─────────────┐
                    │   Client    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Load        │ (Port 3000)
                    │ Balancer    │ ← Discovers all 9 instances
                    └──┬───────┬──┘
                       │       │
        ┌───────────────┼───────┼───────────────┐
        │               │       │               │
   ┌────▼────┐    ┌────▼────┐  ┌────▼────┐
   │  Auth   │    │  Data   │  │ Compute │
   │         │    │         │  │         │
   │ 3001 ✓  │    │ 4002 ✓  │  │ 5002 ✓  │
   │ 3002 ✓  │    │ 4003 ✓  │  │ 5003 ✓  │
   │ 3003 ✓  │    │ 4004 ✓  │  │ 5004 ✓  │
   └────┬────┘    └────┬────┘  └────┬────┘
        │              │             │
        └──────────────┼─────────────┘
                       │
                ┌──────▼──────┐
                │   Shared    │
                │  SQLite DB  │
                └─────────────┘

        ┌───────────────┐
        │   Service     │ (Port 3005)
        │   Registry    │ ← All 9 instances register here
        └───────────────┘
              ▲
              │ (Registration & Heartbeats)
              │
        ┌─────┴─────┐
        │           │
   ┌────▼────┐  ┌──▼──────┐  ┌────▼────┐
   │  Auth   │  │  Data   │  │ Compute │
   │ 1,2,3   │  │ 1,2,3   │  │ 1,2,3   │
   └─────────┘  └─────────┘  └─────────┘

        ┌───────────────┐
        │   Fault       │ (Port 3004)
        │   Detector    │ ← Monitors all 9 instances
        │  + Dashboard  │
        └───────────────┘
```

---

## 🔑 Key Concepts

### Dynamic Service Discovery
- Services **register themselves** when they start
- Load balancer **discovers** services from registry
- No need to manually configure service URLs
- Services can be added/removed at runtime

### Health-Based Routing
- Load balancer only routes to **healthy** services
- Unhealthy services are automatically excluded
- Services recover automatically when they become healthy again

### Heartbeat Mechanism
- Services send heartbeats every **10 seconds**
- Registry marks services as unhealthy if no heartbeat for **30 seconds**
- Ensures only active services are in the registry

### Round-Robin Load Balancing
- Requests distributed evenly across healthy services
- Each service type has its own round-robin counter
- Automatically adjusts when services are added/removed

---

## 🛠️ Environment Variables

### Service Registry
- `PORT` - Registry port (default: 3005)

### Services (Auth, Data, Compute)
- `PORT` - Service port
- `SERVICE_NAME` - Service instance name
- `SERVICE_HOST` - Host for service URL (default: localhost)
- `SERVICE_REGISTRY_URL` - Registry URL (default: http://localhost:3005)

### Load Balancer
- `PORT` - Load balancer port (default: 3000)
- `USE_DYNAMIC_DISCOVERY` - Enable/disable dynamic discovery (default: true)
- `SERVICE_HOST` - Service host (default: localhost)

### Fault Detector
- `PORT` - Fault detector port (default: 3004)
- `LOAD_BALANCER_URL` - Load balancer URL (default: http://localhost:3000)

---

## 📝 Quick Reference

### Single Instance Setup
| Component | Port | Purpose | Auto-Registers |
|-----------|------|---------|----------------|
| Service Registry | 3005 | Service discovery | No |
| Load Balancer | 3000 | Request routing | No |
| Fault Detector | 3004 | Monitoring | No |
| Auth Service | 3001 | Authentication | Yes |
| Data Service | 3002 | Data storage | Yes |
| Compute Service | 3003 | Computation | Yes |

### Multiple Instances Setup (3 of Each)
| Component | Ports | Purpose | Auto-Registers |
|-----------|-------|---------|----------------|
| Service Registry | 3005 | Service discovery | No |
| Load Balancer | 3000 | Request routing | No |
| Fault Detector | 3004 | Monitoring | No |
| Auth Services | 3001, 3002, 3003 | Authentication | Yes (each) |
| Data Services | 4002, 4003, 4004 | Data storage | Yes (each) |
| Compute Services | 5002, 5003, 5004 | Computation | Yes (each) |

**Total**: 1 Registry + 1 Load Balancer + 1 Fault Detector + 9 Service Instances = **12 processes**

---

## 🎯 Summary

Your system is a **fully dynamic microservices architecture** where:

1. **Services register themselves** automatically
2. **Load balancer discovers** services dynamically
3. **Health monitoring** ensures only healthy services receive traffic
4. **Real-time dashboard** shows system status
5. **Shared database** provides data persistence
6. **Multiple instances** can run for scalability

Everything works together automatically - just start the services in order and they'll discover and connect to each other!

