import { useState, useEffect, useRef } from 'react'
import { 
  Card, Title, Button, Textarea, Stack, Text, Group, TextInput, 
  ActionIcon, Switch, Progress 
} from '@mantine/core'
import { generateSchedule } from '../services/aiService'
import { Task, AnnounceTemplates } from '../types'
import { playNotification, TtsProvider } from '../services/audioService'
import { useScheduleMonitor } from '../hooks/useScheduleMonitor'
import { applyAutoBreaks } from '../utils/taskUtils'

interface SchedulerProps {
  apiKey: string
  ttsProvider: TtsProvider
  volume: number
  preNotifyMinutes: number
  templates: AnnounceTemplates
  tasks: Task[]
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
  autoBreakEnabled?: boolean
  breakMinutes?: number
  isDebugMode?: boolean
  autoCompleteTask?: boolean
}

export function Scheduler({
  apiKey,
  ttsProvider,
  volume,
  preNotifyMinutes,
  templates,
  tasks,
  setTasks,
  autoBreakEnabled = true,
  breakMinutes = 5,
  isDebugMode = false,
  autoCompleteTask = false
}: SchedulerProps) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [timeOffset, setTimeOffset] = useState<number>(0)
  const [virtualClockStr, setVirtualClockStr] = useState<string>('')
  const [isBaseTimeCustomized, setIsBaseTimeCustomized] = useState(false)
  const allCompletedNotifiedRef = useRef<boolean>(false)
  const [baseTime, setBaseTime] = useState('')

  useEffect(() => {
    const updateClock = () => {
      const vNow = new Date(Date.now() + timeOffset)
      const h = vNow.getHours().toString().padStart(2, '0')
      const m = vNow.getMinutes().toString().padStart(2, '0')
      const s = vNow.getSeconds().toString().padStart(2, '0')
      const currentHHMMSS = `${h}:${m}:${s}`
      setVirtualClockStr(currentHHMMSS)

      if (!isBaseTimeCustomized) {
        setBaseTime(`${h}:${m}`)
      }
    }
    updateClock()
    const interval = setInterval(updateClock, 1000)
    return () => clearInterval(interval)
  }, [timeOffset, isBaseTimeCustomized])

  const handleAutoTaskComplete = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: true } : t))
    )
  }

  useScheduleMonitor(
    tasks,
    ttsProvider,
    volume,
    preNotifyMinutes,
    timeOffset,
    templates,
    autoCompleteTask,
    handleAutoTaskComplete
  )

  useEffect(() => {
    if (tasks.length === 0) {
      allCompletedNotifiedRef.current = false
      return
    }

    const isAllDone = tasks.every((t) => t.completed)
    if (isAllDone && !allCompletedNotifiedRef.current) {
      allCompletedNotifiedRef.current = true
      const text = templates.allCompleted || '本日のタスクがすべて終了しました。お疲れ様でした。'
      playNotification(text, ttsProvider, volume)
    } else if (!isAllDone) {
      allCompletedNotifiedRef.current = false
    }
  }, [tasks, ttsProvider, volume, templates])

  const addMinutesToBaseTime = (minutes: number) => {
    setIsBaseTimeCustomized(true)
    const [h, m] = (baseTime || '00:00').split(':').map(Number)
    const d = new Date()
    d.setHours(h, m + minutes, 0, 0)
    const resH = d.getHours().toString().padStart(2, '0')
    const resM = d.getMinutes().toString().padStart(2, '0')
    setBaseTime(`${resH}:${resM}`)
  }

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return
    setLoading(true)
    setError(null)

    const vNow = new Date(Date.now() + timeOffset)
    const curH = vNow.getHours().toString().padStart(2, '0')
    const curM = vNow.getMinutes().toString().padStart(2, '0')
    const effectiveBaseTime = isBaseTimeCustomized ? baseTime : `${curH}:${curM}`

    try {
      const generated = await generateSchedule(prompt, apiKey, effectiveBaseTime)
      const withBreaks = applyAutoBreaks(generated, autoBreakEnabled, breakMinutes)
      setTasks(withBreaks)
      allCompletedNotifiedRef.current = false
      setIsBaseTimeCustomized(false)
    } catch (err: any) {
      setError(err.message || 'スケジュールの生成に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  const handleSetTestSchedule = () => {
    const vNow = new Date(Date.now() + timeOffset)
    const curH = vNow.getHours().toString().padStart(2, '0')
    const curM = vNow.getMinutes().toString().padStart(2, '0')
    const startHHMM = `${curH}:${curM}`

    const addMins = (hhmm: string, mins: number) => {
      const [h, m] = hhmm.split(':').map(Number)
      const d = new Date()
      d.setHours(h, m + mins, 0, 0)
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
    }

    const t1End = addMins(startHHMM, 2)
    const t2End = addMins(t1End, 2)

    const rawTestTasks: Task[] = [
      {
        id: `test-${Date.now()}-1`,
        title: '🧪 テスト作業1 (資料確認)',
        startTime: startHHMM,
        endTime: t1End,
        estimatedMinutes: 2,
        completed: false,
        isBreak: false
      },
      {
        id: `test-${Date.now()}-2`,
        title: '🧪 テスト作業2 (メール返信)',
        startTime: t1End,
        endTime: t2End,
        estimatedMinutes: 2,
        completed: false,
        isBreak: false
      }
    ]

    const withBreaks = applyAutoBreaks(rawTestTasks, autoBreakEnabled, breakMinutes)
    setTasks(withBreaks)
    allCompletedNotifiedRef.current = false
    setIsBaseTimeCustomized(false)
  }

  const handleJumpToNextNotification = () => {
    if (tasks.length === 0) return
    const vNow = new Date(Date.now() + timeOffset)

    const parseTime = (timeStr: string): number => {
      const [h, m] = timeStr.split(':').map(Number)
      const d = new Date(vNow.getFullYear(), vNow.getMonth(), vNow.getDate(), h, m, 0, 0)
      return d.getTime()
    }

    const virtualNowMs = vNow.getTime()
    const candidates: number[] = []

    tasks.forEach((task) => {
      if (task.completed || !task.startTime || !task.endTime) return
      const startMs = parseTime(task.startTime)
      let endMs = parseTime(task.endTime)
      if (endMs < startMs) endMs += 24 * 60 * 60 * 1000

      const isBreak = Boolean(task.isBreak) || task.title.includes('休憩') || task.title.toLowerCase().includes('break')

      candidates.push(startMs - 5000)

      if (!isBreak && preNotifyMinutes > 0 && task.estimatedMinutes > preNotifyMinutes) {
        candidates.push(endMs - preNotifyMinutes * 60000 - 5000)
      }

      candidates.push(endMs - 5000)
    })

    const futureCandidates = candidates
      .filter((t) => t > virtualNowMs + 1000)
      .sort((a, b) => a - b)

    if (futureCandidates.length > 0) {
      const nextTarget = futureCandidates[0]
      const newOffset = (nextTarget - 2000) - Date.now()
      setTimeOffset(newOffset)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleGenerate()
    }
  }

  const handleDeleteTask = (id: string) => {
    const updated = tasks.filter((t) => t.id !== id)
    setTasks(applyAutoBreaks(updated, autoBreakEnabled, breakMinutes))
  }

  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    )
  }

  const nowHHMM = virtualClockStr ? virtualClockStr.substring(0, 5) : ''

  const getTaskProgress = (task: Task): number => {
    if (!task.startTime || !task.endTime) return 0
    const vNow = new Date(Date.now() + timeOffset)
    const parseMs = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number)
      return new Date(vNow.getFullYear(), vNow.getMonth(), vNow.getDate(), h, m, 0, 0).getTime()
    }
    const sMs = parseMs(task.startTime)
    let eMs = parseMs(task.endTime)
    if (eMs < sMs) eMs += 24 * 60 * 60 * 1000
    const curMs = vNow.getTime()

    if (curMs <= sMs) return 0
    if (curMs >= eMs) return 100
    return Math.round(((curMs - sMs) / (eMs - sMs)) * 100)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '16px', flex: 1, minHeight: 0 }}>
      {/* 実行中タスクの枠線点滅（呼吸）アニメーション定義 */}
      <style>{`
        @keyframes task-border-pulse {
          0% { border-color: rgba(99, 102, 241, 0.3); box-shadow: 0 0 8px rgba(99, 102, 241, 0.1); }
          50% { border-color: rgba(99, 102, 241, 0.9); box-shadow: 0 0 16px rgba(99, 102, 241, 0.4); }
          100% { border-color: rgba(99, 102, 241, 0.3); box-shadow: 0 0 8px rgba(99, 102, 241, 0.1); }
        }
      `}</style>

      {/* 左パネル: APP CLOCK, GENERATOR, デバッグスキップ */}
      <Stack gap="md" style={{ overflowY: 'auto' }}>
        {/* 1. APP CLOCK */}
        <Card padding="md" styles={{ root: { backgroundColor: '#151828', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' } }}>
          <Text size="10px" fw={700} c="#828a9e" style={{ letterSpacing: '0.05em' }}>APP CLOCK</Text>
          <Text fw={900} style={{ fontSize: '36px', color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.1 }} my="xs">
            {virtualClockStr || '00:00:00'}
          </Text>

          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#c1c7d8">基準開始時刻:</Text>
            <TextInput
              type="time"
              value={baseTime}
              onChange={(e) => {
                setIsBaseTimeCustomized(true)
                setBaseTime(e.target.value)
              }}
              size="xs"
              styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff', width: '100px' } }}
            />
          </Group>

          <Group gap="4px">
            <Button size="xs" variant="light" color="gray" onClick={() => addMinutesToBaseTime(5)} style={{ flex: 1, height: '26px', fontSize: '11px', padding: 0 }}>+5分</Button>
            <Button size="xs" variant="light" color="gray" onClick={() => addMinutesToBaseTime(10)} style={{ flex: 1, height: '26px', fontSize: '11px', padding: 0 }}>+10分</Button>
            <Button size="xs" variant="light" color="gray" onClick={() => addMinutesToBaseTime(30)} style={{ flex: 1, height: '26px', fontSize: '11px', padding: 0 }}>+30分</Button>
            <Button size="xs" variant="light" color="gray" onClick={() => addMinutesToBaseTime(60)} style={{ flex: 1, height: '26px', fontSize: '11px', padding: 0 }}>+1時間</Button>
          </Group>
        </Card>

        {/* 2. GENERATOR */}
        <Card padding="md" styles={{ root: { backgroundColor: '#151828', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' } }}>
          <Text size="10px" fw={700} c="#828a9e" style={{ letterSpacing: '0.05em' }}>GENERATOR</Text>
          <Title order={5} c="white" fw={800} mb="xs">タスク生成</Title>

          <Textarea
            rows={4}
            placeholder="例: 会議の資料作成、メール返信3件、経費精算 (Ctrl+Enterで生成)"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
            mb="md"
          />

          {error && <Text size="xs" c="red" mb="xs">{error}</Text>}

          <Button
            onClick={handleGenerate}
            loading={loading}
            fullWidth
            radius="md"
            mb="xs"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', fontWeight: 700 }}
          >
            ✨ スケジュールを自動生成 (Ctrl+Enter)
          </Button>

          <Button
            onClick={handleSetTestSchedule}
            variant="outline"
            color="indigo"
            fullWidth
            radius="md"
            size="xs"
            styles={{ root: { borderColor: 'rgba(99, 102, 241, 0.4)', color: '#a5b4fc' } }}
          >
            ⚡ 検証用テストタスクを即時セット (2分×2件)
          </Button>
        </Card>

        {/* 3. デバッグスキップ */}
        {isDebugMode && (
          <Card padding="md" styles={{ root: { backgroundColor: '#151828', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' } }}>
            <Text size="xs" fw={700} c="#c1c7d8" mb="xs">🐞 デバッグスキップ</Text>
            <Group gap="4px" mb="xs">
              <Button size="xs" variant="light" color="gray" onClick={() => setTimeOffset((prev) => prev - 10000)} style={{ flex: 1, height: '26px', padding: 0 }}>-10秒</Button>
              <Button size="xs" variant="light" color="gray" onClick={() => setTimeOffset((prev) => prev + 10000)} style={{ flex: 1, height: '26px', padding: 0 }}>+10秒</Button>
              <Button size="xs" variant="light" color="gray" onClick={() => setTimeOffset((prev) => prev + 60000)} style={{ flex: 1, height: '26px', padding: 0 }}>+1分</Button>
              <Button size="xs" variant="light" color="gray" onClick={() => setTimeOffset((prev) => prev - 60000)} style={{ flex: 1, height: '26px', padding: 0 }}>-1分</Button>
              <Button size="xs" variant="light" color="gray" onClick={() => setTimeOffset((prev) => prev + 300000)} style={{ flex: 1, height: '26px', padding: 0 }}>+5分</Button>
            </Group>

            <Button
              size="xs"
              variant="light"
              color="indigo"
              fullWidth
              mb="xs"
              onClick={handleJumpToNextNotification}
              disabled={tasks.length === 0}
            >
              ⏩ 次の通知へジャンプ (2秒前へ)
            </Button>

            <Button size="xs" variant="subtle" color="gray" fullWidth onClick={() => setTimeOffset(0)}>
              現実時間に戻す
            </Button>
          </Card>
        )}
      </Stack>

      {/* 右パネル: TIMELINE タイムスケジュール */}
      <Card padding="lg" styles={{ root: { backgroundColor: '#151828', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', minHeight: 0 } }}>
        <Text size="10px" fw={700} c="#828a9e" style={{ letterSpacing: '0.05em' }}>TIMELINE</Text>
        <Title order={4} c="white" mb="md" fw={800}>タイムスケジュール</Title>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          <Stack gap="xs">
            {tasks.length === 0 ? (
              <Text size="sm" c="#828a9e" ta="center" py="xl">
                左のフォームからタスクを入力して生成してください
              </Text>
            ) : (
              tasks.map((task) => {
                const isActive = !task.completed && task.startTime <= nowHHMM && nowHHMM < task.endTime
                const progress = isActive ? getTaskProgress(task) : 0

                return (
                  <Card
                    key={task.id}
                    padding="sm"
                    styles={{
                      root: {
                        backgroundColor: isActive
                          ? 'rgba(99, 102, 241, 0.12)'
                          : task.isBreak
                          ? 'rgba(16, 185, 129, 0.08)'
                          : '#21253a',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        opacity: task.completed ? 0.38 : 1,
                        transition: 'all 0.25s ease',
                        // 実行中タスクは枠線を淡く呼吸点滅させる
                        animation: isActive ? 'task-border-pulse 2.5s infinite ease-in-out' : 'none'
                      }
                    }}
                  >
                    <Group justify="space-between" align="center">
                      <Group gap="sm">
                        <Switch
                          checked={task.completed}
                          onChange={() => handleToggleTask(task.id)}
                          color="indigo"
                        />
                        <div>
                          <Group gap="xs" align="center">
                            <Text size="sm" fw={700} c={isActive ? '#a5b4fc' : task.isBreak ? '#34d399' : 'white'} style={{ textDecoration: task.completed ? 'line-through' : 'none' }}>
                              {task.title}
                            </Text>
                          </Group>
                          <Text size="xs" c="#828a9e" mt="2px">
                            {task.startTime} - {task.endTime} ({task.estimatedMinutes}分)
                          </Text>
                        </div>
                      </Group>

                      <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleDeleteTask(task.id)}>
                        ✕
                      </ActionIcon>
                    </Group>

                    {/* 実行中タスクのリアルタイム進行度バー */}
                    {isActive && (
                      <Progress 
                        value={progress} 
                        size="xs" 
                        color="indigo" 
                        radius="xs" 
                        mt="xs"
                        styles={{ root: { backgroundColor: 'rgba(255, 255, 255, 0.08)' } }}
                      />
                    )}
                  </Card>
                )
              })
            )}
          </Stack>
        </div>
      </Card>
    </div>
  )
}