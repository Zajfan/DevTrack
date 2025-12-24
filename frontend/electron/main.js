const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    frame: false, // Remove default title bar for custom one
    titleBarStyle: 'hidden', // macOS: hide traffic lights in custom position
    backgroundColor: '#1a1a1a', // Dark background for smooth startup
    webPreferences: {
      preload: path.join(__dirname, '../electron/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load from Vite dev server in development, or from built files in production
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
