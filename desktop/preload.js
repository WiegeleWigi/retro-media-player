// Exposes a tiny, safe API to the page: get a dropped/picked file's absolute path, and check whether saved paths still exist.
const { contextBridge, webUtils, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('rmpDesktop', {
  pathForFile: f => { try { return webUtils.getPathForFile(f) || ''; } catch (e) { return ''; } },
  exists: paths => ipcRenderer.invoke('rmp:exists', paths),
});
