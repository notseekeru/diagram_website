## Current Status

- MMTD: 2 minutes

### SLI (Service Level Indicator):

- http_server_duration_seconds (the total time taken for an API request).
  - Emitted by the backend histogram with labels: http.route, http.method, http.status_code

### SLO (Service Level Objective):

- Target: 99.5% of all POST `/api/save-diagram` requests must complete in under `200ms`. Measurement Window: Rolling `30 days`

### Error Budget:

- If 0.5% of your requests are > 200ms (or fail), you have "spent" your budget.
- Policy: If the error budget is exhausted, you stop feature development and spend the next sprint purely on performance/reliability optimization.
