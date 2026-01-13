
import sqlite3
import os

def check_schema():
    db_path = 'db.sqlite3'
    if not os.path.exists(db_path):
        print("db.sqlite3 not found")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(accounts_client)")
    columns = [row[1] for row in cursor.fetchall()]
    
    print("Existing columns in accounts_client:")
    print(columns)
    
    required_fields = ['patient_number', 'blood_type', 'allergies']
    missing = [f for f in required_fields if f not in columns]
    
    if missing:
        print(f"MISSING fields: {missing}")
        print("NEED_UPDATE")
    else:
        print("All fields present.")
        print("NO_UPDATE_NEEDED")

if __name__ == '__main__':
    check_schema()
