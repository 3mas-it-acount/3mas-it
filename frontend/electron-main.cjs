const { app, BrowserWindow, session } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

// إعدادات الخادم الخلفي
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'assets', 'app-icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // السماح بتحميل الصور من مصادر خارجية
    },
  });

  // شغّل نسخة الإنتاج المدمجة
  win.loadFile(path.join(__dirname, 'dist', 'index.html'));

  // إعداد متغيرات البيئة للوصول إلى الخادم الخلفي
  win.webContents.executeJavaScript(`
    window.BACKEND_URL = '${BACKEND_URL}';
    window.IS_ELECTRON = true;
  `);

  // التحقق من وجود تحديثات
  autoUpdater.checkForUpdatesAndNotify();

  // إضافة معالج للأخطاء
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorDescription);
  });
}

// إعداد CORS للسماح بالوصول إلى الخادم الخلفي
app.whenReady().then(() => {
  // إعداد session للسماح بالوصول إلى الخادم الخلفي
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['Origin'] = 'file://';
    callback({ requestHeaders: details.requestHeaders });
  });

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
}); 