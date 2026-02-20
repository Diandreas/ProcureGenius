import requests
import json

url = "http://localhost:8090/api/v1/auth/login/"
data = {
    "email": "admin@csj.cm",
    "password": "julianna2025"
}

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
