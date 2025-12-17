# 🖥️ Guide : Transformer ProcureGenius en Application Desktop

Ce guide présente plusieurs options pour transformer votre application web en application desktop locale.

## 📋 Options Disponibles

### Option 1 : Electron (Recommandé pour rapidité) ⚡
**Avantages** :
- ✅ Rapide à mettre en place
- ✅ Compatible avec votre stack React existante
- ✅ Multi-plateforme (Windows, Mac, Linux)
- ✅ Large communauté et documentation

**Inconvénients** :
- ❌ Taille importante (~100-200 MB)
- ❌ Consommation mémoire élevée

### Option 2 : Tauri (Recommandé pour performance) 🚀
**Avantages** :
- ✅ Très léger (~5-10 MB)
- ✅ Performance native
- ✅ Sécurité renforcée
- ✅ Moderne et rapide

**Inconvénients** :
- ❌ Nécessite Rust (mais pas besoin de le connaître)
- ❌ Moins de ressources que Electron

### Option 3 : PyInstaller + Serveur embarqué 🔧
**Avantages** :
- ✅ Tout en Python
- ✅ Pas de dépendances externes

**Inconvénients** :
- ❌ Plus complexe à configurer
- ❌ Taille importante

---

## 🚀 Option 1 : Electron (Mise en place rapide)

### Étape 1 : Installer Electron dans le frontend

```bash
cd frontend
npm install --save-dev electron electron-builder concurrently wait-on
```

### Étape 2 : Créer le fichier principal Electron

Créez `frontend/electron/main.js` :

```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = require('electron-is-dev');

let mainWindow;
let backendProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/main.png')
  });

  // Démarrer le backend Django
  if (!isDev) {
    startBackend();
  }

  // Charger l'application
  const startUrl = isDev 
    ? 'http://localhost:5173'  // Vite dev server
    : `file://${path.join(__dirname, '../dist/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Ouvrir DevTools en développement
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackend() {
  // Chemin vers le script Python embarqué ou exécutable
  const backendPath = path.join(__dirname, '../../backend.exe');
  backendProcess = spawn(backendPath, [], {
    cwd: path.join(__dirname, '../..')
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`Backend Error: ${data}`);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

### Étape 3 : Créer le preload script

Créez `frontend/electron/preload.js` :

```javascript
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.versions.electron
});
```

### Étape 4 : Modifier package.json

Ajoutez dans `frontend/package.json` :

```json
{
  "main": "electron/main.js",
  "homepage": "./",
  "scripts": {
    "electron": "electron .",
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && electron .\"",
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
      "dist/**/*",
      "electron/**/*",
      "node_modules/**/*"
    ],
    "win": {
      "target": "nsis",
      "icon": "public/main.png"
    },
    "mac": {
      "target": "dmg",
      "icon": "public/main.png"
    },
    "linux": {
      "target": "AppImage",
      "icon": "public/main.png"
    }
  }
}
```

### Étape 5 : Créer un backend embarqué avec PyInstaller

Créez `build_backend.py` à la racine :

```python
import subprocess
import sys
import os

# Créer le spec file pour PyInstaller
spec_content = """
# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['manage.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('apps', 'apps'),
        ('saas_procurement', 'saas_procurement'),
        ('templates', 'templates'),
        ('static', 'static'),
        ('locale', 'locale'),
    ],
    hiddenimports=[
        'django',
        'rest_framework',
        'corsheaders',
        'allauth',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
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
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
"""

with open('backend.spec', 'w') as f:
    f.write(spec_content)

# Exécuter PyInstaller
subprocess.run([
    sys.executable, '-m', 'PyInstaller',
    '--clean',
    'backend.spec'
])
```

### Étape 6 : Installation et build

```bash
# 1. Installer PyInstaller
pip install pyinstaller

# 2. Build le backend
python build_backend.py

# 3. Build Electron
cd frontend
npm run electron:build:win
```

---

## 🚀 Option 2 : Tauri (Plus léger et moderne)

### Étape 1 : Installer Tauri

```bash
cd frontend
npm install --save-dev @tauri-apps/cli
npm install @tauri-apps/api
```

### Étape 2 : Initialiser Tauri

```bash
npx tauri init
# Répondre aux questions :
# - App name: ProcureGenius
# - Window title: ProcureGenius
# - Dist dir: ../dist
# - Dev path: http://localhost:5173
```

### Étape 3 : Configurer Tauri

Modifiez `frontend/src-tauri/tauri.conf.json` :

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:5173",
    "distDir": "../dist"
  },
  "package": {
    "productName": "ProcureGenius",
    "version": "1.0.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "all": false,
        "open": true
      },
      "http": {
        "all": true,
        "request": true
      }
    },
    "windows": [
      {
        "title": "ProcureGenius",
        "width": 1400,
        "height": 900,
        "resizable": true,
        "fullscreen": false
      }
    ]
  }
}
```

### Étape 4 : Modifier package.json

```json
{
  "scripts": {
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  }
}
```

### Étape 5 : Démarrer en mode dev

```bash
npm run tauri:dev
```

### Étape 6 : Build pour production

```bash
npm run tauri:build
```

---

## 🔧 Option 3 : Solution Hybride Simple (Recommandé pour début)

### Créer un launcher Windows simple

Créez `launcher.py` à la racine :

```python
import subprocess
import sys
import os
import webbrowser
import time
from threading import Timer

