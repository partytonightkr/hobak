# Deployment Guide

## Prerequisites

- Node.js 20+
- Docker and Docker Compose
- PostgreSQL 16+ (or use Docker)
- Redis 7+ (or use Docker)

## Quick Start (Development)

```bash
# One-command setup
./scripts/setup.sh
```

This script will:
1. Check prerequisites (Node.js, Docker)
2. Copy `.env.example` to `.env`
3. Start PostgreSQL and Redis containers
4. Install npm dependencies for server and client
5. Run database migrations and seed data

Then start the development servers:

```bash
# Option A: Run everything in Docker with hot reload
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Option B: Run locally (PostgreSQL + Redis still in Docker)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis
cd server && npm run dev &
cd client && npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- API Health: http://localhost:4000/api/v1/health

## Environment Variables

Copy `.env.example` to `.env` and configure all variables. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `JWT_SECRET` | Yes | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Yes | Secret for signing refresh tokens |
| `STRIPE_SECRET_KEY` | For payments | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | For payments | Stripe webhook signing secret |
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL (build-time for client) |
| `NEXT_PUBLIC_WS_URL` | Yes | WebSocket URL (build-time for client) |

See `.env.example` for the complete list with descriptions.

## Database Migrations

```bash
# Run pending migrations
./scripts/migrate.sh

# Create a new migration
./scripts/migrate.sh create add_new_table

# Reset database (destroys data)
./scripts/migrate.sh reset

# Seed database
./scripts/migrate.sh seed

# Check migration status
./scripts/migrate.sh status
```

## Docker

### Build Images

```bash
# Build both services
docker compose build

# Build individually
docker build -t commune-server ./server
docker build -t commune-client ./client \
  --build-arg NEXT_PUBLIC_API_URL=https://api.commune.app/api/v1 \
  --build-arg NEXT_PUBLIC_WS_URL=https://api.commune.app
```

### Run Production Stack

```bash
docker compose up -d
```

This starts:
- **postgres** - PostgreSQL 16 database
- **redis** - Redis 7 cache
- **server** - Backend API on port 4000
- **client** - Next.js frontend on port 3000

### Health Checks

All services include Docker health checks. Check status with:

```bash
docker compose ps
```

The backend exposes three health endpoints:
- `GET /api/v1/health` - Full health status with dependency checks
- `GET /api/v1/health/live` - Liveness probe (always returns 200 if process is running)
- `GET /api/v1/health/ready` - Readiness probe (checks database and Redis)

## CI/CD Pipeline

### Pull Request (ci.yml)

Triggered on PRs to `main` and `develop`. Runs:

1. **Lint & Type Check** - ESLint + TypeScript for both client and server
2. **Server Tests** - Jest tests with PostgreSQL and Redis service containers
3. **Client Tests** - Jest + React Testing Library tests
4. **Build** - Verifies both packages build successfully
5. **Docker Build Test** - Verifies Docker images build

### Deploy (deploy.yml)

Triggered on push to `main`. Steps:

1. **Pre-deploy Tests** - Runs the full CI pipeline
2. **Build & Push Images** - Builds Docker images, pushes to GitHub Container Registry
3. **Migrate** - Runs database migrations against production
4. **Deploy** - SSH into production server, pulls new images, restarts services
5. **Health Check** - Verifies the deployment is healthy

### Required Secrets

Configure these in GitHub repository settings:

| Secret | Description |
|--------|-------------|
| `DATABASE_URL` | Production database URL |
| `DEPLOY_HOST` | Production server hostname |
| `DEPLOY_USER` | SSH username |
| `DEPLOY_SSH_KEY` | SSH private key |
| `SERVER_URL` | Production server URL |
| `NEXT_PUBLIC_API_URL` | Production API URL |
| `NEXT_PUBLIC_WS_URL` | Production WebSocket URL |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

## Production Deployment

### Server Setup

1. Install Docker and Docker Compose on the production server
2. Clone the repository to `/opt/commune`
3. Create `/opt/commune/.env` with production values
4. Run the initial deployment:

```bash
cd /opt/commune
docker compose up -d
docker compose exec server npx prisma migrate deploy
docker compose exec server npx prisma db seed
```

### Reverse Proxy (Nginx)

For production, put Nginx in front of the services:

```nginx
upstream client {
    server 127.0.0.1:3000;
}

upstream server {
    server 127.0.0.1:4000;
}

server {
    listen 443 ssl http2;
    server_name commune.app;

    ssl_certificate /etc/letsencrypt/live/commune.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/commune.app/privkey.pem;

    location / {
        proxy_pass http://client;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://server;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://server;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Monitoring

- Check service health: `curl https://api.commune.app/api/v1/health`
- View logs: `docker compose logs -f [service]`
- Resource usage: `docker stats`

### Backups

Database backups:

```bash
# Create backup
docker compose exec postgres pg_dump -U commune commune > backup_$(date +%Y%m%d).sql

# Restore backup
docker compose exec -T postgres psql -U commune commune < backup_20260219.sql
```

### Scaling

For horizontal scaling, consider:
- Load balancer in front of multiple server instances
- Read replicas for PostgreSQL
- Redis Cluster for caching
- S3-compatible storage for file uploads (replace local filesystem)
- CDN for static assets
