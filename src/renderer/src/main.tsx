import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Mantineスタイルと独自のDribbbleスタイルをインポート
import '@mantine/core/styles.css'
import './styles/app.css' // ← ここで呼び出します

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)