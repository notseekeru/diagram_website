## Chaos Experiment 001: Postgres Database Docker Stop

### Baseline Metrics

All done within a lab experiment with only 1 user (me) sending requests to the backend, so the traffic is very low and the error budget is not really relevant here. The main focus is on observing the behavior of the system under the specific failure mode of a database outage.

- Date: May 29, 2026
- Failure mode: Postgres database docker stop
- MTTD: 3 seconds
- MTTR: 3 seconds
- Observability Propagation Latency: 40 seconds
- Result: Once the Postgres container is stopped, all API requests to the backend fail with a `500 Internal Server Error` due to the inability to connect to the database. The backend logs show connection errors indicating that the database is unreachable. Once the Postgres container is restarted, the backend recovers and starts serving requests successfully again within 3 seconds and propagates to grafana in 40 seconds.

## Metrics Observed During the Experiment

### Metrics when the Postgres container is stopped:

- Server Latency: Significant spike increase in latency for all API requests, with many requests timing out or failing.
- Server Traffic: Steady increase in traffic as clients continue to send requests, but all requests fail due to the database outage.
- Server Status Code: 500 Internal Server Error Increase
- Server Saturation: Steady Increase
- Server Error 400/500: Hovering around 0.1 - 0.3, not 0.
- Database Saturation: Sharp Steady 0% saturation as the database becomes unresponsive.
- Database Latency: Significant spike decrease in latency as the database becomes unresponsive.
- Database Traffic: Steady increase in traffic as clients continue to send requests, but all requests fail due to the database outage.

### Metrics when the Postgres container is restarted:

- Server Latency: Sharp decrease in latency as the backend recovers and starts serving requests successfully again.
- Server Traffic: Sharp decrease in traffic as clients receive successful responses and stop retrying.
- Server Status Code: Sharp decrease in 500 Internal Server Errors as the backend recovers, with a corresponding increase in 200 OK responses after recovery.
- Server Saturation: Sharp decrease in saturation as the backend recovers.
- Server Error 400/500: Sharp decrease "0" in error rate as the backend recovers, with a corresponding increase in successful responses.
- Database Saturation: Steady 0% in saturation as the database recovers.
- Database Latency: Steady decrease in latency as the database recovers.
- Database Traffic: Sharp increase in traffic as the database recovers.

### Optimized Outcomes Metrics

- MTTD: 1.5 seconds
- MTTR: 1.5 seconds
- Observability Propagation Latency: 15 seconds
- Result: With the optimized configuration, when the Postgres container is stopped, the backend detects the outage and starts returning `500 Internal Server Error` responses within 1.5 seconds, significantly reducing the time it takes for the system to recognize the failure. Once the Postgres container is restarted, the backend recovers and starts serving requests successfully again within 3 seconds and propagates to Grafana in 15 seconds.
