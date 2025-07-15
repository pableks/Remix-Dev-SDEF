#!/bin/bash

# SDEF Deployment Script
echo "🚀 Starting SDEF deployment..."

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Remove old images (optional - uncomment if you want to force rebuild)
# docker rmi $(docker images -q) 2>/dev/null || true

# Build and start containers
echo "🏗️  Building and starting containers..."
docker-compose up -d --build

# Wait for containers to be ready
echo "⏳ Waiting for containers to be ready..."
sleep 10

# Check container status
echo "📊 Container status:"
docker-compose ps

# Check logs
echo "📋 Recent logs:"
docker-compose logs --tail=20

# Test if the application is responding
echo "🔍 Testing application..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Application is running on port 3000"
else
    echo "❌ Application is not responding on port 3000"
    exit 1
fi

# Check if Caddy is running
if curl -f http://localhost > /dev/null 2>&1; then
    echo "✅ Caddy is running and proxying requests"
else
    echo "❌ Caddy is not responding"
    exit 1
fi

echo "🎉 Deployment completed successfully!"
echo "🌐 Your application should be available at: https://sdef.site"
echo "📝 To view logs: docker-compose logs -f"
echo "🛑 To stop: docker-compose down" 