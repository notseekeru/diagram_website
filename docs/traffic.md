# Traffic Simulation

A simple traffic simulation is implemented to test the backend's behavior under load and with invalid requests. This helps identify potential bottlenecks and ensures the API handles unauthorized access correctly.

## Usage

All API endpoints require an API key sent via the `X-API-Key` header.

1. Create a random API key and store it in `backend/.env` as `API_KEY`.
2. The backend compares incoming `X-API-Key` values to the configured key.
3. Requests without a valid key receive `401 Unauthorized`.

## Examples

### Loop at /api/diagrams with invalid key (Status code)

```bash
START=$SECONDS; while [ $((SECONDS - START)) -lt 10 ]; do curl -H "X-API-Key: invalid_key" -s -o /dev/null -w "%{http_code}\n" http://localhost:5050/api/diagrams; sleep 0.5; done
```

### Loop at /api/diagrams with valid key (Status code)

```bash
START=$SECONDS; while [ $((SECONDS - START)) -lt 10 ]; do curl -H "X-API-Key: zxczxc" -s -o /dev/null -w "%{http_code}\n" http://localhost:5050/api/diagrams; sleep 0.5; done
```

## Recommendations

Use tools like `locust` or `ab` for more comprehensive load testing. These tools can simulate multiple concurrent users and provide detailed performance metrics.
