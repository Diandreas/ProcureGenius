const { contextBridge, ipcRenderer } = require('electron');

// Exposer une API sécurisée au renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Informations sur l'application
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // Informations sur la plateforme
  platform: process.platform,
  versions: process.versions,

  // Gestion des fenêtres
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),

  // Gestion des fichiers (pour les exports)
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),

  // Notifications système
  showNotification: (title, body) => {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  },

  // Ouverture d'URLs externes
  openExternal: (url) => ipcRenderer.invoke('open-external', url)
});

// Gérer les permissions de notification
if (typeof Notification !== 'undefined') {
  Notification.requestPermission();
}
