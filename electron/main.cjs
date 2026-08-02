const { app, BrowserWindow, protocol, net, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

// Register 'app' scheme as standard and secure
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1280,
    minHeight: 720,
    title: 'Musikultura',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#151828',
    show: false,
  });

  // Load the app using our custom scheme
  win.loadURL('app://./index.html');

  // Show window once ready to avoid white flash
  win.once('ready-to-show', () => {
    win.show();
  });

  // Open external links in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.removeMenu();
}

app.whenReady().then(() => {
  // Handle the custom protocol to serve files from dist
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    let pathname = url.pathname;
    
    // Normalize path by stripping leading slashes
    if (pathname.startsWith('/')) {
      pathname = pathname.substring(1);
    }
    if (pathname === '' || pathname === '/') {
      pathname = 'index.html';
    }

    const filePath = path.join(__dirname, '../dist', pathname);
    return net.fetch(pathToFileURL(filePath).toString());
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
