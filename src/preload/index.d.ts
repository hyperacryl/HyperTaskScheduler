import { ElectronAPI } from '@electron-toolkit/preload'

export interface CustomAPI {
  setAlwaysOnTop: (alwaysOnTop: boolean) => void
  resizeWindow: (width: number, height: number) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}