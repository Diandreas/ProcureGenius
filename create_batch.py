import requests
import json

url = "http://localhost:8090/api/v1/products/ee3d9ecf-e3c3-463c-9d97-c5702957dad1/batches/"
headers = {
    "Authorization": "Token d91f57178850064895f1b2a58439bff7a7a34d9e",
    "Content-Type": "application/json"
}
data = {
    "batch_number": "BT-2026-X1",
    "quantity": 2000,
    "quantity_remaining": 2000,
    "expiry_date": "2026-03-15",
    "product": "ee3d9ecf-e3c3-463c-9d97-c5702957dad1",
    "organization": "fb05eb34-233d-442a-b19a-945ea0edd0e8"
}

try:
    response = requests.post(url, headers=headers, json=data)
    print(f"Status Code: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
