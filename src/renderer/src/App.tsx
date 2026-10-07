import { useState, useEffect, type JSX } from 'react'
import { TtsProvider } from './services/audioService'
import { Scheduler } from './components/Scheduler'
import { Pomodoro } from './components/Pomodoro'
import { Settings } from './components/Settings'
import './styles/app.css'

type TabType = 'scheduler' | 'pomodoro' | 'settings'

export function App(): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('scheduler')

  // グローバルな設定情報のState
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('ht_api_key') || '')
  const [ttsProvider, setTtsProvider] = useState<TtsProvider>(() => {
    const saved = localStorage.getItem('ht_tts_provider') as TtsProvider
    const validProviders: TtsProvider[] = [
      'webSpeech',
      'voicevox_3',
      'voicevox_2',
      'voicevox_8',
      'voicevox_14'
    ]
    return validProviders.includes(saved) ? saved : 'voicevox_3'
  })
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem('ht_volume')
    return saved ? parseInt(saved, 10) : 50
  })
  const [preNotifyMinutes, setPreNotifyMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('ht_prenotify')
    return saved ? parseInt(saved, 10) : 5
  })

  // Stateの変更をローカルストレージに自動保存
  useEffect(() => {
    localStorage.setItem('ht_api_key', apiKey)
  }, [apiKey])
  useEffect(() => {
    localStorage.setItem('ht_tts_provider', ttsProvider)
  }, [ttsProvider])
  useEffect(() => {
    localStorage.setItem('ht_volume', volume.toString())
  }, [volume])
  useEffect(() => {
    localStorage.setItem('ht_prenotify', preNotifyMinutes.toString())
  }, [preNotifyMinutes])

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" />
          <h1>HyperTaskScheduler</h1>
        </div>
        <nav className="nav">
          <button
            className={`nav-btn${activeTab === 'scheduler' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('scheduler')}
          >
            タスクスケジューラ
          </button>
          <button
            className={`nav-btn${activeTab === 'pomodoro' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('pomodoro')}
          >
            ポモドーロタイマー
          </button>
          <button
            className={`nav-btn${activeTab === 'settings' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            設定
          </button>
        </nav>
      </header>

      <main className="app-main">
        {/* CSSのdisplayプロパティで表示/非表示を切り替え、コンポーネントのアンマウント（タイマーの停止）を防ぐ */}
        <div className="tab-pane" style={{ display: activeTab === 'scheduler' ? 'block' : 'none' }}>
          <Scheduler
            apiKey={apiKey}
            ttsProvider={ttsProvider}
            volume={volume}
            preNotifyMinutes={preNotifyMinutes}
          />
        </div>

        <div className="tab-pane" style={{ display: activeTab === 'pomodoro' ? 'block' : 'none' }}>
          <Pomodoro ttsProvider={ttsProvider} volume={volume} preNotifyMinutes={preNotifyMinutes} />
        </div>

        <div className="tab-pane" style={{ display: activeTab === 'settings' ? 'block' : 'none' }}>
          <Settings
            apiKey={apiKey}
            setApiKey={setApiKey}
            ttsProvider={ttsProvider}
            setTtsProvider={setTtsProvider}
            volume={volume}
            setVolume={setVolume}
            preNotifyMinutes={preNotifyMinutes}
            setPreNotifyMinutes={setPreNotifyMinutes}
          />
        </div>
      </main>
    </div>
  )
}

export default App
