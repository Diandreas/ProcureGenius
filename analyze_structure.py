import os

APPS_DIR = r"d:\project\BFMa\ProcureGenius\apps"

def analyze_apps():
    print(f"{'App Name':<20} | {'Code Files':<10} | {'Migrations':<10} | {'Status':<15}")
    print("-" * 65)
    
    for app_name in sorted(os.listdir(APPS_DIR)):
        app_path = os.path.join(APPS_DIR, app_name)
        if not os.path.isdir(app_path) or app_name == "__pycache__":
            continue
            
        # Count code files
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

        # Count migrations
        migration_files = 0
        migrations_path = os.path.join(app_path, "migrations")
        if os.path.exists(migrations_path):
            migration_files = len([f for f in os.listdir(migrations_path) if f.endswith(".py") and f != "__init__.py"])

        status = "Active"
        if code_files == 0:
            status = "Empty"
        elif not has_models and not has_views and code_files < 3:
            status = "Skeleton/Util"
            
        print(f"{app_name:<20} | {code_files:<10} | {migration_files:<10} | {status:<15}")

if __name__ == "__main__":
    analyze_apps()
