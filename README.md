# Commune

A social and community platform for sharing content, connecting with people, and building communities around shared interests.

## Tech Stack

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS, Zustand
- **Backend:** Node.js, Express.js, TypeScript, Socket.io
- **Database:** PostgreSQL 16 with Prisma ORM
- **Cache:** Redis 7
- **Auth:** JWT (access + refresh tokens), OAuth (Google, GitHub)
- **Payments:** Stripe subscriptions
- **Deployment:** Docker, GitHub Actions CI/CD

## Project Structure

```
social-app/
├── client/              # Next.js frontend
│   ├── src/
│   │   ├── app/         # Pages (App Router)
│   │   ├── components/  # React components
│   │   ├── hooks/       # Custom hooks
│   │   ├── lib/         # API client, utilities
│   │   └── store/       # Zustand state stores
│   └── Dockerfile
├── server/              # Express.js backend
│   ├── src/
│   │   ├── config/      # Environment, Prisma client
│   │   ├── middleware/   # Auth, validation, rate limiting
│   │   ├── routes/      # API route handlers
│   │   ├── services/    # Business logic
│   │   └── health.ts    # Health check endpoints
│   └── Dockerfile
├── prisma/              # Database schema and migrations
│   └── schema.prisma
├── shared/              # Shared TypeScript types
├── scripts/             # Dev setup and migration scripts
├── design/              # UI mockups and design tokens
├── docs/                # Project documentation
├── docker-compose.yml   # Production Docker stack
└── docker-compose.dev.yml  # Development overrides
```

## Quick Start

### Prerequisites

- Node.js 20+
- Docker and Docker Compose

### Setup

```bash
# Clone the repository
git clone <repo-url> social-app
cd social-app

# Run the setup script (installs deps, starts DB, runs migrations)
./scripts/setup.sh
```

### Development

```bash
# Option A: Docker (full stack with hot reload)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Option B: Local (DB in Docker, apps running natively)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis
cd server && npm run dev &
cd client && npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- API Health: http://localhost:4000/api/v1/health

### Database Migrations

```bash
./scripts/migrate.sh              # Run pending migrations
./scripts/migrate.sh create name  # Create a new migration
./scripts/migrate.sh status       # Check migration status
```

## Environment Variables

Copy `.env.example` to `.env` and configure the values. See the file for documentation on each variable.

```bash
cp .env.example .env
```

## Documentation

- [Product Requirements (PRD)](docs/PRD.md)
- [Tech Stack Decisions](docs/TECH_STACK.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

## Scripts

| Script | Description |
|--------|-------------|
| `scripts/setup.sh` | One-command development environment setup |
| `scripts/migrate.sh` | Database migration management (deploy, create, reset, seed, status) |

## License

Private. All rights reserved.
