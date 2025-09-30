#!/bin/bash

# Render Deployment Script for Social Network Project
echo "🚀 Starting Render deployment setup..."

# Build and deploy using docker-compose
echo "📦 Building production containers..."
docker-compose -f docker-compose.render.yml build --no-cache

echo "🎯 Starting services..."
docker-compose -f docker-compose.render.yml up -d

echo "⏳ Waiting for services to be ready..."
sleep 30

# Check health endpoints
echo "🔍 Checking backend health..."
curl -f http://localhost:5000/api/health || echo "❌ Backend health check failed"

echo "🔍 Checking frontend health..."
curl -f http://localhost:3000 || echo "❌ Frontend health check failed"

echo "✅ Deployment complete!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:5000/api"