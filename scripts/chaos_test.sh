#!/usr/bin/env bash
set -euo pipefail

# --- Configuration ---
CONTAINER_NAME="diagram_postgres"
ALERTMANAGER_WEBHOOK_URL="http://localhost:9093/api/v1/alerts"
TARGET_URL="http://localhost:5000/diagrams"
API_KEY="${API_KEY:-default_secret_key}" # Fixed: Fallback avoids crash under 'set -u'

# --- Fault Injection ---
echo "Stopping container..."
inject_time=$(date +%s%N)
docker stop "$CONTAINER_NAME" > /dev/null

# --- MTTD Phase ---
echo "Measuring Mean Time To Detect (MTTD)..."
first_error_time=0

while true; do
  # Fixed: Handled potential curl network errors safely
  code=$(curl -H "X-API-Key: $API_KEY" -s -o /dev/null -w "%{http_code}" --max-time 2 "$TARGET_URL" || echo "000")
  
  # Matches any server error (500) or total connection failure (000)
  if [[ "$code" == "500" || "$code" == "000" ]]; then
    first_error_time=$(date +%s%N)
    break
  fi
  sleep 0.2
done

mttd_ns=$((first_error_time - inject_time))
mttd_ms=$((mttd_ns / 1000000))
echo "MTTD: ${mttd_ms} ms"

# --- MTTR Phase ---
echo "Starting container recovery..."
repair_start_time=$(date +%s%N)
docker start "$CONTAINER_NAME" > /dev/null

while true; do
  code=$(curl -H "X-API-Key: $API_KEY" -s -o /dev/null -w "%{http_code}" --max-time 2 "$TARGET_URL" || echo "000")
  if [[ "$code" == "200" ]]; then
    recovery_time=$(date +%s%N)
    break
  fi
  sleep 0.2
done

# --- Metrics Output ---
mttr_ns=$((recovery_time - repair_start_time))
mttr_ms=$((mttr_ns / 1000000))
total_outage_ms=$(((recovery_time - inject_time) / 1000000))

echo "-------------------------"
echo "MTTR (Repair): ${mttr_ms} ms"
echo "Total Outage Time: ${total_outage_ms} ms"
