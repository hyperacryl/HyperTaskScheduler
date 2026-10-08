import { useState, useEffect } from 'react'
import type { JSX } from 'react'
import '@mantine/core/styles.css'
import { MantineProvider, createTheme, AppShell, Flex, Title, Group, Button, ActionIcon } from '@mantine/core'

import { TtsProvider } from './services/audioService'
import { Scheduler } from './components/Scheduler'
import { Pomodoro } from './components/Pomodoro'
import { Settings } from './components/Settings'
import { MiniTimer } from './components/MiniTimer'
import { usePomodoro } from './hooks/usePomodoro'
import type { AnnounceTemplates } from './types'

export type { AnnounceTemplates } from './types'

const defaultTemplates: AnnounceTemplates = {
  taskStart: '{title} の時間です。始めましょう。',
  taskPreNotify: 'まもなく {title} が終了します。',
  taskEnd: '{title} の時間になりました。次のタスクへ移りましょう。',
  pomodoroWorkStart: '作業時間を開始します。集中していきましょう。',
  pomodoroBreakStart: '休憩時間です。少し体を休めましょう。',
  pomodoroBreakEnd: '休憩時間が終了しました。次の作業を始めましょう。'
}

const customTheme = createTheme({
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
})

type TabType = 'scheduler' | 'pomodoro' | 'settings'

