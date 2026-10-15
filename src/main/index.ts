import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 880,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // 純粋な数値として受け取り、確実に型変換してクラッシュを防ぐ
  ipcMain.on('resize-window', (_, rawWidth, rawHeight) => {
    if (!mainWindow || mainWindow.isDestroyed()) return

    const targetWidth = Number(rawWidth) || 1100
    const targetHeight = Number(rawHeight) || 880

    const bounds = mainWindow.getBounds()
    const rightX = bounds.x + bounds.width
    const nextX = rightX - targetWidth

    mainWindow.setBounds({
      x: nextX,
      y: bounds.y,
      width: targetWidth,
      height: targetHeight
    })
  })

  // 最前面表示の切り替え機能
  ipcMain.on('set-always-on-top', (_, flag: boolean) => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    mainWindow.setAlwaysOnTop(Boolean(flag))
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})