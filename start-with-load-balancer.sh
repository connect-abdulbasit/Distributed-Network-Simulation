#!/bin/bash

# Script to start auth services, data services, compute services, and load balancer for testing

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Distributed Network Simulation with Load Balancer...${NC}"
echo ""

# Check if services are already running
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}Warning: Port 3001 is already in use${NC}"
fi
if lsof -Pi :3002 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}Warning: Port 3002 is already in use${NC}"
fi
if lsof -Pi :3003 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}Warning: Port 3003 is already in use${NC}"
fi
if lsof -Pi :4002 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}Warning: Port 4002 is already in use${NC}"
fi
if lsof -Pi :4003 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}Warning: Port 4003 is already in use${NC}"
fi
if lsof -Pi :4004 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}Warning: Port 4004 is already in use${NC}"
fi
if lsof -Pi :5002 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}Warning: Port 5002 is already in use${NC}"
fi
if lsof -Pi :5003 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}Warning: Port 5003 is already in use${NC}"
fi
if lsof -Pi :5004 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}Warning: Port 5004 is already in use${NC}"
fi
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}Warning: Port 3000 (load balancer) is already in use${NC}"
fi

echo ""
echo -e "${GREEN}Starting Auth Service Instance 1 on port 3001...${NC}"
cd auth-service
PORT=3001 SERVICE_NAME=auth-service-1 JWT_SECRET=your-secret-key node auth-server.js &
AUTH1_PID=$!
cd ..

sleep 2

echo -e "${GREEN}Starting Auth Service Instance 2 on port 3002...${NC}"
cd auth-service
PORT=3002 SERVICE_NAME=auth-service-2 JWT_SECRET=your-secret-key node auth-server.js &
AUTH2_PID=$!
cd ..

sleep 2

echo -e "${GREEN}Starting Auth Service Instance 3 on port 3003...${NC}"
cd auth-service
PORT=3003 SERVICE_NAME=auth-service-3 JWT_SECRET=your-secret-key node auth-server.js &
AUTH3_PID=$!
cd ..

sleep 2

echo -e "${GREEN}Starting Data Service Instance 1 on port 4002...${NC}"
cd data-service
PORT=4002 SERVICE_NAME=data-service-1 node data-server.js &
DATA1_PID=$!
cd ..

sleep 2

echo -e "${GREEN}Starting Data Service Instance 2 on port 4003...${NC}"
cd data-service
PORT=4003 SERVICE_NAME=data-service-2 node data-server.js &
DATA2_PID=$!
cd ..

sleep 2

echo -e "${GREEN}Starting Data Service Instance 3 on port 4004...${NC}"
cd data-service
PORT=4004 SERVICE_NAME=data-service-3 node data-server.js &
DATA3_PID=$!
cd ..

sleep 2

echo -e "${GREEN}Starting Compute Service Instance 1 on port 5002...${NC}"
cd compute-service
PORT=5002 SERVICE_NAME=compute-service-1 node compute-server.js &
COMPUTE1_PID=$!
cd ..

sleep 2

echo -e "${GREEN}Starting Compute Service Instance 2 on port 5003...${NC}"
cd compute-service
PORT=5003 SERVICE_NAME=compute-service-2 node compute-server.js &
COMPUTE2_PID=$!
cd ..

sleep 2

echo -e "${GREEN}Starting Compute Service Instance 3 on port 5004...${NC}"
cd compute-service
PORT=5004 SERVICE_NAME=compute-service-3 node compute-server.js &
COMPUTE3_PID=$!
cd ..

sleep 3

echo -e "${GREEN}Starting Load Balancer on port 3000...${NC}"
cd load-balancer
PORT=3000 node load-balancer.js &
LB_PID=$!
cd ..

sleep 2

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}All services started!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Auth Service Instances:"
echo "  - Instance 1 (PID $AUTH1_PID): http://localhost:3001"
echo "  - Instance 2 (PID $AUTH2_PID): http://localhost:3002"
echo "  - Instance 3 (PID $AUTH3_PID): http://localhost:3003"
echo ""
echo "Data Service Instances:"
echo "  - Instance 1 (PID $DATA1_PID): http://localhost:4002"
echo "  - Instance 2 (PID $DATA2_PID): http://localhost:4003"
echo "  - Instance 3 (PID $DATA3_PID): http://localhost:4004"
echo ""
echo "Compute Service Instances:"
echo "  - Instance 1 (PID $COMPUTE1_PID): http://localhost:5002"
echo "  - Instance 2 (PID $COMPUTE2_PID): http://localhost:5003"
echo "  - Instance 3 (PID $COMPUTE3_PID): http://localhost:5004"
echo ""
echo "Load Balancer:"
echo "  - Load Balancer (PID $LB_PID): http://localhost:3000"
echo ""
echo -e "${YELLOW}Test the load balancer:${NC}"
echo "  curl http://localhost:3000/health"
echo "  curl http://localhost:3000/status"
echo "  curl -X POST http://localhost:3000/api/auth/register -H 'Content-Type: application/json' -d '{\"username\":\"test\",\"email\":\"test@example.com\",\"password\":\"test123\"}'"
echo "  curl -X POST http://localhost:3000/api/data -H 'Content-Type: application/json' -d '{\"key\":\"test-key\",\"value\":{\"foo\":\"bar\"}}'"
echo "  curl -X POST http://localhost:3000/api/compute/direct -H 'Content-Type: application/json' -d '{\"operation\":\"add\",\"operands\":[1,2,3,4,5]}'"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${BLUE}Stopping all services...${NC}"
    kill $AUTH1_PID $AUTH2_PID $AUTH3_PID $DATA1_PID $DATA2_PID $DATA3_PID $COMPUTE1_PID $COMPUTE2_PID $COMPUTE3_PID $LB_PID 2>/dev/null
    echo "All services stopped"
    exit
}

# Trap Ctrl+C
trap cleanup INT

# Wait for all processes
wait

