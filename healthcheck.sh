#!/bin/bash

# Kursovik Health Check Script
# This script checks if all services are running and healthy

echo "🔍 Checking Kursovik services health..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if docker-compose is running
if ! docker-compose ps | grep -q "Up"; then
    echo -e "${RED}❌ No services are running${NC}"
    echo "Run 'docker-compose up -d' to start services"
    exit 1
fi

# Check backend health
echo "Checking backend service..."
if curl -s -f http://localhost:8082/docs > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend API is healthy${NC}"
else
    echo -e "${RED}❌ Backend API is not responding${NC}"
fi

# Check frontend health
echo "Checking frontend service..."
if curl -s -f http://localhost > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is healthy${NC}"
else
    echo -e "${RED}❌ Frontend is not responding${NC}"
fi

# Check database connectivity (if backend is healthy)
echo "Checking database connectivity..."
if curl -s http://localhost:8082/api/topics/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection is working${NC}"
else
    echo -e "${YELLOW}⚠️  Database connection check failed${NC}"
fi

echo ""
echo "📊 Service Status:"
docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "📝 Useful commands:"
echo "  View logs: docker-compose logs -f"
echo "  Stop services: docker-compose down"
echo "  Restart service: docker-compose restart <service_name>"
