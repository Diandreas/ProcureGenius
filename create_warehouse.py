import requests
import json

url = "http://localhost:8090/api/v1/warehouses/"
headers = {
    "Authorization": "Token d91f57178850064895f1b2a58439bff7a7a34d9e",
    "Content-Type": "application/json"
}
data = {
    "name": "Pharmacie Centrale",
    "code": "PH-01",
    "address": "Avenue de la Santé",
    "city": "Yaoundé",
    "province": "Centre",
    "is_default": True,
    "organization": "fb05eb34-233d-442a-b19a-945ea0edd0e8"
}

try:
    response = requests.post(url, headers=headers, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
