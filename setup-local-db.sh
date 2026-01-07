#!/bin/bash

# Script to set up local PostgreSQL database and run migrations

echo "🚀 Starting PostgreSQL container..."
docker-compose up -d postgres

echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Check if PostgreSQL is healthy
until docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
  echo "Waiting for PostgreSQL to start..."
  sleep 2
done

echo "✅ PostgreSQL is ready!"
echo ""
echo "📊 Database connection details:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/labs_asp_dev"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Add this to your .env file"
echo ""
echo "🔄 Running database migrations..."
echo ""

# Export DATABASE_URL for the migration scripts
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/labs_asp_dev"

echo "📋 Step 1: Running participant/household migrations..."
node migrations/run-migrations.js

if [ $? -eq 0 ]; then
  echo "✅ Participant migrations completed!"
  echo ""
  echo "📋 Step 2: Running client/chat migrations..."
  cd client
  pnpm exec tsx lib/db/migrate.ts
  cd ..
  
  if [ $? -eq 0 ]; then
    echo "✅ Client migrations completed!"
    echo ""
    echo "✅ All database setup complete!"
    echo ""
    echo "📊 Tables created:"
    echo "   • participants, household_dependents, mastra_artifacts"
    echo "   • Chat, User, Message, Document, Suggestion, Vote, Stream"
    echo ""
    echo "📝 To connect to the database:"
    echo "   docker-compose exec postgres psql -U postgres -d labs_asp_dev"
    echo ""
    echo "🛑 To stop the database:"
    echo "   docker-compose down"
    echo ""
    echo "🗑️  To remove database data (fresh start):"
    echo "   docker-compose down -v"
  else
    echo ""
    echo "❌ Client migrations failed! Check the error messages above."
    exit 1
  fi
else
  echo ""
  echo "❌ Participant migrations failed! Check the error messages above."
  exit 1
fi

