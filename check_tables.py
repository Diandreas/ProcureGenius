
import sqlite3
import os

def check_tables():
    conn = sqlite3.connect('db.sqlite3')
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'laboratory%'")
    rows = cursor.fetchall()
    print("Tables found:")
    for row in rows:
        print(row[0])
    
    if not rows:
        print("NO_LAB_TABLES_FOUND")
    else:
        print("LAB_TABLES_EXIST")

if __name__ == '__main__':
    check_tables()
