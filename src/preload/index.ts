import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const customAPI = {
  setAlwaysOnTop: (alwaysOnTop: boolean): void => {
    ipcRenderer.send('set-always-on-top', alwaysOnTop)
  },
  resizeWindow: (width: number, height: number): void => {
    ipcRenderer.send('resize-window', { width, height })
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', customAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in d.ts)
  window.electron = electronAPI
  // @ts-ignore (define in d.ts)
  window.api = customAPI
}