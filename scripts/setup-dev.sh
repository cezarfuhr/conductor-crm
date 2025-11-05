#!/bin/bash

# Conductor CRM - Development Environment Setup Script
# This script sets up the development environment for first-time contributors

set -e

echo "🚀 Conductor CRM - Development Setup"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env file. Please edit it with your actual API keys.${NC}"
    echo ""
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker and Docker Compose are installed${NC}"
echo ""

# Initialize git submodules (Conductor core)
echo "📦 Initializing git submodules..."
if [ -d "conductor/.git" ]; then
    echo -e "${YELLOW}⚠️  Conductor submodule already initialized${NC}"
else
    git submodule init
    git submodule update
    echo -e "${GREEN}✅ Conductor submodule initialized${NC}"
fi
echo ""

# Backend setup
echo "🐍 Setting up Python backend..."
cd src/backend

if [ ! -f "requirements.txt" ]; then
    echo -e "${YELLOW}⚠️  requirements.txt not found yet. Will be created in next steps.${NC}"
else
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}❌ Python 3 is not installed${NC}"
        exit 1
    fi

    # Check Python version
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
    echo "Python version: $PYTHON_VERSION"

    if [ ! -d "venv" ]; then
        echo "Creating Python virtual environment..."
        python3 -m venv venv
        echo -e "${GREEN}✅ Virtual environment created${NC}"
    fi

    echo "Activating virtual environment and installing dependencies..."
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    echo -e "${GREEN}✅ Python dependencies installed${NC}"
fi

cd ../..
echo ""

# Frontend setup
echo "⚛️  Setting up Angular frontend..."
cd src/frontend

if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}⚠️  package.json not found yet. Will be created in next steps.${NC}"
else
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        exit 1
    fi

    # Check Node version
    NODE_VERSION=$(node --version)
    echo "Node.js version: $NODE_VERSION"

    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm is not installed${NC}"
        exit 1
    fi

    echo "Installing npm dependencies..."
    npm install
    echo -e "${GREEN}✅ npm dependencies installed${NC}"
fi

cd ../..
echo ""

# Start Docker services
echo "🐳 Starting Docker services (MongoDB, Redis)..."
docker compose -f docker-compose.dev.yml up -d mongodb redis

echo -e "${GREEN}✅ Docker services started${NC}"
echo ""

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check MongoDB
if docker compose -f docker-compose.dev.yml exec -T mongodb mongosh --eval "db.runCommand({ ping: 1 })" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ MongoDB is ready${NC}"
else
    echo -e "${RED}❌ MongoDB failed to start${NC}"
fi

# Check Redis
if docker compose -f docker-compose.dev.yml exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis is ready${NC}"
else
    echo -e "${RED}❌ Redis failed to start${NC}"
fi

echo ""
echo "======================================"
echo -e "${GREEN}✅ Development environment setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your API keys"
echo "2. Start backend: cd src/backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo "3. Start frontend: cd src/frontend && npm start"
echo "4. Access application at http://localhost:4200"
echo ""
echo "Useful commands:"
echo "  - View logs: docker compose -f docker-compose.dev.yml logs -f"
echo "  - Stop services: docker compose -f docker-compose.dev.yml down"
echo "  - Restart services: docker compose -f docker-compose.dev.yml restart"
echo ""
