const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let backendProcess;
let backendReady = false;

function createWindow() {
  // Créer la fenêtre principale
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/main.png'),
    title: 'ProcureGenius - Gestion des Achats avec IA',
    show: false, // Ne pas afficher tant que le backend n'est pas prêt
    backgroundColor: '#ffffff'
  });

  // Démarrer le backend Django
  startBackend();

  // Attendre que le backend soit prêt avant de charger l'app
  const checkBackendReady = setInterval(() => {
    if (backendReady) {
      clearInterval(checkBackendReady);
      loadApplication();
    }
  }, 500);

  // Empêcher la fermeture de la fenêtre si le backend tourne encore
  mainWindow.on('close', (event) => {
    if (backendProcess && !backendProcess.killed) {
      event.preventDefault();
      // Fermer proprement
      cleanupAndQuit();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackend() {
  const pythonPath = isDev
    ? 'python'  // En développement
    : path.join(process.resourcesPath, 'backend', 'backend.exe'); // En production

  const backendArgs = isDev
    ? ['manage.py', 'runserver', '8000', '--noreload']  // Mode dev
    : []; // Mode production (backend.exe gère tout)

  const backendCwd = isDev
    ? path.join(__dirname, '../..')  // Racine du projet en dev
    : path.join(process.resourcesPath, 'backend'); // Dossier backend en prod

  console.log('Démarrage du backend...');
  console.log('Python path:', pythonPath);
  console.log('Args:', backendArgs);
  console.log('CWD:', backendCwd);

  backendProcess = spawn(pythonPath, backendArgs, {
    cwd: backendCwd,
    shell: false,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PYTHONPATH: backendCwd,
      DJANGO_SETTINGS_MODULE: 'saas_procurement.settings'
    }
  });

  // Gérer les sorties du backend
  backendProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('Backend:', output);

    // Détecter quand le serveur est prêt
    if (output.includes('Starting development server') || output.includes('Quit the server')) {
      backendReady = true;
    }
  });

  backendProcess.stderr.on('data', (data) => {
    console.error('Backend Error:', data.toString());
  });

  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
    backendReady = false;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
    }
  });

  backendProcess.on('error', (error) => {
    console.error('Failed to start backend:', error);
    // En cas d'erreur, essayer de charger quand même (mode dégradé)
    setTimeout(() => {
      backendReady = true;
    }, 2000);
  });
}

function loadApplication() {
  // Charger l'application React
  const startUrl = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  console.log('Chargement de l\'application:', startUrl);
  mainWindow.loadURL(startUrl);

  // Ouvrir DevTools en développement
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Afficher la fenêtre quand tout est prêt
  mainWindow.show();

  // IPC handlers
  ipcMain.handle('get-app-info', () => {
    return {
      version: app.getVersion(),
      platform: process.platform,
      isDev: isDev
    };
  });
}

function cleanupAndQuit() {
  console.log('Nettoyage et fermeture...');

  // Arrêter le backend proprement
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill('SIGTERM');

    // Attendre un peu avant de forcer
    setTimeout(() => {
      if (backendProcess && !backendProcess.killed) {
        backendProcess.kill('SIGKILL');
      }
      app.quit();
    }, 3000);
  } else {
    app.quit();
  }
}

// Gestion des événements de l'application
app.whenReady().then(() => {
  console.log('ProcureGenius Desktop - Démarrage...');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    cleanupAndQuit();
  }
});

app.on('before-quit', () => {
  cleanupAndQuit();
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
