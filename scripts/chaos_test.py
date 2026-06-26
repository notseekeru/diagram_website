#!/usr/bin/env python3
import os
import sys
import time
import subprocess
import requests
from http.server import BaseHTTPRequestHandler, HTTPServer
import threading

# --- Configuration ---
CONTAINER_NAME = "diagram_postgres"
TARGET_URL = "http://localhost:5050/api/diagrams"
API_KEY = os.getenv("API_KEY", "default_secret_key")
WEBHOOK_PORT = 9099

alert_received_time = None

class WebhookReceiver(BaseHTTPRequestHandler):
    """Answers Alertmanager webhooks to record true detection time."""
    def do_POST(self):
        global alert_received_time
        if alert_received_time is None:
            alert_received_time = time.time_ns()
            print(f"\n[SUCCESS] Webhook hit caught at time stamp: {alert_received_time}")
        
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length > 0:
            self.rfile.read(content_length)

        self.send_response(200)
        self.end_headers()
        
    def log_message(self, format, *args):
        return

class CleanHTTPServer(HTTPServer):
    """HTTPServer configuration that aggressively drops ports on exit."""
    allow_reuse_address = True

def start_webhook_server():
    # FIXED: Bound to '0.0.0.0' so Alertmanager can cross the Docker bridge into WSL
    server = CleanHTTPServer(('0.0.0.0', WEBHOOK_PORT), WebhookReceiver)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server

def run_docker_command(action: str, container: str) -> None:
    """Executes native docker core commands reliably."""
    command = ["docker", action, container]
    try:
        subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr.decode().strip() if e.stderr else "Unknown error"
        print(f"\nError executing docker command {' '.join(command)}: {error_msg}", file=sys.stderr)
        sys.exit(1)

def check_target_status() -> str:
    headers = {"X-API-Key": API_KEY}
    try:
        response = requests.get(TARGET_URL, headers=headers, timeout=2.0)
        return str(response.status_code)
    except requests.RequestException:
        return "000"

def main():
    global alert_received_time
    server = None
    
    try:
        server = start_webhook_server()

        # --- Fault Injection ---
        print(f"Forcing immediate termination of container {CONTAINER_NAME}...")
        inject_time = time.time_ns()
        # FIXED: Use "kill" instead of "stop" to break the exporter connectivity instantly
        run_docker_command("kill", CONTAINER_NAME)

        # --- Real MTTD Phase ---
        print(f"Waiting for Alertmanager to hit webhook on port {WEBHOOK_PORT} (MTTD)...")
        timeout = time.time() + 120
        while alert_received_time is None:
            if time.time() > timeout:
                print("\nAborting: Alertmanager never fired an alert within 2 minutes. Recovering container...")
                run_docker_command("start", CONTAINER_NAME)
                sys.exit(1)
            time.sleep(0.5)

        mttd_ms = (alert_received_time - inject_time) // 1_000_000
        print(f"Real MTTD (Time to Detect): {mttd_ms} ms")

        # --- MTTR Phase ---
        print("Starting container recovery via docker start...")
        repair_start_time = time.time_ns()
        run_docker_command("start", CONTAINER_NAME)

        print("Waiting for service to return a 200 OK...")
        timeout = time.time() + 60
        recovery_time = None
        
        while time.time() < timeout:
            if check_target_status() == "200":
                recovery_time = time.time_ns()
                break
            time.sleep(0.5)

        if not recovery_time:
            print("Aborting: Service failed to recover within 60 seconds.")
            sys.exit(1)

        # --- Metrics Output ---
        mtt_repair_ms = (recovery_time - repair_start_time) // 1_000_000
        mttr_ms = (recovery_time - alert_received_time) // 1_000_000
        total_outage_ms = (recovery_time - inject_time) // 1_000_000

        print("\n--- Simulation Metrics ------------------")
        print(f"MTTD (Detection Delay):   {mttd_ms} ms")
        print(f"MTTR (Alert to Recovery): {mttr_ms} ms")
        print(f"MTTRepair (Execution):    {mtt_repair_ms} ms")
        print(f"Total Service Outage:     {total_outage_ms} ms")
        print("-----------------------------------------")

    except KeyboardInterrupt:
        print(f"\nScript interrupted by user. Ensuring {CONTAINER_NAME} is started...")
        run_docker_command("start", CONTAINER_NAME)
        sys.exit(130)

    finally:
        if server:
            print(f"Shutting down webhook receiver on port {WEBHOOK_PORT}...")
            try:
                server.shutdown()
                server.server_close()
            except Exception:
                pass

if __name__ == "__main__":
    main()
