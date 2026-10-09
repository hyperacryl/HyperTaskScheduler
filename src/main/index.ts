import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 340,
    minHeight: 220,
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
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 最前面表示の切り替え
  ipcMain.on('set-always-on-top', (event, alwaysOnTop: boolean) => {
    const webContents = event.sender
    const win = BrowserWindow.fromWebContents(webContents)
    if (win) {
      win.setAlwaysOnTop(alwaysOnTop, 'floating')
    }
  })

  // ウィンドウサイズの変更 (右上角のスクリーン座標を絶対保持)
  ipcMain.on('resize-window', (event, { width: newWidth, height: newHeight }: { width: number; height: number }) => {
    const webContents = event.sender
    const win = BrowserWindow.fromWebContents(webContents)
    if (!win) return

    const [currentX, currentY] = win.getPosition()
    const [currentW] = win.getSize()

    // 右上端 (currentX + currentW) を固定して新しい X 座標を補正計算
    const newX = currentX + (currentW - newWidth)

    win.setBounds({
      x: Math.round(newX),
      y: currentY,
      width: Math.round(newWidth),
      height: Math.round(newHeight)
    }, true)
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