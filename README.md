# **Distributed Network Simulation**

A distributed microservices system implementing **load balancing**, **fault tolerance**, **dynamic service discovery**, and **shared decentralized persistence** using a local SQLite database.

---

# 🚀 **Architecture Overview**

The system contains multiple loosely-coupled microservices working together through a central registry and load balancer.

### **Core Components**

| Component                  | Port(s)                | Description                                                                       |
| -------------------------- | ---------------------- | --------------------------------------------------------------------------------- |
| **Service Registry**       | **3005**               | Central system for service registration, discovery, heartbeats, and health checks |
| **Auth Service (×3)**      | 3001–3003              | Handles signup/login and issues JWT tokens                                        |
| **Data Service (×3)**      | 4002–4004              | CRUD operations using shared SQLite DB                                            |
| **Compute Service (×3)**   | 5002–5004              | Heavy computation tasks, async job execution                                      |
| **Load Balancer**          | **3000**               | Round-robin routing, failover, retries, health filtering                          |
| **Fault Detector**         | **3004**               | Monitors service health and provides real-time dashboard                          |
| **Shared Local SQLite DB** | `data/local-db.sqlite` | Accessible by all services                                                        |

---

# 🔍 **Dynamic Service Discovery**

All services:

* Register with the registry at startup
* Send periodic **heartbeats**
* Are marked **healthy** or **unhealthy** automatically
* Are included/excluded from routing dynamically
* Auto-recover when they restart

The load balancer refreshes discovery information **every 15 seconds**.

---

# ⚡ **Quick Start**

## **1. Install Dependencies**

```bash
npm install --prefix shared
npm install --prefix auth-service
npm install --prefix data-service
npm install --prefix compute-service
npm install --prefix load-balancer
npm install --prefix fault-detector
npm install --prefix service-registry
```

---

# 🚀 **Start All Services Automatically (Recommended)**

```bash
chmod +x start-with-load-balancer.sh
./start-with-load-balancer.sh
```

This script:

✔ Kills ports
✔ Starts registry → auth → data → compute → load balancer → fault detector
✔ Waits between services
✔ Ensures proper orchestration

Total time: **30–40 seconds**

Press **Ctrl+C** anytime to shut down gracefully.

---

# 🟦 **Manual Startup Guide (Step-By-Step)**

## **Step 1 — Start Service Registry (MUST be first)**

```bash
cd service-registry
PORT=3005 node registry-server.js
```

Wait: **3 seconds**

---

## **Step 2 — Start Backend Services**

You can start them in any order.

### **Auth Services (must share same JWT_SECRET)**

```bash
cd auth-service
PORT=3001 SERVICE_NAME=auth-service-1 node auth-server.js
PORT=3002 SERVICE_NAME=auth-service-2 node auth-server.js
PORT=3003 SERVICE_NAME=auth-service-3 node auth-server.js
```

### **Data Services**

```bash
cd data-service
PORT=4002 SERVICE_NAME=data-service-1 node data-server.js
PORT=4003 SERVICE_NAME=data-service-2 node data-server.js
PORT=4004 SERVICE_NAME=data-service-3 node data-server.js
```

### **Compute Services**

```bash
cd compute-service
PORT=5002 SERVICE_NAME=compute-service-1 node compute-server.js
PORT=5003 SERVICE_NAME=compute-service-2 node compute-server.js
PORT=5004 SERVICE_NAME=compute-service-3 node compute-server.js
```

Wait: **2 seconds** between each service.

---

## **Step 3 — Start Load Balancer**

```bash
cd load-balancer
PORT=3000 node load-balancer.js
```

Wait: **3 seconds**
(Services need time to register)

---

## **Step 4 — Start Fault Detector**

```bash
cd fault-detector
PORT=3004 node fault-detector.js
```

Dashboard available at:
👉 **[http://localhost:3004](http://localhost:3004)**

---

# 🧪 **Verification**

Run in this order:

```bash
# Registry
curl http://localhost:3005/health
curl http://localhost:3005/api/registry/services

# Auth / Data / Compute sample instance
curl http://localhost:3001/health
curl http://localhost:4002/health
curl http://localhost:5002/health

# Load Balancer
curl http://localhost:3000/health
curl http://localhost:3000/status

# Fault Detector
curl http://localhost:3004/health
```

---

# 🧩 **Load Balancer — Round Robin Explained**

The load balancer uses **true round-robin with per-service counters**:

```
index = counter % healthyServiceCount
counter++
```

Example (3 auth services):

```
Req 1 → auth-service-1  (index=0)
Req 2 → auth-service-2  (index=1)
Req 3 → auth-service-3  (index=2)
Req 4 → auth-service-1  (index=0)
```

Features:

* Health-aware
* Retries with alternative instances
* Per-service routing (auth/data/compute)
* Failure thresholds
* Dynamic adaptation when services die or restart

---

# 🔐 **Auth Service Endpoints**

### **Signup**

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","email":"demo@example.com","password":"secret123"}'
```

### **Login**

```bash
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"secret123"}'
```

---

# 📦 **Data Service Endpoints**

### **Fetch data item**

```bash
curl http://localhost:3000/api/data/data-1
```

### **Test 200ms delay**

```bash
curl http://localhost:3000/api/data/data-work
```

---

# 🧮 **Compute Service Endpoints**

### **Test 350ms worker**

```bash
curl http://localhost:3000/api/compute/compute-worker
```

### **Direct computation**

```bash
curl -X POST http://localhost:3000/api/compute/direct \
  -H "Content-Type: application/json" \
  -d '{"operation":"add","operands":[1,2,3]}'
```

---

# 🗄 **Service Registry Endpoints**

```bash
# List services
curl http://localhost:3005/api/registry/services

# Register
curl -X POST http://localhost:3005/api/registry/register ...

# Heartbeat
curl -X POST http://localhost:3005/api/registry/heartbeat ...

# Deregister
curl -X POST http://localhost:3005/api/registry/deregister ...
```

---

# 🛠 Troubleshooting

### **❌ Services not registering**

→ Start Registry first
→ Check via:

```bash
curl http://localhost:3005/health
```

### **❌ Port already in use**

```bash
lsof -ti:3005 | xargs kill -9
```

### **❌ Load balancer shows empty services**

→ Wait 15 sec for discovery
→ Check registry list

### **❌ Service crashes on start**

→ Install dependencies

```bash
npm install --prefix service-dir
```

---

# 🎯 Conclusion

This project demonstrates:

✔ Distributed microservices
✔ Real round-robin load balancing
✔ Health-based routing
✔ Fault tolerance
✔ Self-healing service registry
✔ Full monitoring dashboard
✔ Shared SQLite persistence
✅ **Architecture diagram**
✅ **Sequence diagrams**
✅ **Project Report** (Final Year / University standard)

Just tell me!
