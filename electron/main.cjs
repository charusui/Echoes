const { app, BrowserWindow, protocol, shell } = require('electron');
const path = require('path');
const fs = require('fs');

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
  // Handle the custom protocol to serve files from dist using fs (supports ASAR)
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

    try {
      const data = fs.readFileSync(filePath);
      
      // Determine content type
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.ico': 'image/x-icon',
      };
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      return new Response(data, {
        headers: { 'content-type': contentType }
      });
    } catch (error) {
      console.error('Failed to read file:', filePath, error);
      return new Response('Not Found', { status: 404 });
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
