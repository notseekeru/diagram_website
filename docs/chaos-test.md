# Chaos Engineering

## Header

All API endpoints require an API key sent via the `X-API-Key` header.

## How it works

1. Create a random API key and store it in `backend/.env` as `API_KEY`.
2. The backend compares incoming `X-API-Key` values to the configured key.
3. Requests without a valid key receive `401 Unauthorized`.

## Examples

### Stop the backend container to simulate a complete outage:

```bash
docker stop diagram_backend
```

### Stop the database container to simulate a database outage:

```bash
docker stop diagram_postgres
```

### Loop at /api/diagrams with invalid key (Status code)

```bash
while true; do curl -H "X-API-Key: invalid_key" -s -o /dev/null -w "%{http_code}\n" http://localhost:5000/api/diagrams; sleep 0.5; done
```

### Loop at /api/diagrams with valid key (Status code)

```bash
while true; do curl -H "X-API-Key: zxczxc" -s -o /dev/null -w "%{http_code}\n" http://localhost:5000/api/diagrams; sleep 0.5; done
```
