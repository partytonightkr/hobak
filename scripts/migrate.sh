#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Commune Social App - Database Migration Script
# =============================================================================
# Usage:
#   ./scripts/migrate.sh                 Run pending migrations
#   ./scripts/migrate.sh create <name>   Create a new migration
#   ./scripts/migrate.sh reset           Reset database (WARNING: destroys data)
#   ./scripts/migrate.sh seed             Seed the database
#   ./scripts/migrate.sh status          Show migration status
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SERVER_DIR="$PROJECT_ROOT/server"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Load env file if it exists
if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  log_error "DATABASE_URL is not set. Please create a .env file or set the variable."
  exit 1
fi

cd "$PROJECT_ROOT"

SCHEMA="prisma/schema.prisma"
COMMAND="${1:-deploy}"

case "$COMMAND" in
  deploy|"")
    log_info "Running pending migrations..."
    npx prisma migrate deploy --schema="$SCHEMA"
    log_info "Migrations applied successfully."
    ;;

  create)
    NAME="${2:-}"
    if [ -z "$NAME" ]; then
      log_error "Migration name is required: ./scripts/migrate.sh create <name>"
      exit 1
    fi
    log_info "Creating migration: $NAME"
    npx prisma migrate dev --name "$NAME" --schema="$SCHEMA"
    ;;

  reset)
    log_warn "This will DESTROY all data in the database!"
    read -r -p "Are you sure? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
      log_info "Aborted."
      exit 0
    fi
    log_info "Resetting database..."
    npx prisma migrate reset --force --schema="$SCHEMA"
    log_info "Database reset complete."
    ;;

  seed)
    log_info "Seeding database..."
    cd "$SERVER_DIR"
    npx prisma db seed
    log_info "Seeding complete."
    ;;

  status)
    log_info "Migration status:"
    npx prisma migrate status --schema="$SCHEMA"
    ;;

  *)
    log_error "Unknown command: $COMMAND"
    echo "Usage: ./scripts/migrate.sh [deploy|create <name>|reset|seed|status]"
    exit 1
    ;;
esac
