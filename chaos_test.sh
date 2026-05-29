#!/bin/bash
# chaos_test.sh

echo "--- Starting Traffic Generator ---"
# Start traffic in background
while true; do
    curl -s -H "X-API-Key: zxczxc" -o /dev/null -w "%{http_code}\n" http://localhost:5000/api/diagrams > /dev/null 2>&1
    sleep 0.5
done &
TRAFFIC_PID=$!

echo "--- Traffic Started (PID: $TRAFFIC_PID) ---"
echo "--- Waiting 10 seconds for baseline... ---"
sleep 10

echo "--- INDUCING FAILURE (STOPPING DB) ---"
START_TIME=$(date +%s)
docker stop diagram_postgres

echo "--- Watching for errors... (Ctrl+C to stop experiment) ---"
# Monitor loop
while true; do
    # Just watch your Grafana dashboard during this!
    sleep 2
done

# Cleanup on Ctrl+C
trap 'echo "--- RECOVERING ---"; docker start diagram_postgres; kill $TRAFFIC_PID; exit' SIGINT