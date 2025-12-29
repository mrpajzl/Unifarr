#!/bin/bash

echo "Setting up Unifarr for local development..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    echo "DATABASE_URL=postgresql://unifarr:unifarr@localhost:5432/unifarr" > .env
    echo "✓ Created .env file"
else
    echo "✓ .env file already exists"
fi

# Check if PostgreSQL is running
echo ""
echo "Starting PostgreSQL database..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
sleep 5

# Check if PostgreSQL is accessible
until docker-compose exec -T postgres pg_isready -U unifarr > /dev/null 2>&1; do
    echo "Waiting for PostgreSQL..."
    sleep 2
done

echo "✓ PostgreSQL is ready"
echo ""

# Generate Prisma Client
echo "Generating Prisma Client..."
npm run db:generate

# Push database schema
echo ""
echo "Pushing database schema..."
npm run db:push

echo ""
echo "✓ Setup complete!"
echo ""
echo "You can now run: npm run dev"
echo ""
