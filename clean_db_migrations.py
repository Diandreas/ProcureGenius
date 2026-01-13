
import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

def clean_migrations():
    with connection.cursor() as cursor:
        # Check if 0015 exists
        cursor.execute("SELECT id, app, name FROM django_migrations WHERE app='accounts' AND name LIKE '0015%'")
        rows = cursor.fetchall()
        if rows:
            print(f"Found accounts.0015 in DB: {rows}")
            cursor.execute("DELETE FROM django_migrations WHERE app='accounts' AND name LIKE '0015%'")
            print("Deleted accounts.0015 from DB")
        else:
            print("accounts.0015 NOT found in DB")
            
        # Clean new apps
        apps = ['patients', 'laboratory', 'pharmacy', 'consultations']
        for app in apps:
            cursor.execute(f"DELETE FROM django_migrations WHERE app='{app}'")
            print(f"Cleaned migrations for {app}")

if __name__ == '__main__':
    clean_migrations()