export function App(): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('scheduler')

  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('ht_api_key') || '')
  const [ttsProvider, setTtsProvider] = useState<TtsProvider>(() => {
    const saved = localStorage.getItem('ht_tts_provider') as TtsProvider
    const validProviders: TtsProvider[] = ['webSpeech', 'voicevox_3', 'voicevox_2', 'voicevox_8', 'voicevox_14']
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

  const [templates, setTemplates] = useState<AnnounceTemplates>(() => {
    const saved = localStorage.getItem('ht_announce_templates')
    return saved ? JSON.parse(saved) : defaultTemplates
  })

  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState<boolean>(false)
  const [isCompactMode, setIsCompactMode] = useState<boolean>(false)
  const [virtualTimeStr, setVirtualTimeStr] = useState<string>('')

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      const h = now.getHours().toString().padStart(2, '0')
      const m = now.getMinutes().toString().padStart(2, '0')
      const s = now.getSeconds().toString().padStart(2, '0')
      setVirtualTimeStr(`${h}:${m}:${s}`)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const pomodoro = usePomodoro(ttsProvider, volume, preNotifyMinutes)

  useEffect(() => { localStorage.setItem('ht_api_key', apiKey) }, [apiKey])
  useEffect(() => { localStorage.setItem('ht_tts_provider', ttsProvider) }, [ttsProvider])
  useEffect(() => { localStorage.setItem('ht_volume', volume.toString()) }, [volume])
  useEffect(() => { localStorage.setItem('ht_prenotify', preNotifyMinutes.toString()) }, [preNotifyMinutes])
  useEffect(() => { localStorage.setItem('ht_announce_templates', JSON.stringify(templates)) }, [templates])

  const handleToggleAlwaysOnTop = (): void => {
    const nextState = !isAlwaysOnTop
    setIsAlwaysOnTop(nextState)
    if (typeof window !== 'undefined' && window.api && window.api.setAlwaysOnTop) {
      window.api.setAlwaysOnTop(nextState)
    }
  }

  const handleToggleCompactMode = (enable: boolean): void => {
    setIsCompactMode(enable)
    if (typeof window !== 'undefined' && window.api && window.api.resizeWindow) {
      if (enable) {
        window.api.resizeWindow(330, 160)
        if (!isAlwaysOnTop) {
          setIsAlwaysOnTop(true)
          if (window.api.setAlwaysOnTop) {
            window.api.setAlwaysOnTop(true)
          }
        }
      } else {
        window.api.resizeWindow(1100, 720)
      }
    }
  }

  return (
    <MantineProvider theme={customTheme} forceColorScheme="dark">
      {isCompactMode ? (
        <div style={{ width: '100vw', height: '100vh', padding: '6px', boxSizing: 'border-box', backgroundColor: '#0f111a' }}>
          <MiniTimer
            pomodoroTitle={pomodoro.mode === 'work' ? '🔥 ポモドーロ作業' : '☕ ポモドーロ休憩'}
            pomodoroTimeString={`${pomodoro.minutes}:${pomodoro.seconds}`}
            isPomodoroRunning={pomodoro.isRunning}
            onTogglePomodoro={pomodoro.toggleTimer}
            currentTaskTitle="現在時刻"
            virtualTimeStr={virtualTimeStr}
            isAlwaysOnTop={isAlwaysOnTop}
            onToggleAlwaysOnTop={handleToggleAlwaysOnTop}
            onRestoreNormalMode={() => handleToggleCompactMode(false)}
          />
        </div>
      ) : (
        <AppShell 
          header={{ height: 68 }} 
          padding="0"
          styles={{
            root: { height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }
          }}
        >
          <AppShell.Header 
            p="md" 
            styles={{ 
              header: { 
                backgroundColor: '#151828', 
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                position: 'relative'
              } 
            }}
          >
            <Flex justify="space-between" align="center" maw={1200} mx="auto" h="100%">
              <Title order={3} c="white" style={{ display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.02em', fontWeight: 800 }}>
                <div style={{
                  width: 28,
                  height: 28,
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  borderRadius: 8
                }} />
                HyperTask
              </Title>

              <Group gap="xs" style={{ backgroundColor: '#0f111a', padding: '4px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <Button 
                  radius="xl" size="sm"
                  onClick={() => setActiveTab('scheduler')}
                  styles={{
                    root: {
                      background: activeTab === 'scheduler' ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent',
                      color: activeTab === 'scheduler' ? '#ffffff' : '#71788e',
                      border: 'none',
                      fontWeight: 700,
                      padding: '0 18px'
                    }
                  }}
                >
                  スケジューラ
                </Button>
                <Button 
                  radius="xl" size="sm"
                  onClick={() => setActiveTab('pomodoro')}
                  styles={{
                    root: {
                      background: activeTab === 'pomodoro' ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent',
                      color: activeTab === 'pomodoro' ? '#ffffff' : '#71788e',
                      border: 'none',
                      fontWeight: 700,
                      padding: '0 18px'
                    }
                  }}
                >
                  ポモドーロ
                </Button>
                <Button 
                  radius="xl" size="sm"
                  onClick={() => setActiveTab('settings')}
                  styles={{
                    root: {
                      background: activeTab === 'settings' ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent',
                      color: activeTab === 'settings' ? '#ffffff' : '#71788e',
                      border: 'none',
                      fontWeight: 700,
                      padding: '0 18px'
                    }
                  }}
                >
                  設定
                </Button>
              </Group>

              <Group gap="xs">
                <ActionIcon
                  size="md"
                  radius="md"
                  variant="subtle"
                  onClick={() => handleToggleCompactMode(true)}
                  title="ミニタイマーモードへ切替"
                  styles={{ root: { backgroundColor: '#21253a', color: '#c1c7d8', border: '1px solid rgba(255,255,255,0.08)' } }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 14 10 14 10 20"></polyline>
                    <polyline points="20 10 14 10 14 4"></polyline>
                    <line x1="14" y1="10" x2="21" y2="3"></line>
                    <line x1="3" y1="21" x2="10" y2="14"></line>
                  </svg>
                </ActionIcon>

                <ActionIcon
                  size="md"
                  radius="md"
                  variant={isAlwaysOnTop ? 'filled' : 'subtle'}
                  color={isAlwaysOnTop ? 'indigo' : 'gray'}
                  onClick={handleToggleAlwaysOnTop}
                  title={isAlwaysOnTop ? '最前面表示解除' : '常に最前面に表示'}
                  styles={{ root: { backgroundColor: isAlwaysOnTop ? undefined : '#21253a', border: '1px solid rgba(255,255,255,0.08)' } }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={isAlwaysOnTop ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="17" x2="12" y2="22"></line>
                    <path d="M5 17h14l-1.5-6H6.5L5 17z"></path>
                    <path d="M9 11V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v7"></path>
                  </svg>
                </ActionIcon>
              </Group>
            </Flex>
          </AppShell.Header>

          <AppShell.Main 
            style={{ 
              backgroundColor: '#0f111a', 
              flex: 1,
              minHeight: 0,
              padding: '16px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <div style={{ maxWidth: 1200, width: '100%', margin: '0 auto', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: activeTab === 'scheduler' ? 'flex' : 'none', flex: 1, minHeight: 0, flexDirection: 'column' }}>
                <Scheduler apiKey={apiKey} ttsProvider={ttsProvider} volume={volume} preNotifyMinutes={preNotifyMinutes} templates={templates} />
              </div>
              
              <div style={{ display: activeTab === 'pomodoro' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
                <Pomodoro ttsProvider={ttsProvider} volume={volume} preNotifyMinutes={preNotifyMinutes} templates={templates} />
              </div>
              
              <div style={{ display: activeTab === 'settings' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
                <Settings 
                  apiKey={apiKey} setApiKey={setApiKey}
                  ttsProvider={ttsProvider} setTtsProvider={setTtsProvider}
                  volume={volume} setVolume={setVolume}
                  preNotifyMinutes={preNotifyMinutes} setPreNotifyMinutes={setPreNotifyMinutes}
                  templates={templates} setTemplates={setTemplates}
                />
              </div>
            </div>
          </AppShell.Main>
        </AppShell>
      )}
    </MantineProvider>
  )
}

export default App