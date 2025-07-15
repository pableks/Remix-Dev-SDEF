#!/bin/bash

# Quick Caddy Update Script
echo "🔄 Updating Caddy configuration..."

# Stop only the Caddy container
echo "🛑 Stopping Caddy container..."
docker-compose stop caddy

# Remove the Caddy container to force recreation
echo "🗑️  Removing old Caddy container..."
docker-compose rm -f caddy

# Start Caddy with new configuration
echo "🚀 Starting Caddy with updated configuration..."
docker-compose up -d caddy

# Wait a moment for Caddy to start
echo "⏳ Waiting for Caddy to start..."
sleep 5

# Check if Caddy is running
if curl -f http://localhost > /dev/null 2>&1; then
    echo "✅ Caddy is running with updated configuration"
else
    echo "❌ Caddy is not responding"
    echo "📋 Checking logs..."
    docker-compose logs caddy
    exit 1
fi

echo "🎉 Caddy configuration updated successfully!"
echo "🌐 Your application should now work at: https://sdef.site"
echo "📝 To view Caddy logs: docker-compose logs -f caddy" 