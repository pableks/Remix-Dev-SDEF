#!/bin/bash

# SDEF Deployment Script with Proxy Configuration
echo "🚀 Starting SDEF deployment with proxy configuration..."

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Remove old images to force rebuild
echo "🗑️  Removing old images..."
docker rmi $(docker images -q my-app-geo* 2>/dev/null) 2>/dev/null || true

# Build and start containers
echo "🏗️  Building and starting containers with proxy configuration..."
docker-compose up -d --build

# Wait for containers to be ready
echo "⏳ Waiting for containers to be ready..."
sleep 15

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
    echo "📋 App logs:"
    docker-compose logs app
    exit 1
fi

# Check if Caddy is running
if curl -f http://localhost > /dev/null 2>&1; then
    echo "✅ Caddy is running and proxying requests"
else
    echo "❌ Caddy is not responding"
    echo "📋 Caddy logs:"
    docker-compose logs caddy
    exit 1
fi

# Test the proxy endpoints
echo "🔍 Testing proxy endpoints..."

# Test incident API proxy
if curl -f http://localhost/incendios/declarar -X POST -H "Content-Type: application/json" -d '{"test": true}' > /dev/null 2>&1; then
    echo "✅ Incident API proxy is working"
else
    echo "⚠️  Incident API proxy test failed (this might be expected if the endpoint requires specific data)"
fi

# Test backend API proxy
if curl -f http://localhost/api/ > /dev/null 2>&1; then
    echo "✅ Backend API proxy is working"
else
    echo "⚠️  Backend API proxy test failed (this might be expected if the endpoint requires authentication)"
fi

echo "🎉 Deployment completed successfully!"
echo "🌐 Your application should be available at: https://sdef.site"
echo "📝 Backend API calls will be proxied through: https://sdef.site/api/*"
echo "📝 Incident API calls will be proxied through: https://sdef.site/incendios/*"
echo "📝 To view logs: docker-compose logs -f"
echo "🛑 To stop: docker-compose down"

echo ""
echo "🔧 Proxy Configuration:"
echo "   Frontend: https://sdef.site → app:3000"
echo "   Backend API: https://sdef.site/api/* → http://172.203.150.174:8000"
echo "   Incident API: https://sdef.site/incendios/* → http://172.203.150.174:8100" 