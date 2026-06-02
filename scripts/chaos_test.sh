#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="diagram_postgres"
ALERTMANAGER_WEBHOOK_URL="http://localhost:9093/api/v1/alerts"
TARGET_URL="http://localhost:5000/diagrams"

# Record start time with nanosecond precision (Linux)
inject_time=$(date +%s%N)

# Stop the container
docker stop "$CONTAINER_NAME"

# === MTTD starts here ===
# Wait for Alertmanager to fire (simulate by checking a metric? Or just measure until Prometheus shows error?)
# For a lab, you can cheat: poll your backend until you see 500 errors.
first_error_time=0
while true; do
    code=$(curl -H "X-API-Key: $API_KEY" -s -o /dev/null -w "%{http_code}" --max-time 2 "$TARGET_URL")
    if [[ "$code" == "500" ]]; then
        first_error_time=$(date +%s%N)
        break
    fi
    sleep 0.2
done
mttd_ns=$((first_error_time - inject_time))
mttd_ms=$((mttd_ns / 1000000))
echo "MTTD: ${mttd_ms} ms"

# === MTTR starts here ===
# Automatically restart (this is the repair action)
repair_start_time=$(date +%s%N)
docker start "$CONTAINER_NAME"

# Wait for first successful request
while true; do
    code=$(curl -H "X-API-Key: $API_KEY" -s -o /dev/null -w "%{http_code}" --max-time 2 "$TARGET_URL")
    if [[ "$code" == "200" ]]; then
        recovery_time=$(date +%s%N)
        break
    fi
    sleep 0.2
done
mttr_ns=$((recovery_time - repair_start_time))
mttr_ms=$((mttr_ns / 1000000))
echo "MTTR (repair only): ${mttr_ms} ms"

# Total outage = time from injection to first 200
total_outage_ms=$(((recovery_time - inject_time) / 1000000))
echo "Total outage: ${total_outage_ms} ms"