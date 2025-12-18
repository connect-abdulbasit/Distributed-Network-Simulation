#!/bin/bash

# Script to start all services with 3 instances each

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

INSTANCES=3

echo -e "${BLUE}Starting Distributed Network Simulation with ${INSTANCES} instances per service...${NC}"
echo ""

kill_port_process() {
    local port=$1
    local pid
    pid=$(lsof -Pi :$port -sTCP:LISTEN -t 2>/dev/null)
    if [ -n "$pid" ]; then
        echo -e "${YELLOW}Port $port in use by PID $pid. Killing...${NC}"
        kill $pid 2>/dev/null
        sleep 1
        if kill -0 $pid 2>/dev/null; then
            echo -e "${YELLOW}PID $pid still running, forcing kill...${NC}"
            kill -9 $pid 2>/dev/null
        fi
        echo -e "${GREEN}Port $port cleared${NC}"
    fi
}

# Calculate ports needed
AUTH_PORTS=()
DATA_PORTS=()
COMPUTE_PORTS=()

for i in $(seq 1 $INSTANCES); do
    AUTH_PORTS+=($((3000 + i)))
    DATA_PORTS+=($((4001 + i)))
    COMPUTE_PORTS+=($((5001 + i)))
done

ALL_PORTS=(3005 3000 3004 ${AUTH_PORTS[@]} ${DATA_PORTS[@]} ${COMPUTE_PORTS[@]})

echo -e "${BLUE}Checking ports and clearing if busy...${NC}"
for port in "${ALL_PORTS[@]}"; do
    kill_port_process "$port"
done

echo ""
echo -e "${GREEN}Starting Service Registry on port 3005...${NC}"
cd service-registry
PORT=3005 node registry-server.js > /tmp/service-registry.log 2>&1 &
REGISTRY_PID=$!
cd ..
sleep 3

# Start Auth Service Instances
echo ""
echo -e "${GREEN}Starting ${INSTANCES} Auth Service instances...${NC}"
AUTH_PIDS=()
for i in $(seq 1 $INSTANCES); do
    PORT=$((3000 + i))
    SERVICE_NAME="auth-service-${i}"
    echo -e "${GREEN}Starting ${SERVICE_NAME} on port ${PORT}...${NC}"
    cd auth-service
    PORT=${PORT} SERVICE_NAME=${SERVICE_NAME} JWT_SECRET=your-secret-key node auth-server.js &
    AUTH_PIDS+=($!)
    cd ..
    sleep 1
done

# Start Data Service Instances
echo ""
echo -e "${GREEN}Starting ${INSTANCES} Data Service instances...${NC}"
DATA_PIDS=()
for i in $(seq 1 $INSTANCES); do
    PORT=$((4001 + i))
    SERVICE_NAME="data-service-${i}"
    echo -e "${GREEN}Starting ${SERVICE_NAME} on port ${PORT}...${NC}"
    cd data-service
    PORT=${PORT} SERVICE_NAME=${SERVICE_NAME} node data-server.js &
    DATA_PIDS+=($!)
    cd ..
    sleep 1
done

# Start Compute Service Instances
echo ""
echo -e "${GREEN}Starting ${INSTANCES} Compute Service instances...${NC}"
COMPUTE_PIDS=()
for i in $(seq 1 $INSTANCES); do
    PORT=$((5001 + i))
    SERVICE_NAME="compute-service-${i}"
    echo -e "${GREEN}Starting ${SERVICE_NAME} on port ${PORT}...${NC}"
    cd compute-service
    PORT=${PORT} SERVICE_NAME=${SERVICE_NAME} node compute-server.js &
    COMPUTE_PIDS+=($!)
    cd ..
    sleep 1
done

sleep 3

echo ""
echo -e "${GREEN}Starting Load Balancer on port 3000...${NC}"
cd load-balancer
PORT=3000 node load-balancer.js &
LB_PID=$!
cd ..
sleep 2

echo -e "${GREEN}Starting Fault Detector on port 3004...${NC}"
cd fault-detector
PORT=3004 node fault-detector.js > /tmp/fault-detector.log 2>&1 &
FAULT_PID=$!
cd ..
sleep 2

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}All services started with ${INSTANCES} instances each!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Service Registry:"
echo "  - Registry (PID $REGISTRY_PID): http://localhost:3005"
echo ""
echo "Auth Service Instances:"
for i in $(seq 1 $INSTANCES); do
    PORT=$((3000 + i))
    PID=${AUTH_PIDS[$((i-1))]}
    echo "  - Instance ${i} (PID $PID): http://localhost:${PORT}"
done
echo ""
echo "Data Service Instances:"
for i in $(seq 1 $INSTANCES); do
    PORT=$((4001 + i))
    PID=${DATA_PIDS[$((i-1))]}
    echo "  - Instance ${i} (PID $PID): http://localhost:${PORT}"
done
echo ""
echo "Compute Service Instances:"
for i in $(seq 1 $INSTANCES); do
    PORT=$((5001 + i))
    PID=${COMPUTE_PIDS[$((i-1))]}
    echo "  - Instance ${i} (PID $PID): http://localhost:${PORT}"
done
echo ""
echo "Load Balancer:"
echo "  - Load Balancer (PID $LB_PID): http://localhost:3000"
echo ""
echo "Fault Detector:"
echo "  - Fault Detector (PID $FAULT_PID): http://localhost:3004"
echo "  - Dashboard: http://localhost:3004"
echo ""
echo -e "${YELLOW}Test the load balancer:${NC}"
echo "  curl http://localhost:3000/health"
echo "  curl http://localhost:3000/status"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${BLUE}Stopping all services...${NC}"
    kill $FAULT_PID $LB_PID ${COMPUTE_PIDS[@]} ${DATA_PIDS[@]} ${AUTH_PIDS[@]} $REGISTRY_PID 2>/dev/null
    echo "All services stopped"
    exit
}

# Trap Ctrl+C
trap cleanup INT

# Wait for all processes
wait