#!/bin/bash

# No-Code AI Agency Builder - Startup Script
# This script sets up and starts the entire system

set -e

echo "==========================================="
echo "  No-Code AI Agency Builder"
echo "  Starting up..."
echo "==========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Database configuration
DB_NAME="nocode_ai_agency"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_HOST="localhost"
DB_PORT="5432"

# Application port
APP_PORT=3000

# Check if yarn is installed, otherwise use npm
if command -v yarn &> /dev/null; then
    PKG_MANAGER="yarn"
    PKG_INSTALL="yarn install"
    PKG_RUN="yarn"
else
    PKG_MANAGER="npm"
    PKG_INSTALL="npm install"
    PKG_RUN="npm run"
fi
print_status "Using package manager: $PKG_MANAGER"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi
print_status "Node.js found: $(node --version)"

# Check if PostgreSQL is running
if command -v pg_isready &> /dev/null; then
    if pg_isready -h $DB_HOST -p $DB_PORT -q; then
        print_status "PostgreSQL is running on $DB_HOST:$DB_PORT"
    else
        print_error "PostgreSQL is not running on $DB_HOST:$DB_PORT. Please start PostgreSQL first."
        exit 1
    fi
else
    print_warning "Cannot verify PostgreSQL status. Make sure it's running on $DB_HOST:$DB_PORT"
fi

# Check if database exists, create if not
check_database() {
    if command -v psql &> /dev/null; then
        if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw $DB_NAME; then
            print_status "Database '$DB_NAME' exists"
            return 0
        else
            print_info "Database '$DB_NAME' does not exist. Creating..."
            PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;" 2>/dev/null
            if [ $? -eq 0 ]; then
                print_status "Database '$DB_NAME' created successfully"
                return 1
            else
                print_error "Failed to create database. Please create it manually:"
                echo "  psql -U postgres -c \"CREATE DATABASE $DB_NAME;\""
                exit 1
            fi
        fi
    else
        print_warning "psql not found. Cannot verify database exists."
        return 0
    fi
}

# Kill any process using the app port
cleanup_port() {
    if command -v lsof &> /dev/null; then
        local pid=$(lsof -ti:$APP_PORT 2>/dev/null)
        if [ -n "$pid" ]; then
            print_info "Port $APP_PORT is in use by PID $pid. Killing..."
            kill -9 $pid 2>/dev/null || true
            sleep 1
            print_status "Port $APP_PORT freed"
        fi
    fi
}

# Check if seeding is needed
needs_seeding() {
    if command -v psql &> /dev/null; then
        local count=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | tr -d ' ')
        if [ -z "$count" ] || [ "$count" = "" ] || [ "$count" -eq 0 ] 2>/dev/null; then
            return 0  # Needs seeding
        else
            return 1  # Already seeded
        fi
    fi
    return 0  # Default to needs seeding if can't check
}

# Create .env file if it doesn't exist
setup_env() {
    if [ ! -f ".env" ]; then
        print_info "Creating .env file with defaults..."
        cat > .env << EOF
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?schema=public"
NEXTAUTH_SECRET="your-super-secret-key-change-in-production-$(date +%s)"
NEXTAUTH_URL="http://localhost:$APP_PORT"

# OpenRouter AI Configuration
OPENROUTER_API_KEY="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"
OPENROUTER_MODEL="anthropic/claude-3-haiku"
EOF
        print_status ".env file created"
    else
        print_status ".env file found"
    fi
}

# Main execution
echo ""
print_info "Step 1: Checking environment..."
cleanup_port
check_database
DB_CREATED=$?
setup_env

echo ""
print_info "Step 2: Installing dependencies..."
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    $PKG_INSTALL
    print_status "Dependencies installed"
else
    print_status "Dependencies already up to date"
fi

echo ""
print_info "Step 3: Setting up database..."

# Generate Prisma client
print_info "Generating Prisma client..."
npx prisma generate
print_status "Prisma client generated"

# Push database schema
print_info "Pushing database schema..."
npx prisma db push
print_status "Database schema pushed"

# Run seed if needed
echo ""
print_info "Step 4: Checking seed data..."
if [ $DB_CREATED -eq 1 ] || needs_seeding; then
    print_info "Running database seed..."
    $PKG_RUN db:seed
    print_status "Database seeded"
else
    print_status "Database already has seed data"
fi

echo ""
echo "==========================================="
echo -e "  ${GREEN}Setup Complete!${NC}"
echo "==========================================="
echo ""
echo "Demo Credentials:"
echo "  Email:    demo@example.com"
echo "  Password: demo123456"
echo ""
echo "AI Configuration:"
echo "  Provider: OpenRouter"
echo "  Model:    anthropic/claude-3-haiku"
echo ""
echo "Starting development server on port $APP_PORT..."
echo "Access the application at: http://localhost:$APP_PORT"
echo ""
echo "==========================================="
echo ""

# Start the development server
$PKG_RUN dev
