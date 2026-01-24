import requests
import json

BASE_URL = "http://localhost:8000/api/v1"
LOGIN_URL = f"{BASE_URL}/auth/login/" # Looking at apps/api/urls.py line 34
TOKEN_URL = f"{BASE_URL}/auth/token/" # Line 32

def verify_api():
    print("Connecting to API...")
    
    # Try alternate token endpoint first as it's standard DRF
    try:
        response = requests.post(TOKEN_URL, data={
            "username": "julianna_admin",
            "password": "julianna2025"
        })
        
        if response.status_code == 200:
            token = response.json().get('token')
            print(f"Auth Success! Token acquired.")
        else:
            print(f"Token auth failed: {response.status_code} - {response.text}")
            return

        headers = {"Authorization": f"Token {token}"}
        
        # 1. Check Products (for Invoicing)
        print("\n--- Checking Products for Invoicing ---")
        prod_resp = requests.get(f"{BASE_URL}/products/?page_size=1000", headers=headers)
        
        if prod_resp.status_code == 200:
            data = prod_resp.json()
            results = data.get('results', [])
            total_count = data.get('count', 'N/A')
            print(f"Products API: Total in DB: {total_count} | Returned in this call: {len(results)}")
            
            # Check for specific items
            print("Sample items found:")
            for p in results[:10]:
                print(f"  - {p['name']} (Cat: {p.get('category_name', 'N/A')})")
        else:
            print(f"Product API failed: {prod_resp.status_code}")

        # 2. Check Lab Tests (for Lab Demands)
        print("\n--- Checking Lab Tests ---")
        # According to urls.py line 97: path('healthcare/laboratory/', include('apps.laboratory.urls'))
        lab_resp = requests.get(f"{BASE_URL}/healthcare/laboratory/tests/?page_size=1000", headers=headers)
        
        if lab_resp.status_code == 200:
            data = lab_resp.json()
            results = data.get('results', [])
            total_count = data.get('count', 'N/A')
            print(f"Lab API: Total in DB: {total_count} | Returned in this call: {len(results)}")
            for t in results[:5]:
                print(f"  - {t['name']} (Code: {t['test_code']})")
        # 3. Simulate UI Search for "Consultation"
        print("\n--- Simulating Search for 'Consultation' ---")
        search_resp = requests.get(f"{BASE_URL}/products/?search=Consultation&page_size=100", headers=headers)
        if search_resp.status_code == 200:
            results = search_resp.json().get('results', [])
            print(f"Search for 'Consultation' found {len(results)} matches.")
            for r in results[:5]:
                print(f"  - {r['name']} (Price: {r['price']})")
        
        print("\nVerification Complete.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    verify_api()
