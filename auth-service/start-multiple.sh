#!/bin/bash

# Script to start multiple auth service instances locally

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting 3 Auth Service instances...${NC}"

# Start instance 1
echo -e "${GREEN}Starting auth-service-1 on port 3001...${NC}"
PORT=3001 SERVICE_NAME=auth-service-1 JWT_SECRET=your-secret-key node auth-server.js &
PID1=$!
echo "Started with PID: $PID1"

# Wait a bit
sleep 2

# Start instance 2
echo -e "${GREEN}Starting auth-service-2 on port 3002...${NC}"
PORT=3002 SERVICE_NAME=auth-service-2 JWT_SECRET=your-secret-key node auth-server.js &
PID2=$!
echo "Started with PID: $PID2"

# Wait a bit
sleep 2

# Start instance 3
echo -e "${GREEN}Starting auth-service-3 on port 3003...${NC}"
PORT=3003 SERVICE_NAME=auth-service-3 JWT_SECRET=your-secret-key node auth-server.js &
PID3=$!
echo "Started with PID: $PID3"

echo -e "${BLUE}All instances started!${NC}"
echo "Instance 1 (PID $PID1): http://localhost:3001"
echo "Instance 2 (PID $PID2): http://localhost:3002"
echo "Instance 3 (PID $PID3): http://localhost:3003"
echo ""
echo "Press Ctrl+C to stop all instances"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${BLUE}Stopping all instances...${NC}"
    kill $PID1 $PID2 $PID3 2>/dev/null
    echo "All instances stopped"
    exit
}

# Trap Ctrl+C
trap cleanup INT

# Wait for all processes
wait

