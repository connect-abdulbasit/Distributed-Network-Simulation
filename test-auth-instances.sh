#!/bin/bash

echo "Testing all auth service instances..."

# Test instance 1
echo -e "\n=== Testing auth-service-1 (port 3001) ==="
curl -s http://localhost:3001/health | python3 -m json.tool || curl -s http://localhost:3001/health

# Test instance 2
echo -e "\n=== Testing auth-service-2 (port 3002) ==="
curl -s http://localhost:3002/health | python3 -m json.tool || curl -s http://localhost:3002/health

# Test instance 3
echo -e "\n=== Testing auth-service-3 (port 3003) ==="
curl -s http://localhost:3003/health | python3 -m json.tool || curl -s http://localhost:3003/health

echo -e "\n=== Testing registration on instance 1 ==="
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}' | python3 -m json.tool || curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

