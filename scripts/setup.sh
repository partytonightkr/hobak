#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Commune Social App - Development Setup Script
# =============================================================================
# Usage: ./scripts/setup.sh
# This script sets up the entire development environment.
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_command() {
  if ! command -v "$1" &> /dev/null; then
    log_error "$1 is required but not installed."
    exit 1
  fi
}

# --- Pre-flight checks ---
log_info "Checking prerequisites..."
check_command node
check_command npm
check_command docker
check_command docker

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  log_error "Node.js 18+ is required (found v$(node -v))"
  exit 1
fi
log_info "Node.js $(node -v) detected"

if ! docker info &> /dev/null; then
  log_error "Docker daemon is not running. Please start Docker and try again."
  exit 1
fi
log_info "Docker is running"

# --- Environment file ---
cd "$PROJECT_ROOT"
if [ ! -f .env ]; then
  log_info "Creating .env from .env.example..."
  cp .env.example .env
  log_warn "Please review .env and update secrets before running the app."
else
  log_info ".env already exists, skipping."
fi

# --- Start infrastructure services ---
log_info "Starting PostgreSQL and Redis via Docker Compose..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis

# Wait for PostgreSQL to be ready
log_info "Waiting for PostgreSQL to be ready..."
for i in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U commune &> /dev/null; then
    log_info "PostgreSQL is ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    log_error "PostgreSQL failed to start within 30 seconds."
    exit 1
  fi
  sleep 1
done

# Wait for Redis to be ready
log_info "Waiting for Redis to be ready..."
for i in $(seq 1 30); do
  if docker compose exec -T redis redis-cli ping &> /dev/null; then
    log_info "Redis is ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    log_error "Redis failed to start within 30 seconds."
    exit 1
  fi
  sleep 1
done

# --- Install dependencies ---
log_info "Installing server dependencies..."
cd "$PROJECT_ROOT/server"
npm install

log_info "Installing client dependencies..."
cd "$PROJECT_ROOT/client"
npm install

# --- Database setup ---
cd "$PROJECT_ROOT"

log_info "Generating Prisma client..."
npx prisma generate --schema=prisma/schema.prisma

log_info "Running database migrations..."
npx prisma migrate dev --name init --schema=prisma/schema.prisma 2>/dev/null || npx prisma migrate deploy --schema=prisma/schema.prisma

log_info "Seeding database..."
cd "$PROJECT_ROOT/server"
npx prisma db seed 2>/dev/null || log_warn "No seed script found, skipping."

# --- Done ---
echo ""
log_info "============================================"
log_info "  Development environment is ready!"
log_info "============================================"
echo ""
echo "  Start the dev servers:"
echo ""
echo "    # Option 1: Docker (full stack)"
echo "    docker compose -f docker-compose.yml -f docker-compose.dev.yml up"
echo ""
echo "    # Option 2: Local processes"
echo "    cd server && npm run dev    # Backend at http://localhost:4000"
echo "    cd client && npm run dev    # Frontend at http://localhost:3000"
echo ""
