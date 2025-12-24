const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  getBackendUrl: () => {
    return 'http://localhost:3001';
  },
});
