import os

APPS_DIR = r"d:\project\BFMa\ProcureGenius\apps"

def analyze_apps():
    empty_apps = []
    skeleton_apps = []
    high_migrations = []
    
    for app_name in sorted(os.listdir(APPS_DIR)):
        app_path = os.path.join(APPS_DIR, app_name)
        if not os.path.isdir(app_path) or app_name == "__pycache__":
            continue
            
        code_files = 0
        has_models = False
        has_views = False
        
        for root, _, files in os.walk(app_path):
            if "migrations" in root:
                continue
            for f in files:
                if f.endswith(".py"):
                    code_files += 1
                    if f == "models.py": has_models = True
                    if f == "views.py": has_views = True

        migrations_path = os.path.join(app_path, "migrations")
        mig_count = 0
        if os.path.exists(migrations_path):
            mig_count = len([f for f in os.listdir(migrations_path) if f.endswith(".py") and f != "__init__.py"])
            if mig_count > 10:
                high_migrations.append((app_name, mig_count))

        if code_files == 0:
            empty_apps.append(app_name)
        elif not has_models and not has_views and code_files < 3:
            skeleton_apps.append(app_name)

    print("EMPTY APPS (Safe to delete?):")
    for app in empty_apps: print(f" - {app}")
    
    print("\nSKELETON APPS (Review required):")
    for app in skeleton_apps: print(f" - {app}")
    
    print("\nHIGH MIGRATION COUNTS:")
    for app, count in high_migrations: print(f" - {app}: {count} migrations")

if __name__ == "__main__":
    analyze_apps()
