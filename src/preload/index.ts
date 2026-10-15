import { contextBridge, ipcRenderer } from 'electron'

const customAPI = {
  setAlwaysOnTop: (alwaysOnTop: boolean): void => {
    ipcRenderer.send('set-always-on-top', alwaysOnTop)
  },
  resizeWindow: (width: number, height: number): void => {
    // オブジェクトではなく、純粋な2つの数値として送信し変換エラーを防ぐ
    ipcRenderer.send('resize-window', width, height)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', customAPI)
  } catch (error) {
    console.error('preload error:', error)
  }
} else {
  // @ts-ignore
  window.api = customAPI
}