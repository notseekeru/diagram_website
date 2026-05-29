#!/usr/bin/env bash

# Exit immediately if a command fails, or if an uninitialized variable is used
set -euo pipefail

# Configuration
TARGET_URL="http://localhost:5000/api/diagrams"
API_KEY="zxczxc"
CONTAINER_NAME="diagram_postgres"
DURATION_SEC=30

# Initialize state variables
TRAFFIC_PID=""

# Define cleanup function to ensure recovery even if the script crashes or is interrupted
cleanup() {
    echo -e "\n--- [CLEANUP] Initiating recovery procedures... ---"
    
    # 1. Kill the traffic generator if it is running
    if [ -n "${TRAFFIC_PID}" ] && kill -0 "${TRAFFIC_PID}" 2>/dev/null; then
        echo "Stopping traffic generator (PID: ${TRAFFIC_PID})..."
        kill "${TRAFFIC_PID}"
    fi

    # 2. Restart the database container if it is stopped
    if [ "$(docker inspect -f '{{.State.Running}}' "${CONTAINER_NAME}" 2>/dev/null)" = "false" ]; then
        echo "Restarting database container..."
        docker start "${CONTAINER_NAME}" > /dev/null
    fi
    
    echo "--- [CLEANUP] Done. ---"
}

# Bind cleanup to EXIT, INT (Ctrl+C), and TERM signals
trap cleanup EXIT INT TERM

echo "--- Starting Traffic Generator ---"

# Traffic loop with explicit timeout and status formatting
generate_traffic() {
    local start_time=$SECONDS
    while [ $((SECONDS - start_time)) -lt $((DURATION_SEC * 2)) ]; do
        local timestamp
        timestamp=$(date +"%Y-%m-%d %H:%M:%S")
        
        # Capture raw HTTP code cleanly
        local code
        code=$(curl -H "X-API-Key: ${API_KEY}" -s -o /dev/null -w "%{http_code}" --max-time 2 "${TARGET_URL}" || echo "TIMEOUT")
        
        # Format the visual output cleanly
        if [ "${code}" = "000" ] || [ "${code}" = "TIMEOUT" ]; then
            echo "[${timestamp}] HTTP Status: ❌ ERR/TIMEOUT"
        elif [ "${code}" = "500" ]; then
            echo "[${timestamp}] HTTP Status: 🔥 500 INTERNAL SERVER ERROR"
        else
            echo "[${timestamp}] HTTP Status: ✅ ${code}"
        fi
        
        sleep 0.5
    done
}

generate_traffic &
TRAFFIC_PID=$!
echo "--- Traffic Started (PID: ${TRAFFIC_PID}) ---"

echo "--- Waiting ${DURATION_SEC} seconds for baseline... ---"
sleep "${DURATION_SEC}"

# Verify container is actually running before attempting to kill it
if [ "$(docker inspect -f '{{.State.Running}}' "${CONTAINER_NAME}" 2>/dev/null)" != "true" ]; then
    echo "Error: Target container '${CONTAINER_NAME}' is not currently running." >&2
    exit 1
fi

echo "--- INDUCING FAILURE (STOPPING DB) ---"
docker stop "${CONTAINER_NAME}" > /dev/null

echo "--- Monitoring System Behavior for ${DURATION_SEC} seconds... ---"
sleep "${DURATION_SEC}"

echo "--- Experiment complete. Triggering recovery via exit trap. ---"
