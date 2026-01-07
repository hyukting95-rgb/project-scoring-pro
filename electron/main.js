const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const db = require('./db');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const devServer = process.env.VITE_DEV_SERVER_URL;
  if (devServer) {
    win.loadURL(devServer);
    win.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    win.loadFile(indexPath);
  }
}

app.whenReady().then(() => {
  db.open(app);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('db:getAllProjects', () => db.getAllProjects());
ipcMain.handle('db:getAllPersonnel', () => db.getAllPersonnel());
ipcMain.handle('db:putProject', (_e, project) => db.putProject(project));
ipcMain.handle('db:putProjects', (_e, projects) => db.putProjects(projects));
ipcMain.handle('db:putPersonnel', (_e, records) => db.putPersonnel(records));
ipcMain.handle('db:replaceProjectAndPersonnel', (_e, payload) => db.replaceProjectAndPersonnel(payload.project, payload.personnel));
ipcMain.handle('db:deleteProjectWithPersonnel', (_e, projectId) => db.deleteProjectWithPersonnel(projectId));
ipcMain.handle('db:updateProjectStatus', (_e, payload) => db.updateProjectStatus(payload.id, payload.status));
ipcMain.handle('db:export', async () => {
  const res = await dialog.showSaveDialog({
    title: '导出数据库',
    defaultPath: 'project_scoring_pro.sqlite',
    filters: [{ name: 'SQLite DB', extensions: ['sqlite', 'db'] }],
  });
  if (res.canceled || !res.filePath) return false;
  db.exportDB(app, res.filePath);
  return true;
});
ipcMain.handle('db:import', async () => {
  const res = await dialog.showOpenDialog({
    title: '导入数据库',
    filters: [{ name: 'SQLite DB', extensions: ['sqlite', 'db'] }],
    properties: ['openFile'],
  });
  if (res.canceled || !res.filePaths || !res.filePaths[0]) return false;
  db.importDB(app, res.filePaths[0]);
  return true;
});
