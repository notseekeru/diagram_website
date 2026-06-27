# Diagram Website

[![CI](https://github.com/notseekeru/diagram_website/actions/workflows/ci-pipeline.yml/badge.svg)](https://github.com/notseekeru/diagram_website/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Mermaid diagram editor with autosave, ELK layout, PostgreSQL persistence, and full OpenTelemetry observability stack.

## Stack

| Layer | Stack |
|---|---|
| **Frontend** | React 19, Mermaid.js 11, Axios, Tailwind, Vite 8, TypeScript 6 |
| **Backend** | Express 5, pg (PostgreSQL), helmet, cors, express-rate-limit |
| **Database** | PostgreSQL 16 (containerized) |
| **Infra** | Docker Compose (dev + prod), nginx (prod) |
| **Observability** | OpenTelemetry, Grafana, Prometheus, Loki, Tempo, Alloy, Alertmanager |

## Project Structure

```text
├── frontend/          React SPA (Vite build → nginx in prod)
│   ├── src/
│   │   ├── App.tsx          main app with autosave logic
│   │   ├── components/      EditorPanel, PreviewPanel, RecentBar
│   │   └── types.ts
│   ├── nginx.conf           prod: reverse proxies /api/ → backend
│   └── Dockerfile           multi-stage: dev (Vite) + prod (nginx)
├── backend/           Express API server
│   ├── src/server.ts        routes, CORS, rate limit, shutdown
│   ├── migrations/          Postgres schema (001_create_diagrams)
│   └── Dockerfile           multi-stage: dev (tsx watch) + prod (compiled)
├── lgtm/              Observability stack (Grafana / Loki / Tempo / Alloy / Prometheus / Alertmanager)
├── compose.dev.yml    Dev environment
├── compose.prod.yml   Production environment
├── compose.yml        Shared services (postgres)
├── scripts/           Chaos engineering (locust, fault injection)
└── docs/              Auth, chaos, SLO docs
```

## Quick Start

```bash
# 1. Copy env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp lgtm/.env.example lgtm/.env    # if using observability

# 2. Start dev stack
make dev-up

# 3. Run migrations
docker exec -t diagram_backend_dev npm run migrate:up

# 4. Open http://localhost:5223
```

Set `API_KEY` and `DATABASE_URL` in `backend/.env` and `VITE_BACKEND_URL=http://localhost:5050` in `frontend/.env` for local dev.

## API

All endpoints require `X-API-Key` header. See [docs/api-auth.md](docs/api-auth.md).

| Method | Path | Action |
|---|---|---|
| `POST` | `/api/save-diagram` | Create diagram |
| `PUT` | `/api/diagrams/:id` | Update diagram |
| `GET` | `/api/diagrams` | List diagrams (paginated) |
| `GET` | `/api/get-diagram/:id` | Get one diagram |
| `DELETE` | `/api/diagrams/:id` | Delete diagram |
| `GET` | `/healthz` | Health check |

## Production

Frontend and backend share a Docker network. Nginx serves the SPA and proxies `/api/` → backend container.

```bash
docker compose -f compose.prod.yml build
docker compose -f compose.prod.yml up -d
docker exec diagram_backend_prod npm run migrate:up
```

Set `VITE_BACKEND_URL=` (empty) in `frontend/.env` for same-origin API calls in prod. See the `.env.example` files for rationale.

## Chaos Engineering

See [docs/chaos.md](docs/chaos.md). Experiments in `scripts/`, run with `make chaos-run`.
