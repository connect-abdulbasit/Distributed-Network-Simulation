#!/bin/bash

# Script to start multiple compute service instances locally

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting 3 Compute Service instances...${NC}"

# Start instance 1
echo -e "${GREEN}Starting compute-service-1 on port 5002...${NC}"
PORT=5002 SERVICE_NAME=compute-service-1 node compute-server.js &
PID1=$!
echo "Started with PID: $PID1"

# Wait a bit
sleep 2

# Start instance 2
echo -e "${GREEN}Starting compute-service-2 on port 5003...${NC}"
PORT=5003 SERVICE_NAME=compute-service-2 node compute-server.js &
PID2=$!
echo "Started with PID: $PID2"

# Wait a bit
sleep 2

# Start instance 3
echo -e "${GREEN}Starting compute-service-3 on port 5004...${NC}"
PORT=5004 SERVICE_NAME=compute-service-3 node compute-server.js &
PID3=$!
echo "Started with PID: $PID3"

echo -e "${BLUE}All instances started!${NC}"
echo "Instance 1 (PID $PID1): http://localhost:5002"
echo "Instance 2 (PID $PID2): http://localhost:5003"
echo "Instance 3 (PID $PID3): http://localhost:5004"
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

