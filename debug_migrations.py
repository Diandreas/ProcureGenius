
import os
import django
from django.conf import settings
from django.db import connection

# Configure Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saas_procurement.settings')
django.setup()

def check_migrations():
    with connection.cursor() as cursor:
        cursor.execute("SELECT app, name, applied FROM django_migrations WHERE app IN ('accounts', 'patients', 'laboratory', 'pharmacy', 'consultations') ORDER BY applied")
        rows = cursor.fetchall()
        print("Applied migrations:")
        for row in rows:
            print(f"{row[0]} - {row[1]} ({row[2]})")

if __name__ == '__main__':
    check_migrations()
