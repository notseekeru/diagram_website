# API Authentication

## Header

All API endpoints require an API key sent via the `X-API-Key` header.

## How it works

1. Create a random API key and store it in `backend/.env` as `API_KEY`.
2. The backend compares incoming `X-API-Key` values to the configured key.
3. Requests without a valid key receive `401 Unauthorized`.

## Examples

### Save a diagram

```bash
curl -X POST http://localhost:3100/api/save-diagram \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_KEY_HERE" \
  -d '{"title":"Sample","mermaidText":"flowchart TB\nA-->B"}'
```

### List diagrams

```bash
curl http://localhost:3100/api/diagrams \
  -H "X-API-Key: YOUR_KEY_HERE"
```

### Fetch a diagram

```bash
curl http://localhost:3100/api/get-diagram/DIAGRAM_ID \
  -H "X-API-Key: YOUR_KEY_HERE"
```

### Update a diagram

```bash
curl -X PUT http://localhost:3100/api/diagrams/DIAGRAM_ID \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_KEY_HERE" \
  -d '{"title":"Updated","mermaidText":"flowchart TB\nA-->B"}'
```

### Delete a diagram

```bash
curl -X DELETE http://localhost:3100/api/diagrams/DIAGRAM_ID \
  -H "X-API-Key: YOUR_KEY_HERE"
```
