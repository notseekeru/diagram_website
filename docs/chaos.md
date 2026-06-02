# Chaos Testing

Simple chaos testing can be performed by manually stopping containers to simulate outages and observe how the system responds. This helps identify weaknesses in the architecture and ensures that the application can handle failures gracefully.

## Examples

### Stop the backend container to simulate a complete outage:

```bash
docker stop diagram_backend
```

### Stop the database container to simulate a database outage:

```bash
docker stop diagram_postgres
```

## Recommendations

- Use chaos testing tools like `chaos-mesh` or `litmus` for more controlled and repeatable experiments.
