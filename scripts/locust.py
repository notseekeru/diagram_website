import os
from pathlib import Path
from dotenv import load_dotenv
from locust import HttpUser, task, between

# 1. Look up one folder from 'scripts/' to reach the root, then go into 'backend'
env_path = Path(__file__).resolve().parent / "../backend/.env"

# 2. Load the environment variables from that specific file
load_dotenv(dotenv_path=env_path)

class DiagramApiUser(HttpUser):
    # Simulates users waiting 1 to 3 seconds between actions
    wait_time = between(1, 3)
    
    def on_start(self):
        # 3. Read the API_KEY variable from the environment
        self.api_key = os.getenv("API_KEY") 
        
        if not self.api_key:
            raise ValueError(f"API_KEY not found! Checked path: {env_path.resolve().as_posix()}")
        
        # Global headers for all normal user tasks
        self.client.headers.update({
            "X-API-Key": self.api_key,
            "Content-Type": "application/json"
        })

    @task(3)
    def list_diagrams(self):
        """Fetches all diagrams."""
        self.client.get("/api/diagrams")

    @task(1)
    def diagram_lifecycle(self):
        """Simulates a complete user workflow sequentially."""
        payload = {
            "title": "Locust Load Test",
            "mermaidText": "flowchart TD\nStart --> Process --> End"
        }
        
        with self.client.post("/api/save-diagram", json=payload, name="/api/save-diagram", catch_response=True) as response:
            if response.status_code not in (200, 201):
                # Merged: Print error details to WSL terminal for troubleshooting
                print(f"Failed to create diagram: {response.status_code} - {response.text}")
                return
            
            try:
                diagram_data = response.json()
                diagram_id = diagram_data.get("id") 
            except Exception as e:
                print(f"Failed to parse JSON response: {e}")
                return

        if diagram_id:
            # Fetch the created diagram
            self.client.get(f"/api/get-diagram/{diagram_id}", name="/api/get-diagram/[id]")

            # Update the diagram
            update_payload = {
                "title": "Locust Load Test - Updated",
                "mermaidText": "flowchart TD\nStart --> Process --> Finish"
            }
            self.client.put(f"/api/diagrams/{diagram_id}", json=update_payload, name="/api/diagrams/[id]")

            # Delete the diagram
            self.client.delete(f"/api/diagrams/{diagram_id}", name="/api/diagrams/[id]")

    @task(1)
    def test_unauthorized_access(self):
        """Merged: Tests backend security by sending an invalid key."""
        custom_headers = {"X-API-Key": "INVALID_WRONG_KEY"}
        
        with self.client.get("/api/diagrams", headers=custom_headers, catch_response=True) as response:
            if response.status_code == 401:
                # Tells Locust this is a success so your dashboard statistics stay green
                response.success()
            else:
                # Alerts you in the UI if your backend incorrectly lets this key pass
                response.failure(f"Security Alert: Expected 401 but got {response.status_code}")
