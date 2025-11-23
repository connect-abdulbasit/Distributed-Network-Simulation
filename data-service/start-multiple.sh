#!/bin/bash

# Script to start multiple data service instances locally

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting 3 Data Service instances...${NC}"

# Start instance 1
echo -e "${GREEN}Starting data-service-1 on port 4002...${NC}"
PORT=4002 SERVICE_NAME=data-service-1 node data-server.js &
PID1=$!
echo "Started with PID: $PID1"

# Wait a bit
sleep 2

# Start instance 2
echo -e "${GREEN}Starting data-service-2 on port 4003...${NC}"
PORT=4003 SERVICE_NAME=data-service-2 node data-server.js &
PID2=$!
echo "Started with PID: $PID2"

# Wait a bit
sleep 2

# Start instance 3
echo -e "${GREEN}Starting data-service-3 on port 4004...${NC}"
PORT=4004 SERVICE_NAME=data-service-3 node data-server.js &
PID3=$!
echo "Started with PID: $PID3"

echo -e "${BLUE}All instances started!${NC}"
echo "Instance 1 (PID $PID1): http://localhost:4002"
echo "Instance 2 (PID $PID2): http://localhost:4003"
echo "Instance 3 (PID $PID3): http://localhost:4004"
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

