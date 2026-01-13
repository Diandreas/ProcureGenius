
import sqlite3
import os

def apply_sql():
    sql_file = 'migration_0015.sql'
    if not os.path.exists(sql_file):
        print(f"{sql_file} not found")
        return

    try:
        with open(sql_file, 'r', encoding='utf-16') as f:
            sql = f.read()
    except UnicodeError:
        with open(sql_file, 'r', encoding='utf-8') as f:
            sql = f.read()

    lines = sql.split('\n')
    clean_lines = []
    for line in lines:
        l = line.strip()
        if not l:
            continue
        if l.startswith('[') or l.startswith('D:\\') or l.startswith('warning'):
            continue
        clean_lines.append(line)
    
    sql = '\n'.join(clean_lines)
    
    # The SQL might span multiple lines and contain transaction control which executescript handles
    conn = sqlite3.connect('db.sqlite3')
    cursor = conn.cursor()
    
    try:
        cursor.executescript(sql)
        conn.commit()
        print("SQL executed successfully.")
    except Exception as e:
        print(f"Error executing SQL: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    apply_sql()
