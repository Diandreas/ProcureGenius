#!/usr/bin/env python3
"""
Script de build pour créer une application desktop ProcureGenius
avec Electron et PyInstaller (backend crypté)
"""

import os
import sys
import subprocess
import shutil
import json
from pathlib import Path

class DesktopBuilder:
    def __init__(self):
        self.root_dir = Path(__file__).parent
        self.frontend_dir = self.root_dir / 'frontend'
        self.backend_dir = self.root_dir / 'backend_build'
        self.dist_dir = self.root_dir / 'dist_desktop'

    def run_command(self, command, cwd=None, shell=False):
        """Exécute une commande et gère les erreurs"""
        try:
            print(f"🔧 Exécution: {' '.join(command) if isinstance(command, list) else command}")
            result = subprocess.run(
                command,
                cwd=cwd or self.root_dir,
                shell=shell,
                check=True,
                capture_output=True,
                text=True
            )
            return result
        except subprocess.CalledProcessError as e:
            print(f"❌ Erreur lors de l'exécution: {e}")
            print(f"Sortie erreur: {e.stderr}")
            raise

    def check_dependencies(self):
        """Vérifie que toutes les dépendances sont installées"""
        print("🔍 Vérification des dépendances...")

        # Vérifier Node.js et npm
        try:
            self.run_command(['node', '--version'])
            self.run_command(['npm', '--version'])
        except:
            raise Exception("Node.js et npm sont requis. Installez-les depuis https://nodejs.org/")

        # Vérifier Python
        try:
            result = self.run_command(['python', '--version'])
        except:
            raise Exception("Python est requis. Installez-le depuis https://python.org/")

        # Vérifier PyInstaller
        try:
            import PyInstaller
        except ImportError:
            print("📦 Installation de PyInstaller...")
            self.run_command([sys.executable, '-m', 'pip', 'install', 'pyinstaller'])

        print("✅ Dépendances vérifiées")

    def build_frontend(self):
        """Construit le frontend React"""
        print("🏗️ Construction du frontend...")

        os.chdir(self.frontend_dir)

        # Installer les dépendances
        self.run_command(['npm', 'install'])

        # Build de production
        self.run_command(['npm', 'run', 'build'])

        os.chdir(self.root_dir)
        print("✅ Frontend construit")

    def create_backend_spec(self):
        """Crée le fichier spec PyInstaller pour le backend"""
        print("📝 Création du spec file pour le backend...")

        spec_content = '''
# -*- mode: python ; coding: utf-8 -*-

import os
from pathlib import Path

# Fonction pour collecter tous les fichiers d'un dossier
def collect_data_files(source_dir, target_dir=""):
    """Collecte tous les fichiers d'un dossier pour PyInstaller"""
    data_files = []
    source_path = Path(source_dir)

    if source_path.exists():
        for file_path in source_path.rglob('*'):
            if file_path.is_file() and not any(skip in str(file_path) for skip in [
                '__pycache__', '.pyc', '.pyo', '.git', 'node_modules', '.env'
            ]):
                relative_path = file_path.relative_to(source_path.parent)
                data_files.append((str(file_path), str(Path(target_dir) / relative_path.parent)))

    return data_files

block_cipher = None

# Collecter les données nécessaires
data_files = []
data_files.extend(collect_data_files('apps', 'apps'))
data_files.extend(collect_data_files('saas_procurement', 'saas_procurement'))
data_files.extend(collect_data_files('templates', 'templates'))
data_files.extend(collect_data_files('static', 'static'))
data_files.extend(collect_data_files('locale', 'locale'))
data_files.extend(collect_data_files('media', 'media'))

# Fichiers de données supplémentaires
data_files.extend([
    ('requirements.txt', '.'),
    ('manage.py', '.'),
    ('db.sqlite3', '.') if os.path.exists('db.sqlite3') else ('', ''),
])

a = Analysis(
    ['manage.py'],
    pathex=[],
    binaries=[],
    datas=data_files,
    hiddenimports=[
        # Django core
        'django',
        'django.apps',
        'django.conf',
        'django.core',
        'django.db',
        'django.forms',
        'django.http',
        'django.middleware',
        'django.template',
        'django.templatetags',
        'django.urls',
        'django.utils',
        'django.contrib',
        'django.contrib.admin',
        'django.contrib.auth',
        'django.contrib.contenttypes',
        'django.contrib.sessions',
        'django.contrib.messages',
        'django.contrib.staticfiles',
        'django.contrib.sites',

        # Third party apps
        'rest_framework',
        'rest_framework.authtoken',
        'corsheaders',
        'django_filters',
        'crispy_forms',
        'crispy_bootstrap5',
        'allauth',
        'allauth.account',
        'allauth.socialaccount',
        'allauth.socialaccount.providers.google',
        'import_export',
        'channels',
        'django_celery_beat',
        'django_celery_results',

        # Local apps
        'apps.accounts',
        'apps.purchase_orders',
        'apps.invoicing',
        'apps.suppliers',
        'apps.analytics',
        'apps.ai_assistant',
        'apps.integrations',
        'apps.core',
        'apps.e_sourcing',
        'apps.contracts',
        'apps.data_migration',
        'apps.reports',
        'apps.subscriptions',

        # AI and ML libraries
        'mistralai',
        'openai',
        'anthropic',
        'google.generativeai',

        # Database
        'sqlite3',
        'psycopg2',

        # Email
        'smtplib',
        'email',

        # Utilities
        'dotenv',
        'pathlib',
        'uuid',
        'datetime',
        'json',
        'os',
        'sys',
        'logging',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Exclure les modules inutiles pour réduire la taille
        'tkinter',
        'tkinter.ttk',
        'tkinter.messagebox',
        'tkinter.filedialog',
        'tkinter.simpledialog',
        'tkinter.colorchooser',
        'tkinter.font',
        'tkinter.scrolledtext',
        'tkinter.dnd',
        'tkinter.constants',
        'unittest',
        'test',
        'pdb',
        'pydoc',
        'doctest',
        'pickletools',
        'platform',
        'webbrowser',
        'wsgiref',
        'http.server',
        'xmlrpc',
        'xmlrpc.client',
        'xmlrpc.server',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=True,  # Réduire la taille
    upx=True,    # Compression UPX
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # Pas de console en production
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='frontend/public/main.ico' if os.path.exists('frontend/public/main.ico') else None,
)
'''

        with open('backend.spec', 'w', encoding='utf-8') as f:
            f.write(spec_content)

        print("✅ Spec file créé")

    def build_backend(self):
        """Construit le backend avec PyInstaller"""
        print("🔨 Construction du backend avec PyInstaller...")

        # Nettoyer les anciens builds
        if os.path.exists('build'):
            shutil.rmtree('build')
        if os.path.exists('dist'):
            shutil.rmtree('dist')

        # Créer le spec file
        self.create_backend_spec()

        # Build avec PyInstaller
        self.run_command([
            sys.executable, '-m', 'pyinstaller',
            '--clean',
            '--noconfirm',
            'backend.spec'
        ])

        print("✅ Backend construit")

    def setup_electron(self):
        """Configure Electron pour l'application desktop"""
        print("⚡ Configuration d'Electron...")

        os.chdir(self.frontend_dir)

        # Installer les dépendances Electron
        dependencies = [
            'electron',
            'electron-builder',
            'concurrently',
            'wait-on',
            'cross-env'
        ]

        for dep in dependencies:
            self.run_command(['npm', 'install', '--save-dev', dep])

        # Modifier package.json pour Electron
        with open('package.json', 'r', encoding='utf-8') as f:
            package_data = json.load(f)

        # Ajouter les configurations Electron
        package_data.update({
            "main": "electron/main.js",
            "homepage": "./",
            "scripts": {
                **package_data.get("scripts", {}),
                "electron": "electron .",
                "electron:dev": "cross-env NODE_ENV=development concurrently \"npm run dev\" \"wait-on http://localhost:5173 && electron .\"",
                "electron:build": "npm run build && electron-builder",
                "electron:build:win": "npm run build && electron-builder --win",
                "electron:build:mac": "npm run build && electron-builder --mac",
                "electron:build:linux": "npm run build && electron-builder --linux"
            },
            "build": {
                "appId": "com.procuregenius.app",
                "productName": "ProcureGenius",
                "directories": {
                    "output": "dist-electron"
                },
                "files": [
                    "build/**/*",
                    "electron/**/*",
                    "node_modules/**/*",
                    "../dist/backend.exe"
                ],
                "extraResources": [
                    {
                        "from": "../dist/backend.exe",
                        "to": "backend/backend.exe"
                    }
                ],
                "win": {
                    "target": "nsis",
                    "icon": "public/main.ico",
                    "requestedExecutionLevel": "asInvoker"
                },
                "nsis": {
                    "oneClick": False,
                    "perMachine": False,
                    "allowToChangeInstallationDirectory": True,
                    "installerIcon": "public/main.ico",
                    "uninstallerIcon": "public/main.ico",
                    "installerHeaderIcon": "public/main.ico",
                    "createDesktopShortcut": True,
                    "createStartMenuShortcut": True,
                    "shortcutName": "ProcureGenius"
                }
            }
        })

        with open('package.json', 'w', encoding='utf-8') as f:
            json.dump(package_data, f, indent=2, ensure_ascii=False)

        os.chdir(self.root_dir)
        print("✅ Electron configuré")

    def build_desktop_app(self):
        """Construit l'application desktop finale"""
        print("🎯 Construction de l'application desktop finale...")

        # Créer le dossier de distribution
        self.dist_dir.mkdir(exist_ok=True)

        os.chdir(self.frontend_dir)

        # Build Electron avec le backend intégré
        self.run_command(['npm', 'run', 'electron:build:win'])

        # Copier le résultat dans dist_desktop
        electron_dist = self.frontend_dir / 'dist-electron'
        if electron_dist.exists():
            for file_path in electron_dist.glob('**/*'):
                if file_path.is_file():
                    relative_path = file_path.relative_to(electron_dist)
                    target_path = self.dist_dir / relative_path
                    target_path.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(file_path, target_path)

        os.chdir(self.root_dir)
        print("✅ Application desktop construite")

    def create_installer(self):
        """Crée un programme d'installation Windows"""
        print("📦 Création du programme d'installation...")

        # Ici on pourrait ajouter NSIS ou Inno Setup pour créer un .exe d'installation
        # Pour l'instant, on laisse electron-builder gérer ça

        print("✅ Programme d'installation prêt")

    def run(self):
        """Exécute le processus complet de build"""
        try:
            print("🚀 Démarrage du build de ProcureGenius Desktop")
            print("=" * 50)

            # Étape 1: Vérifications
            self.check_dependencies()

            # Étape 2: Build du frontend
            self.build_frontend()

            # Étape 3: Build du backend
            self.build_backend()

            # Étape 4: Configuration Electron
            self.setup_electron()

            # Étape 5: Build de l'application desktop
            self.build_desktop_app()

            # Étape 6: Création de l'installateur
            self.create_installer()

            print("=" * 50)
            print("🎉 Build terminé avec succès!")
            print(f"📁 L'application se trouve dans: {self.dist_dir}")
            print("📋 Fichiers générés:")
            for file_path in self.dist_dir.glob('**/*'):
                if file_path.is_file():
                    size = file_path.stat().st_size / (1024 * 1024)  # MB
                    print(f"   - {file_path.name} ({size:.1f} MB)")

        except Exception as e:
            print(f"❌ Erreur lors du build: {e}")
            sys.exit(1)

if __name__ == '__main__':
    builder = DesktopBuilder()
    builder.run()
