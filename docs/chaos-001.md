## Chaos Experiment 001: Postgres Database Container Failure

### Environment

- Lab setup: Single-user synthetic traffic to backend API
- Database: PostgreSQL running in Docker container
- Failure mode: Container stop (`docker stop postgres`)
- Measurement method: Automated script polling `/api/diagrams` every 100ms

### Baseline Metrics (Before Optimization)

- **Date**: May 29, 2026
- **MTTD** (Mean Time to Detect): 3 seconds – client detects first HTTP 500 error
- **MTTR** (Mean Time to Repair): 60 seconds – includes detection + manual restart + recovery
- **Recovery breakdown**:
  - Detection: 3s
  - Manual restart decision & action: ~50s (human delay in lab)
  - Postgres startup + connection pool recovery: ~7s
- **Observability propagation delay**: 55 seconds (Prometheus scrape + Grafana dashboard refresh)

**System behavior**:

- On container stop: All API requests fail with `500 Internal Server Error` within 3 seconds.
- Backend logs show `connection refused` errors.
- After manual restart, backend recovers in ~7 seconds (database startup + pool reconnection).

### Optimized Metrics (After Fixes)

**Changes made**:

- Hardcoded 30-second retry loop → exponential backoff with configurable retries
- Connection pool health check interval reduced from 30s to 5s
- Automated recovery script (no human delay)

- **MTTD**: 1.5 seconds (client-side polling every 50ms)
- **MTTR**: 2.3 seconds (automated detection + container restart + recovery)
- **Observability propagation delay**: 15 seconds (optimized Prometheus scrape interval to 1s, Grafana live dashboards)

**Result**: Total outage duration reduced from 60s to 2.3s – a **96% improvement**. Backend now tolerates database restarts with minimal application impact.

### Metrics Observed (Optimized Run)

| Metric                 | During Failure (Postgres stopped) | After Recovery (restart)     |
| ---------------------- | --------------------------------- | ---------------------------- |
| Server Latency         | Spike to timeouts                 | Returns to baseline (4–30ms) |
| HTTP 500 rate          | 100% of requests                  | Drops to 0%                  |
| Database Saturation    | 0%                                | Returns to normal            |
| Connection pool errors | `connection refused`              | Re-establishes within 2.3s   |

### Key Takeaway

Automating the repair workflow and fixing the retry logic reduced MTTR from 60s (human-driven) to 2.3s (fully automated), making the system resilient to transient database failures.
