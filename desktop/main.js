// Retro Media Player — Electron shell around the single-file web app in ./app/index.html
const { app, BrowserWindow, Menu, shell, protocol, net, session } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

app.setName('Retro Media Player');
app.setPath('userData', path.join(app.getPath('appData'), 'Retro Media Player')); // stable localStorage location
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Serve the app from a fixed, secure custom origin (app://player) so localStorage survives moving/renaming the folder.
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);
const APP_DIR = path.join(__dirname, 'app');
const CSP = [
  "default-src 'self' blob: data:",
  "script-src 'self' 'unsafe-inline' https://api.deezer.com https://itunes.apple.com", // inline app code + Discover JSONP
  "connect-src 'self' https: blob:",                                                     // MusicBrainz / ListenBrainz fetch
  "img-src 'self' https: blob: data:",
  "media-src 'self' https: blob: data:",                                                 // local files (blob:) + 30s previews
  "style-src 'self' 'unsafe-inline'",
].join('; ');

if (!app.requestSingleInstanceLock()) app.quit();
let win;
function createWindow() {
  win = new BrowserWindow({
    width: 900, height: 640, minWidth: 700, minHeight: 480,
    title: 'Retro Media Player', backgroundColor: '#121722', autoHideMenuBar: true, show: false,
    icon: path.join(__dirname, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false },
  });
  win.removeMenu();
  win.on('page-title-updated', e => e.preventDefault());
  win.once('ready-to-show', () => win.show());
  // external links (Deezer / iTunes / YouTube) open in the default browser
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:\/\//i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://')) { e.preventDefault(); if (/^https?:\/\//i.test(url)) shell.openExternal(url); } });
  win.webContents.on('before-input-event', (e, i) => { if (i.type === 'keyDown' && i.key === 'F12' && i.control && i.shift) win.webContents.toggleDevTools(); });
  win.loadURL('app://player/index.html');
}
app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  protocol.handle('app', async req => {
    const rel = decodeURIComponent(new URL(req.url).pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.normalize(path.join(APP_DIR, rel));
    if (!file.startsWith(APP_DIR)) return new Response('Forbidden', { status: 403 });
    const res = await net.fetch(pathToFileURL(file).toString());
    const headers = new Headers(res.headers); headers.set('Content-Security-Policy', CSP);
    if (file.endsWith('.html')) headers.set('Content-Type', 'text/html; charset=utf-8');
    return new Response(res.body, { status: res.status, headers });
  });
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(['fullscreen', 'media', 'clipboard-sanitized-write'].includes(perm)));
  createWindow();
});
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('window-all-closed', () => app.quit());
