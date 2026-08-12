# Diagram Website

[![CI](https://github.com/notseekeru/diagram_website/actions/workflows/ci-pipeline.yml/badge.svg)](https://github.com/notseekeru/diagram_website/actions)
[![CD](https://github.com/notseekeru/diagram_website/actions/workflows/cd-pipeline.yml/badge.svg)](https://github.com/notseekeru/diagram_website/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Mermaid diagram editor with autosave, ELK layout, PostgreSQL persistence, and full OpenTelemetry observability stack.

**Live:** https://diagram.seekeru.tech

## Features

- **Mermaid.js diagram editor** with live preview and ELK layout engine (`@mermaid-js/layout-elk`)
- **Autosave** to PostgreSQL with a recent-diagrams bar (`RecentBar`)
- **REST API** with API-key auth, UUID validation, and rate limiting
- **Full observability** — traces, logs, metrics, and alerting (Grafana / Loki / Tempo / Prometheus / Alloy / Alertmanager)
- **Chaos & security tooling** — fault injection, load testing (Locust), API pentest script

## Stack

| Layer             | Stack                                                                |
| ----------------- | -------------------------------------------------------------------- |
| **Frontend**      | React 19, Mermaid.js 11, Axios, Tailwind, Vite 8, TypeScript 7       |
| **Backend**       | Express 5, pg (PostgreSQL), cors, express-rate-limit                 |
| **Database**      | PostgreSQL 16 (containerized)                                        |
| **Infra**         | Docker Compose (dev + prod), nginx (prod)                            |
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
├── scripts/           Chaos engineering (locust, fault injection, API pentest)
│   ├── chaos_test.sh
│   ├── chaos_test.py
│   ├── locust.py
│   ├── api-pentest.sh
│   └── port-claimer.sh
├── Makefile            Dev/prod/chaos/lgtm targets
└── docs/              Auth, chaos, SLO, pentest, traffic docs
    ├── api-auth.md
    ├── api-pentest.md
    ├── chaos-*.md
    ├── slo.md
    └── traffic.md
```

## Quick Start

```bash
# 1. Copy env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp lgtm/.env.example lgtm/.env    # if using observability

# 2. Start dev stack
make up

# 3. Open http://localhost:5273

> Migrations run automatically on backend startup. If they fail, run manually:
> `docker exec -t diagram_backend_dev npm run migrate:up`
```

The `.env.example` files ship with sane defaults — for local dev the only required change is a real `API_KEY` in `backend/.env`. The frontend uses `VITE_BACKEND_URL`; leave it empty for same-origin API calls (default in `.env.example`). See [Environment Variables](#environment-variables).

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `API_KEY` | *(required)* | Shared secret validated via `X-API-Key` header |
| `DATABASE_URL` | `postgres://diagram:diagram@postgres:5432/diagramdb` | Postgres connection string |
| `PORT` | `3100` | HTTP port |
| `NODE_ENV` | `chaos` | `chaos` disables rate limiting (chaos tests) |
| `TRUST_PROXY_HOPS` | `0` | Proxy hops for `trust proxy` |
| `FRONTEND_ORIGINS` | `http://localhost:5273,https://diagram.seekeru.tech` | CORS origins |
| `OTEL_*` | *see `.env.example`* | OpenTelemetry exporter config |

### Frontend (`frontend/.env`)

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `VITE_BACKEND_URL` | *(empty)* | API base URL; empty = same-origin (`/api`) |
| `DEVELOPMENT_BACKEND_URL` | `http://diagram_backend_dev:3100` | Reserved for dev proxies (`docker exec` context) |

### lgtm (`lgtm/.env`)

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `GRAFANA_PASSWORD` | `grafana` | Grafana admin password |
| `HOSTNAME` | `seeker` | Host identity for labels |
| `ALERTMANAGER_SLACK_WEBHOOK` | *(empty)* | Slack alert notifications |

## API

All endpoints require `X-API-Key` header. See [docs/api-auth.md](docs/api-auth.md).

| Method   | Path                   | Action                    |
| -------- | ---------------------- | ------------------------- |
| `POST`   | `/api/save-diagram`    | Create diagram            |
| `PUT`    | `/api/diagrams/:id`    | Update diagram            |
| `GET`    | `/api/diagrams`        | List diagrams (paginated) |
| `GET`    | `/api/get-diagram/:id` | Get one diagram           |
| `DELETE` | `/api/diagrams/:id`    | Delete diagram            |
| `GET`    | `/healthz`             | Health check              |

## Production

Frontend and backend share a Docker network. Nginx serves the SPA and proxies `/api/` → backend container. Migrations run on startup.

```bash
docker compose -f compose.prod.yml build
docker compose -f compose.prod.yml up -d
```

For DigitalOcean managed DBs, grant schema permissions before the first migration:
```bash
make prod-migrate-up DB_URL='postgresql://user:pass@host:25060/db?sslmode=require'
```

Set `VITE_BACKEND_URL=` (empty) in `frontend/.env` for same-origin API calls in prod. See the `.env.example` files for rationale.

Deploying to a non-DigitalOcean host, or want the CI/CD pipeline? See `.github/workflows/` — CI runs lint/typecheck/audit, CD builds and ships the production images.

## Development & Testing

```bash
make lint          # biome lint (frontend + backend)
make exec          # full self-check: lint + typecheck + audit + prune
make check-ports   # verify 3100/5273/5432 are free
```

Chaos / load / security tooling ships in `scripts/`:

```bash
make chaos-sh   # shell-based fault injection & robustness tests
make chaos-py   # Python-based chaos tests
make locust     # interactive Locust load test (UI on :8089)
make locust-csv # headless 5-min load test → results.csv
```

## License

MIT — see [LICENSE](LICENSE).

## Troubleshooting

### Backend returns 500 — "relation \"diagrams\" does not exist"

The table hasn't been created. Migrations run on backend startup — check startup logs for errors. If they didn't run, apply manually:

```bash
docker exec diagram_backend_dev npm run migrate:up
```

### Migration fails — "permission denied for schema public"

PostgreSQL 15+ requires explicit schema grants. Use the Makefile helper:

```bash
make prod-migrate-up DB_URL='postgresql://user:pass@host:25060/db?sslmode=require'
```

Or manually as superuser:

```sql
GRANT ALL ON SCHEMA public TO diagram;
ALTER SCHEMA public OWNER TO diagram;
```

## Chaos Engineering & Security Testing

See [docs/chaos.md](docs/chaos.md) and [docs/api-pentest.md](docs/api-pentest.md).

```bash
make chaos-sh       # Shell-based chaos tests
make chaos-py       # Python chaos tests
make locust         # Locust load testing
```
