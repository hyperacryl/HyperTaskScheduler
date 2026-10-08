import { useState, useEffect, type JSX } from 'react'
import '@mantine/core/styles.css'
import { MantineProvider, createTheme, AppShell, Flex, Title, Group, Button } from '@mantine/core'

import { TtsProvider } from './services/audioService'
import { Scheduler } from './components/Scheduler'
import { Pomodoro } from './components/Pomodoro'
import { Settings } from './components/Settings'

export interface AnnounceTemplates {
  taskStart: string
  taskPreNotify: string
  taskEnd: string
  pomodoroWorkStart: string
  pomodoroBreakStart: string
  pomodoroBreakEnd: string
}

const defaultTemplates: AnnounceTemplates = {
  taskStart: '{title} の時間です。始めましょう。',
  taskPreNotify: 'まもなく {title} が終了します。',
  taskEnd: '{title} の時間になりました。次のタスクへ移りましょう。',
  pomodoroWorkStart: '作業時間を開始します。集中していきましょう。',
  pomodoroBreakStart: '休憩時間です。少し体を休めましょう。',
  pomodoroBreakEnd: '休憩時間が終了しました。次の作業を始めましょう。'
}

const customTheme = createTheme({
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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

  useEffect(() => { localStorage.setItem('ht_api_key', apiKey) }, [apiKey])
  useEffect(() => { localStorage.setItem('ht_tts_provider', ttsProvider) }, [ttsProvider])
  useEffect(() => { localStorage.setItem('ht_volume', volume.toString()) }, [volume])
  useEffect(() => { localStorage.setItem('ht_prenotify', preNotifyMinutes.toString()) }, [preNotifyMinutes])
  useEffect(() => { localStorage.setItem('ht_announce_templates', JSON.stringify(templates)) }, [templates])

  return (
    <MantineProvider theme={customTheme} forceColorScheme="dark">
      <AppShell header={{ height: 68 }} padding="lg" styles={{ main: { backgroundColor: '#0f111a', height: 'calc(100vh - 68px)', overflow: 'hidden' } }}>
        <AppShell.Header 
          p="md" 
          styles={{ 
            header: { 
              backgroundColor: '#151828', 
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
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
          </Flex>
        </AppShell.Header>

        <AppShell.Main style={{ backgroundColor: '#0f111a', height: 'calc(100vh - 68px)', overflow: 'hidden' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', height: '100%', paddingTop: 8 }}>
            <div style={{ display: activeTab === 'scheduler' ? 'block' : 'none', height: '100%' }}>
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
    </MantineProvider>
  )
}

export default App