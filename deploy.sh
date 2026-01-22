#!/bin/bash

# Kursovik Deployment Script
# This script prepares and deploys the Kursovik application using Docker

set -e

echo "🚀 Preparing Kursovik for deployment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env file and set your DEEPSEEK_API_KEY"
    echo "   Then run this script again."
    exit 1
fi

# Check if DEEPSEEK_API_KEY is set
if ! grep -q "DEEPSEEK_API_KEY=your_deepseek_api_key_here" .env; then
    echo "✅ DEEPSEEK_API_KEY appears to be configured"
else
    echo "❌ DEEPSEEK_API_KEY is not configured in .env file"
    echo "   Please set your DeepSeek API key in the .env file"
    exit 1
fi

# Build and start services
echo "🐳 Building and starting Docker services..."
docker compose down 2>/dev/null || true
docker compose build --no-cache
docker compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
if docker compose ps | grep -q "Up"; then
    echo "✅ Deployment successful!"
    echo ""
    echo "🌐 Frontend: http://localhost"
    echo "🔧 Backend API: http://localhost:8082"
    echo "📊 Backend Docs: http://localhost:8082/docs"
    echo ""
    echo "To stop the application:"
    echo "  docker compose down"
    echo ""
    echo "To view logs:"
    echo "  docker compose logs -f"
else
    echo "❌ Deployment failed. Check logs:"
    docker compose logs
    exit 1
fi
