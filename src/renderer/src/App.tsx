import { useState, useEffect } from 'react'
import '@mantine/core/styles.css'
import { MantineProvider, createTheme, AppShell, Flex, Title, Group, Button, ActionIcon } from '@mantine/core'

import { TtsProvider, setLiveVolume, setTtsOptions } from './services/audioService'
import { Scheduler } from './components/Scheduler'
import { Pomodoro } from './components/Pomodoro'
import { Settings } from './components/Settings'
import { MiniTimer } from './components/MiniTimer'
import { usePomodoro } from './hooks/usePomodoro'
import { Task, AnnounceTemplates } from './types'

export const defaultStandardTemplates: AnnounceTemplates = {
  taskStart: '{title} の開始時刻になりました。',
  taskPreEnd: '終了まであと {minutes} 分です。仕上げに入りましょう。',
  taskEnd: '{title} の終了時刻です。',
  breakStart: '{minutes} 分間の休憩です。作業を止めてリフレッシュしてください。',
  breakPreEnd: 'まもなく休憩が終了します。次のタスクの準備をしましょう。',
  allCompleted: '本日のタスクがすべて終了しました。お疲れ様でした。',

  pomodoroWorkStart: 'ポモドーロ作業を開始します。',
  pomodoroWorkPreEnd: '作業終了まであと {minutes} 分です。仕上げに入りましょう。',
  pomodoroBreakStart: '{minutes} 分間の休憩です。作業を止めてリフレッシュしてください。',
  pomodoroBreakPreEnd: 'まもなく休憩が終了します。次の作業の準備をしましょう。',
  pomodoroAllCompleted: 'すべてのセットが終了しました。お疲れ様でした。'
}

export const defaultZundamonTemplates: AnnounceTemplates = {
  taskStart: '{title} の時間なのだ。張り切っていくのだ！',
  taskPreEnd: '{title} 終了まであと {minutes} 分なのだ。キリのいいところでまとめるのだ。',
  taskEnd: '{title} の終了時刻なのだ。ひとまず作業完了なのだ。',
  breakStart: '{minutes} 分間の休憩時間なのだ。しっかり休むのだ。',
  breakPreEnd: 'まもなく休憩終了なのだ。',
  allCompleted: '予定していたタスクがすべて終わったのだ！お疲れ様なのだ！',

  pomodoroWorkStart: 'ポモドーロ作業を始めるのだ！集中していくのだ！',
  pomodoroWorkPreEnd: '作業終了まであと {minutes} 分なのだ。キリのいいところでまとめるのだ。',
  pomodoroBreakStart: '{minutes} 分間の休憩時間なのだ。しっかり休むのだ！',
  pomodoroBreakPreEnd: 'まもなく休憩終了なのだ。次の準備をするのだ！',
  pomodoroAllCompleted: '予定していた全セットが終了したのだ！お疲れ様だったのだ！'
}

const customTheme = createTheme({
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
})

type TabType = 'scheduler' | 'pomodoro' | 'settings'

