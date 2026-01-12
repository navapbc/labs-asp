#!/bin/bash

# Development Frontend Startup Script
# This script starts the backend services in Docker and runs the frontend locally

echo "🚀 Starting development environment..."
echo ""

# Check if backend services are running
echo "📦 Checking backend services..."
docker-compose ps | grep -q "postgres.*Up" && \
docker-compose ps | grep -q "mastra-app.*Up" && \
docker-compose ps | grep -q "browser-streaming.*Up"

if [ $? -ne 0 ]; then
    echo "⚠️  Backend services not running. Starting them now..."
    docker-compose up -d postgres mastra-app browser-streaming
    echo "⏳ Waiting for services to be healthy..."
    sleep 10
else
    echo "✅ Backend services already running"
fi

# Stop ai-chatbot container if it's running
if docker-compose ps | grep -q "ai-chatbot.*Up"; then
    echo "🛑 Stopping ai-chatbot container..."
    docker-compose stop ai-chatbot
fi

echo ""
echo "✅ Backend services ready:"
echo "   - PostgreSQL: localhost:5434"
echo "   - Mastra API: http://localhost:4111"
echo "   - Browser Streaming: ws://localhost:8933"
echo ""
echo "🎨 Starting Next.js dev server..."
echo "   Frontend will be available at: http://localhost:3000"
echo ""
echo "💡 Hot reloading enabled - changes will update instantly!"
echo ""

# Start the frontend
cd client && pnpm dev
