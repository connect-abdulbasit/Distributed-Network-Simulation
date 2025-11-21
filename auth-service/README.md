# Auth Service - Multiple Instances Setup

This auth service can run multiple instances simultaneously for high availability and load distribution.

## Features

- ✅ User registration with email validation
- ✅ User login with password hashing (bcrypt)
- ✅ JWT token generation and verification
- ✅ Health check endpoints (`/health`, `/ready`)
- ✅ Multiple instance support
- ✅ MongoDB support with fallback to in-memory storage

## Quick Start

### Option 1: Using Shell Script (Linux/Mac)

```bash
# Make script executable (already done)
chmod +x start-multiple.sh

# Start 3 instances
./start-multiple.sh
```

This will start:
- Instance 1 on port 3001
- Instance 2 on port 3002
- Instance 3 on port 3003

### Option 2: Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start all 3 instances
pm2 start ecosystem.config.js

# View status
pm2 status

# View logs
pm2 logs

# Stop all
pm2 stop all
pm2 delete all
```

### Option 3: Using Docker Compose

```bash
# From project root
docker-compose -f docker-compose.auth.yml up -d

# View logs
docker-compose -f docker-compose.auth.yml logs -f

# Stop all
docker-compose -f docker-compose.auth.yml down
```

### Option 4: Using Kubernetes

```bash
# Apply deployment (creates 3 replicas)
kubectl apply -f ../kubernetes/auth-deployment.yaml
kubectl apply -f ../kubernetes/services/auth-service.yaml

# Check pods
kubectl get pods -l app=auth-service

# Scale to more instances
kubectl scale deployment auth-service --replicas=5
```

## Testing

### Test Health Endpoints

```bash
# Test all instances
./test-auth-instances.sh

# Or manually:
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
```

### Test Registration

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Test Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Test Token Verification

```bash
# Replace YOUR_TOKEN with the token from registration/login
curl http://localhost:3001/api/auth/verify \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Environment Variables

Create a `.env` file or set environment variables:

```env
PORT=3001
SERVICE_NAME=auth-service-1
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRY=24h
MONGODB_URI=mongodb://localhost:27017/auth-service
NODE_ENV=development
```

## API Endpoints

### Public Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify` - Verify JWT token

### Protected Endpoints

- `GET /api/auth/profile` - Get user profile (requires Bearer token)

### Health Endpoints

- `GET /health` - Health check
- `GET /ready` - Readiness check (includes database status)

## Multiple Instances Configuration

Each instance should have:
- Unique `SERVICE_NAME` (e.g., auth-service-1, auth-service-2, auth-service-3)
- Unique port (if running locally)
- Same `JWT_SECRET` (for token validation across instances)
- Same `MONGODB_URI` (for shared user database)

## Notes

- Currently uses in-memory storage by default (users are stored in a Map)
- For production, configure MongoDB to share user data across instances
- All instances should use the same JWT_SECRET for token validation
- Health checks are used by load balancers and monitoring systems

