#!/usr/bin/env python3
import os
import time
import subprocess
import requests
from datetime import datetime
from dotenv import load_dotenv

# Load API key from .env
load_dotenv("backend/.env")
API_KEY = os.getenv("API_KEY")
if not API_KEY:
    print("ERROR: API_KEY not found in backend/.env")
    print("Create backend/.env with: API_KEY=your_random_key")
    exit(1)

# Configuration
API_URL = "http://localhost:5000/api/diagrams"  # Endpoint that hits the database
POSTGRES_CONTAINER = "diagram_postgres"         # Name of your Postgres container
HEADERS = {"X-API-Key": API_KEY}
REQUEST_TIMEOUT = 2  # seconds

def timestamp_ms():
    """Return current time in milliseconds since epoch."""
    return time.time() * 1000

def is_api_healthy():
    """Return True if API returns 200, False otherwise."""
    try:
        resp = requests.get(API_URL, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        return resp.status_code == 200
    except (requests.ConnectionError, requests.Timeout):
        return False

def docker_command(action, container):
    """Run docker start/stop command."""
    subprocess.run(["docker", action, container], check=True, capture_output=True)

def run_experiment():
    print("=== Chaos Experiment: Postgres Failure ===")
    print(f"API endpoint: {API_URL}")
    print(f"Container: {POSTGRES_CONTAINER}")
    print()

    # Step 1: Ensure system is healthy before experiment
    if not is_api_healthy():
        print("WARNING: API is not healthy before experiment. Aborting.")
        return

    # Step 2: Inject failure - stop Postgres
    print(f"[{datetime.now().isoformat()}] Stopping container...")
    t0 = timestamp_ms()
    docker_command("stop", POSTGRES_CONTAINER)

    # Step 3: Measure MTTD (time to first failure)
    print("Measuring MTTD (time to first failed request)...")
    first_failure_time = None
    while first_failure_time is None:
        if not is_api_healthy():
            first_failure_time = timestamp_ms()
            break
        time.sleep(0.05)  # 50ms poll interval

    mttd_ms = first_failure_time - t0
    print(f"✅ MTTD = {mttd_ms:.1f} ms ({mttd_ms/1000:.2f} seconds)")

    # Step 4: Wait a moment then repair (restart Postgres)
    # In a real scenario you might wait for manual intervention. Here we restart immediately.
    print(f"[{datetime.now().isoformat()}] Restarting container...")
    repair_start_time = timestamp_ms()
    docker_command("start", POSTGRES_CONTAINER)

    # Step 5: Measure MTTR (time from failure injection to first successful request after repair)
    print("Measuring MTTR (time to full recovery)...")
    recovery_time = None
    while recovery_time is None:
        if is_api_healthy():
            recovery_time = timestamp_ms()
            break
        time.sleep(0.05)

    mttr_ms = recovery_time - t0
    print(f"✅ MTTR = {mttr_ms:.1f} ms ({mttr_ms/1000:.2f} seconds)")

    # Step 6: Print summary
    print("\n=== Results ===")
    print(f"Failure injection at:   {datetime.fromtimestamp(t0/1000).isoformat()}")
    print(f"First failure at:       {datetime.fromtimestamp(first_failure_time/1000).isoformat()}")
    print(f"Recovery at:            {datetime.fromtimestamp(recovery_time/1000).isoformat()}")
    print(f"MTTD (detection):       {mttd_ms:.1f} ms")
    print(f"MTTR (total outage):    {mttr_ms:.1f} ms")
    print(f"Repair duration (restart only): {(recovery_time - repair_start_time):.1f} ms")

if __name__ == "__main__":
    run_experiment()