const validGoogleVoices = ['ja-JP-Neural2-B', 'ja-JP-Neural2-C']

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('scheduler')

  const [googleTtsApiKey, setGoogleTtsApiKey] = useState<string>(() => localStorage.getItem('ht_google_tts_api_key') || '')
  
  const [ttsProvider, setTtsProvider] = useState<TtsProvider>(() => {
    const saved = localStorage.getItem('ht_tts_provider') as TtsProvider
    return saved || 'voicevox_3'
  })

  const [googleVoiceName, setGoogleVoiceName] = useState<string>(() => {
    const saved = localStorage.getItem('ht_google_voice_name')
    return saved && validGoogleVoices.includes(saved) ? saved : 'ja-JP-Neural2-B'
  })
  
  const [googlePitch, setGooglePitch] = useState<number>(() => {
    const saved = localStorage.getItem('ht_google_pitch')
    return saved ? parseFloat(saved) : 0
  })

  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem('ht_volume')
    return saved ? parseInt(saved, 10) : 50
  })

  const [preNotifyMinutes, setPreNotifyMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('ht_prenotify')
    return saved ? parseInt(saved, 10) : 5
  })

  const [autoBreakEnabled, setAutoBreakEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('ht_auto_break_enabled')
    return saved !== null ? saved === 'true' : true
  })

  const [breakMinutes, setBreakMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('ht_break_minutes')
    return saved ? parseInt(saved, 10) : 5
  })

  const [preBreakNotifyMinutes, setPreBreakNotifyMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('ht_pre_break_notify_minutes')
    return saved ? parseInt(saved, 10) : 1
  })

  const [isDebugMode, setIsDebugMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('ht_is_debug')
    return saved !== null ? saved === 'true' : true
  })

  const [autoCompleteTask, setAutoCompleteTask] = useState<boolean>(() => {
    const saved = localStorage.getItem('ht_auto_complete_enabled')
    return saved !== null ? saved === 'true' : false
  })

  const [pomodoroAutoCycle, setPomodoroAutoCycle] = useState<boolean>(() => {
    const saved = localStorage.getItem('ht_pomo_auto_cycle')
    return saved !== null ? saved === 'true' : true
  })

  const [pomodoroTargetCycles, setPomodoroTargetCycles] = useState<number>(() => {
    const saved = localStorage.getItem('ht_pomo_target_cycles')
    return saved ? parseInt(saved, 10) : 0
  })

  const [standardTemplates, setStandardTemplates] = useState<AnnounceTemplates>(() => {
    const saved = localStorage.getItem('ht_announce_templates_standard')
    if (!saved) return defaultStandardTemplates
    try {
      return { ...defaultStandardTemplates, ...JSON.parse(saved) }
    } catch {
      return defaultStandardTemplates
    }
  })

  const [zundamonTemplates, setZundamonTemplates] = useState<AnnounceTemplates>(() => {
    const saved = localStorage.getItem('ht_announce_templates_zundamon')
    if (!saved) return defaultZundamonTemplates
    try {
      return { ...defaultZundamonTemplates, ...JSON.parse(saved) }
    } catch {
      return defaultZundamonTemplates
    }
  })

  const [tasks, setTasks] = useState<Task[]>([])
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState<boolean>(false)
  const [isCompactMode, setIsCompactMode] = useState<boolean>(false)
  const [virtualTimeStr, setVirtualTimeStr] = useState<string>('')
  
  // ★ APP CLOCK (スケジューラのスキップ時間) を親で一元管理
  const [timeOffset, setTimeOffset] = useState<number>(0)

  // 仮想時刻の計算 (timeOffsetを反映)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date(Date.now() + timeOffset)
      const h = now.getHours().toString().padStart(2, '0')
      const m = now.getMinutes().toString().padStart(2, '0')
      const s = now.getSeconds().toString().padStart(2, '0')
      setVirtualTimeStr(`${h}:${m}:${s}`)
    }, 1000)
    return () => clearInterval(interval)
  }, [timeOffset])

  useEffect(() => { localStorage.setItem('ht_google_tts_api_key', googleTtsApiKey) }, [googleTtsApiKey])
  useEffect(() => { localStorage.setItem('ht_google_voice_name', googleVoiceName) }, [googleVoiceName])
  useEffect(() => { localStorage.setItem('ht_google_pitch', googlePitch.toString()) }, [googlePitch])
  useEffect(() => { localStorage.setItem('ht_tts_provider', ttsProvider) }, [ttsProvider])
  useEffect(() => { localStorage.setItem('ht_is_debug', isDebugMode.toString()) }, [isDebugMode])
  useEffect(() => { localStorage.setItem('ht_auto_complete_enabled', autoCompleteTask.toString()) }, [autoCompleteTask])
  useEffect(() => { localStorage.setItem('ht_pomo_auto_cycle', pomodoroAutoCycle.toString()) }, [pomodoroAutoCycle])
  useEffect(() => { localStorage.setItem('ht_pomo_target_cycles', pomodoroTargetCycles.toString()) }, [pomodoroTargetCycles])

  useEffect(() => { 
    localStorage.setItem('ht_volume', volume.toString())
    setLiveVolume(volume)
  }, [volume])

  useEffect(() => { localStorage.setItem('ht_prenotify', preNotifyMinutes.toString()) }, [preNotifyMinutes])
  useEffect(() => { localStorage.setItem('ht_auto_break_enabled', autoBreakEnabled.toString()) }, [autoBreakEnabled])
  useEffect(() => { localStorage.setItem('ht_break_minutes', breakMinutes.toString()) }, [breakMinutes])
  useEffect(() => { localStorage.setItem('ht_pre_break_notify_minutes', preBreakNotifyMinutes.toString()) }, [preBreakNotifyMinutes])

  useEffect(() => {
    localStorage.setItem('ht_announce_templates_standard', JSON.stringify(standardTemplates))
  }, [standardTemplates])

  useEffect(() => {
    localStorage.setItem('ht_announce_templates_zundamon', JSON.stringify(zundamonTemplates))
  }, [zundamonTemplates])

  useEffect(() => {
    setTtsOptions({
      googleTtsApiKey,
      googleVoiceName,
      googlePitch
    })
  }, [googleTtsApiKey, googleVoiceName, googlePitch])

  const isZundamon = ttsProvider === 'voicevox_3'
  const activeTemplates = isZundamon ? zundamonTemplates : standardTemplates

  // ★ ポモドーロのタイマー状態を親で1つだけ生成・管理する
  const pomodoroState = usePomodoro(ttsProvider, volume, preNotifyMinutes, activeTemplates, {
    autoCycleEnabled: pomodoroAutoCycle,
    targetCycles: pomodoroTargetCycles
  })

  const currentTaskTitle = (() => {
    if (!virtualTimeStr || tasks.length === 0) return '予定なし'
    const nowHHMM = virtualTimeStr.substring(0, 5)
    const activeTask = tasks.find((t) => t.startTime <= nowHHMM && nowHHMM < t.endTime)
    return activeTask ? activeTask.title : '進行中のタスクなし'
  })()

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
        window.api.resizeWindow(340, 220)
      } else {
        window.api.resizeWindow(1100, 880)
      }
    }
  }

  return (
    <MantineProvider theme={customTheme} forceColorScheme="dark">
      {/* 
        ★ コンポーネント破棄を防ぐため、display: none で画面を切り替える 
        これにより、裏側に回った状態のポモドーロやスケジューラーの時間が完全に維持される
      */}
      
      {/* --- ミニタイマーモード画面 --- */}
      <div style={{ display: isCompactMode ? 'block' : 'none', width: '100vw', height: '100vh', backgroundColor: '#0f111a', boxSizing: 'border-box' }}>
        <MiniTimer
          activeTab={activeTab === 'settings' ? 'scheduler' : activeTab}
          onChangeTab={(tab) => setActiveTab(tab)}
          pomodoroTitle={pomodoroState.mode === 'work' ? '🔥 ポモドーロ作業' : '☕ ポモドーロ休憩'}
          pomodoroTimeString={`${pomodoroState.minutes}:${pomodoroState.seconds}`}
          isPomodoroRunning={pomodoroState.isRunning}
          onTogglePomodoro={pomodoroState.toggleTimer}
          currentTaskTitle={currentTaskTitle}
          virtualTimeStr={virtualTimeStr}
          isAlwaysOnTop={isAlwaysOnTop}
          onToggleAlwaysOnTop={handleToggleAlwaysOnTop}
          onRestoreNormalMode={() => handleToggleCompactMode(false)}
        />
      </div>
      
      {/* --- 通常モード画面 --- */}
      <div style={{ display: !isCompactMode ? 'block' : 'none' }}>
        <AppShell 
          header={{ height: 68 }} 
          padding="0"
          styles={{ root: { height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}
        >
          <AppShell.Header 
            p="md" 
            styles={{ header: { backgroundColor: '#151828', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', position: 'relative' } }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', width: '100%', maxWidth: 1200, margin: '0 auto', height: '100%' }}>
              <Flex align="center" justify="flex-start">
                <Title order={3} c="white" style={{ display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.02em', fontWeight: 800 }}>
                  <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', borderRadius: 8 }} />
                  HyperTask
                </Title>
              </Flex>

              <Flex align="center" justify="center">
                <Group gap="xs" style={{ backgroundColor: '#0f111a', padding: '4px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <Button radius="xl" size="sm" onClick={() => setActiveTab('scheduler')} styles={{ root: { background: activeTab === 'scheduler' ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent', color: activeTab === 'scheduler' ? '#ffffff' : '#71788e', border: 'none', fontWeight: 700, padding: '0 18px' } }}>スケジューラ</Button>
                  <Button radius="xl" size="sm" onClick={() => setActiveTab('pomodoro')} styles={{ root: { background: activeTab === 'pomodoro' ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent', color: activeTab === 'pomodoro' ? '#ffffff' : '#71788e', border: 'none', fontWeight: 700, padding: '0 18px' } }}>ポモドーロ</Button>
                  <Button radius="xl" size="sm" onClick={() => setActiveTab('settings')} styles={{ root: { background: activeTab === 'settings' ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent', color: activeTab === 'settings' ? '#ffffff' : '#71788e', border: 'none', fontWeight: 700, padding: '0 18px' } }}>設定</Button>
                </Group>
              </Flex>

              <Flex align="center" justify="flex-end" gap="xs">
                <ActionIcon size="md" radius="md" variant="subtle" onClick={() => handleToggleCompactMode(true)} title="ミニタイマーモードへ切替" styles={{ root: { backgroundColor: '#21253a', color: '#c1c7d8', border: '1px solid rgba(255,255,255,0.08)' } }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
                </ActionIcon>
                <ActionIcon size="md" radius="md" variant={isAlwaysOnTop ? 'filled' : 'subtle'} color={isAlwaysOnTop ? 'indigo' : 'gray'} onClick={handleToggleAlwaysOnTop} title={isAlwaysOnTop ? '最前面表示解除' : '常に最前面に表示'} styles={{ root: { backgroundColor: isAlwaysOnTop ? undefined : '#21253a', border: '1px solid rgba(255,255,255,0.08)' } }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={isAlwaysOnTop ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14l-1.5-6H6.5L5 17z"></path><path d="M9 11V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v7"></path></svg>
                </ActionIcon>
              </Flex>
            </div>
          </AppShell.Header>

          <AppShell.Main style={{ backgroundColor: '#0f111a', flex: 1, minHeight: 0, padding: '16px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ maxWidth: 1200, width: '100%', margin: '0 auto', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: activeTab === 'scheduler' ? 'flex' : 'none', flex: 1, minHeight: 0, flexDirection: 'column' }}>
                <Scheduler 
                  ttsProvider={ttsProvider} 
                  volume={volume} 
                  preNotifyMinutes={preNotifyMinutes} 
                  templates={activeTemplates} 
                  tasks={tasks} 
                  setTasks={setTasks} 
                  autoBreakEnabled={autoBreakEnabled}
                  breakMinutes={breakMinutes}
                  isDebugMode={isDebugMode}
                  autoCompleteTask={autoCompleteTask}
                  timeOffset={timeOffset}           // ★ 親から仮想時刻のズレを渡す
                  setTimeOffset={setTimeOffset}     // ★ 親へデバッグスキップを反映させる
                  virtualTimeStr={virtualTimeStr}   // ★ 親で計算された仮想時刻を使用する
                />
              </div>
              
              <div style={{ display: activeTab === 'pomodoro' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
                <Pomodoro 
                  pomodoroState={pomodoroState}     // ★ 親で管理しているタイマー状態を渡す
                  isDebugMode={isDebugMode}
                  tasks={tasks}
                  setTasks={setTasks}
                />
              </div>
              
              <div style={{ display: activeTab === 'settings' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
                <Settings 
                  googleTtsApiKey={googleTtsApiKey} setGoogleTtsApiKey={setGoogleTtsApiKey}
                  googleVoiceName={googleVoiceName} setGoogleVoiceName={setGoogleVoiceName}
                  googlePitch={googlePitch} setGooglePitch={setGooglePitch}
                  ttsProvider={ttsProvider} setTtsProvider={setTtsProvider}
                  volume={volume} setVolume={setVolume}
                  preNotifyMinutes={preNotifyMinutes} setPreNotifyMinutes={setPreNotifyMinutes}
                  autoBreakEnabled={autoBreakEnabled} setAutoBreakEnabled={setAutoBreakEnabled}
                  breakMinutes={breakMinutes} setBreakMinutes={setBreakMinutes}
                  preBreakNotifyMinutes={preBreakNotifyMinutes} setPreBreakNotifyMinutes={setPreBreakNotifyMinutes}
                  autoCompleteTask={autoCompleteTask} setAutoCompleteTask={setAutoCompleteTask}
                  standardTemplates={standardTemplates} setStandardTemplates={setStandardTemplates}
                  zundamonTemplates={zundamonTemplates} setZundamonTemplates={setZundamonTemplates}
                  onResetStandardTemplates={() => setStandardTemplates(defaultStandardTemplates)}
                  onResetZundamonTemplates={() => setZundamonTemplates(defaultZundamonTemplates)}
                  isDebugMode={isDebugMode} setIsDebugMode={setIsDebugMode}
                  pomodoroAutoCycle={pomodoroAutoCycle} setPomodoroAutoCycle={setPomodoroAutoCycle}
                  pomodoroTargetCycles={pomodoroTargetCycles} setPomodoroTargetCycles={setPomodoroTargetCycles}
                />
              </div>
            </div>
          </AppShell.Main>
        </AppShell>
      </div>
    </MantineProvider>
  )
}

export default App