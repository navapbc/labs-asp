#!/bin/bash

# Stop development environment

echo "🛑 Stopping development environment..."
echo ""

# Stop all docker services
echo "📦 Stopping Docker services..."
docker-compose down

echo ""
echo "✅ All services stopped"
echo ""
echo "To restart, run: ./dev-frontend.sh"
