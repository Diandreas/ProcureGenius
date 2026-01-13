
import sqlite3
import datetime

def force_apply():
    conn = sqlite3.connect('db.sqlite3')
    cursor = conn.cursor()
    
    app = 'accounts'
    name = '0015_client_allergies_client_blood_type_and_more'
    applied = datetime.datetime.now()
    
    # Check if already exists
    cursor.execute("SELECT id FROM django_migrations WHERE app=? AND name=?", (app, name))
    if cursor.fetchone():
        print("Migration already recorded.")
        return

    print(f"Inserting migration {app}.{name}")
    cursor.execute("INSERT INTO django_migrations (app, name, applied) VALUES (?, ?, ?)", (app, name, applied))
    conn.commit()
    print("Migration inserted successfully.")
    conn.close()

if __name__ == '__main__':
    force_apply()
