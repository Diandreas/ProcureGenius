import requests
import json

url = "http://localhost:8090/api/v1/products/ee3d9ecf-e3c3-463c-9d97-c5702957dad1/"
headers = {
    "Authorization": "Token d91f57178850064895f1b2a58439bff7a7a34d9e",
    "Content-Type": "application/json"
}
data = {
    "low_stock_threshold": 500
}

try:
    response = requests.patch(url, headers=headers, json=data)
    print(f"Status Code: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