def start_backend():
    """Démarre le serveur Django"""
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    subprocess.Popen([
        sys.executable, 'manage.py', 'runserver', '8000'
    ], creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0)

def start_frontend():
    """Démarre le serveur Vite"""
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend'))
    subprocess.Popen([
        'npm', 'run', 'dev'
    ])

def open_browser():
    """Ouvre le navigateur après un délai"""
    time.sleep(5)  # Attendre que les serveurs démarrent
    webbrowser.open('http://localhost:5173')

if __name__ == '__main__':
    print("🚀 Démarrage de ProcureGenius...")
    start_backend()
    start_frontend()
    
    # Ouvrir le navigateur après 5 secondes
    Timer(5.0, open_browser).start()
    
    print("✅ Application démarrée sur http://localhost:5173")
    print("Appuyez sur Ctrl+C pour arrêter")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n👋 Arrêt de l'application...")
```

### Créer un exécutable avec PyInstaller

```bash
pip install pyinstaller

# Créer l'exécutable
pyinstaller --onefile --windowed --name="ProcureGenius" --icon=frontend/public/main.png launcher.py
```

---

## 📦 Solution Recommandée : Electron + Backend Embarqué

### Structure finale recommandée :

```
ProcureGenius/
├── frontend/
│   ├── electron/
│   │   ├── main.js          # Processus principal Electron
│   │   └── preload.js       # Script de préchargement
│   ├── package.json          # Avec scripts Electron
│   └── ...
├── backend/
│   └── backend.exe          # Backend Django compilé (PyInstaller)
└── ...
```

### Avantages de cette approche :
1. ✅ Application autonome (pas besoin d'installer Python/Node)
2. ✅ Démarrage automatique du backend
3. ✅ Interface native
4. ✅ Distribution facile (un seul .exe)

---

## 🎯 Quick Start : Option la plus rapide

### Pour tester rapidement Electron :

```bash
# 1. Dans frontend/
cd frontend
npm install --save-dev electron concurrently wait-on

# 2. Créer electron/main.js (voir code ci-dessus)

# 3. Modifier package.json (ajouter scripts)

# 4. Tester
npm run electron:dev
```

---

## 📝 Notes Importantes

1. **Base de données** : Pour une app desktop, utilisez SQLite (déjà configuré)
2. **API Backend** : Le backend Django doit tourner en local (localhost:8000)
3. **CORS** : S'assurer que CORS est configuré pour accepter les requêtes depuis Electron
4. **Fichiers statiques** : Utiliser le build de production (`npm run build`)

---

## 🔍 Prochaines Étapes

1. Choisir une option (Electron recommandé pour rapidité)
2. Suivre les étapes de l'option choisie
3. Tester l'application
4. Build pour production
5. Distribuer l'exécutable

---

*Pour plus d'aide, consultez :*
- [Documentation Electron](https://www.electronjs.org/docs)
- [Documentation Tauri](https://tauri.app/)
- [Documentation PyInstaller](https://pyinstaller.org/)

