# ⚡ Quick Start : Application Desktop en 5 minutes

## Option la plus rapide : Electron

### 1. Installer les dépendances (1 minute)

```bash
cd frontend
npm install --save-dev electron concurrently wait-on cross-env
```

### 2. Créer les fichiers Electron

#### Créer `frontend/electron/main.js` :

```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let backendProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Pour permettre les requêtes CORS
    },
    icon: path.join(__dirname, '../public/main.png'),
    title: 'ProcureGenius'
  });

  // Démarrer le backend Django en mode dev
  if (isDev) {
    startBackend();
  }

  // Charger l'application
  const startUrl = isDev 
    ? 'http://localhost:5173'  // Vite dev server
    : `file://${path.join(__dirname, '../build/index.html')}`;
  
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
  const backendPath = path.join(__dirname, '../../manage.py');
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  
  backendProcess = spawn(pythonCmd, ['manage.py', 'runserver', '8000'], {
    cwd: path.join(__dirname, '../..'),
    shell: true,
    stdio: 'inherit'
  });

  backendProcess.on('error', (err) => {
    console.error('Erreur backend:', err);
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

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});
```

#### Créer `frontend/electron/preload.js` :

```javascript
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.versions.electron
});
```

### 3. Modifier `frontend/package.json`

Ajoutez ces scripts :

```json
{
  "main": "electron/main.js",
  "scripts": {
    "electron": "electron .",
    "electron:dev": "cross-env NODE_ENV=development concurrently \"npm run dev\" \"wait-on http://localhost:5173 && electron .\"",
    "electron:build": "npm run build && electron-builder"
  }
}
```

### 4. Vérifier la configuration CORS

Dans `saas_procurement/settings.py`, assurez-vous d'avoir :

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8000",
]

# Pour Electron, autoriser toutes les origines en développement
CORS_ALLOW_ALL_ORIGINS = True  # Seulement en dev
```

### 5. Lancer l'application

```bash
cd frontend
npm run electron:dev
```

### 6. Build pour production (optionnel)

```bash
npm install --save-dev electron-builder

# Ajouter dans package.json :
{
  "build": {
    "appId": "com.procuregenius.app",
    "productName": "ProcureGenius",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      "build/**/*",
      "electron/**/*",
      "node_modules/**/*"
    ],
    "win": {
      "target": "nsis",
      "icon": "public/main.png"
    }
  }
}

# Build
npm run electron:build
```

---

## 🎯 Résultat

Vous aurez une application desktop qui :
- ✅ Démarre automatiquement le backend Django
- ✅ Ouvre l'interface React dans une fenêtre native
- ✅ Fonctionne comme une application desktop classique
- ✅ Peut être compilée en .exe pour distribution

---

## ⚠️ Notes

1. **Premier lancement** : Le backend Django doit être configuré (migrations, superuser, etc.)
2. **Base de données** : Utilise SQLite par défaut (parfait pour desktop)
3. **Ports** : Backend sur 8000, Frontend sur 5173
4. **Production** : Pour un vrai exécutable, il faudra aussi compiler le backend avec PyInstaller

---

## 🚀 Prochaines étapes

1. Tester l'application en mode dev
2. Si ça fonctionne, suivre le guide complet dans `GUIDE_APPLICATION_DESKTOP.md`
3. Build pour production
4. Distribuer l'exécutable

