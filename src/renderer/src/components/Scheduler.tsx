import { useState, useEffect, useRef } from 'react'
import { Card, Title, Button, Textarea, Stack, Text, Group, TextInput, ActionIcon, Switch, Badge } from '@mantine/core'
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
  isDebugMode = false
}: SchedulerProps) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 仮想時間オフセット (デバッグ用)
  const [timeOffset, setTimeOffset] = useState<number>(0)
  const [virtualClockStr, setVirtualClockStr] = useState<string>('')

  // 全タスク完了の通知済みフラグ
  const allCompletedNotifiedRef = useRef<boolean>(false)

  // 開始時刻設定 (HH:mm)
  const [baseTime, setBaseTime] = useState(() => {
    const now = new Date()
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  })

  // 仮想時刻の毎秒更新
  useEffect(() => {
    const updateClock = () => {
      const vNow = new Date(Date.now() + timeOffset)
      const h = vNow.getHours().toString().padStart(2, '0')
      const m = vNow.getMinutes().toString().padStart(2, '0')
      const s = vNow.getSeconds().toString().padStart(2, '0')
      setVirtualClockStr(`${h}:${m}:${s}`)
    }
    updateClock()
    const interval = setInterval(updateClock, 1000)
    return () => clearInterval(interval)
  }, [timeOffset])

  // タイマー監視フック
  useScheduleMonitor(tasks, ttsProvider, volume, preNotifyMinutes, timeOffset, templates)

  // 全タスク完了検知
  useEffect(() => {
    if (tasks.length === 0) {
      allCompletedNotifiedRef.current = false
      return
    }

    const isAllDone = tasks.every((t) => t.completed)
    if (isAllDone && !allCompletedNotifiedRef.current) {
      allCompletedNotifiedRef.current = true
      const text =
        ttsProvider === 'voicevox_3'
          ? '本日のタスクがすべて終了したのだ！お疲れ様だったのだ！'
          : templates.allCompleted || '本日のタスクがすべて終了しました。お疲れ様でした！'
      playNotification(text, ttsProvider, volume)
    } else if (!isAllDone) {
      allCompletedNotifiedRef.current = false
    }
  }, [tasks, ttsProvider, volume, templates])

  const addMinutesToBaseTime = (minutes: number) => {
    const [h, m] = baseTime.split(':').map(Number)
    const d = new Date()
    d.setHours(h, m + minutes, 0, 0)
    const resH = d.getHours().toString().padStart(2, '0')
    const resM = d.getMinutes().toString().padStart(2, '0')
    setBaseTime(`${resH}:${resM}`)
  }

  // AIスケジュール生成
  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return
    setLoading(true)
    setError(null)

    try {
      const generated = await generateSchedule(prompt, apiKey, baseTime)
      const withBreaks = applyAutoBreaks(generated, autoBreakEnabled, breakMinutes)
      setTasks(withBreaks)
      allCompletedNotifiedRef.current = false
    } catch (err: any) {
      setError(err.message || 'スケジュールの生成に失敗しました。')
    } finally {
      setLoading(false)
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

  // 現在実行中のタスク判定 (ハイライト用)
  const nowHHMM = virtualClockStr ? virtualClockStr.substring(0, 5) : ''

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '16px', flex: 1, minHeight: 0 }}>
      {/* 左パネル: APP CLOCK, GENERATOR, デバッグスキップ */}
      <Stack gap="md" style={{ overflowY: 'auto' }}>
        {/* 1. APP CLOCK (現在時刻ボタンを削除) */}
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
              onChange={(e) => setBaseTime(e.target.value)}
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
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', fontWeight: 700 }}
          >
            ✨ スケジュールを自動生成 (Ctrl+Enter)
          </Button>
        </Card>

        {/* 3. デバッグスキップ (isDebugModeが有効時のみ表示) */}
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

                return (
                  <Card
                    key={task.id}
                    padding="sm"
                    styles={{
                      root: {
                        backgroundColor: isActive
                          ? 'rgba(99, 102, 241, 0.18)'
                          : task.isBreak
                          ? 'rgba(16, 185, 129, 0.08)'
                          : '#21253a',
                        borderColor: isActive
                          ? '#818cf8'
                          : task.isBreak
                          ? 'rgba(16, 185, 129, 0.2)'
                          : 'rgba(255, 255, 255, 0.05)',
                        borderWidth: isActive ? '2px' : '1px',
                        boxShadow: isActive ? '0 0 16px rgba(129, 140, 248, 0.45)' : 'none',
                        opacity: task.completed ? 0.4 : 1,
                        transition: 'all 0.25s ease'
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
                            {isActive && (
                              <Badge size="xs" variant="gradient" gradient={{ from: 'indigo', to: 'violet' }}>
                                実行中
                              </Badge>
                            )}
                          </Group>
                          <Text size="xs" c="#828a9e">
                            {task.startTime} - {task.endTime} ({task.estimatedMinutes}分)
                          </Text>
                        </div>
                      </Group>

                      <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleDeleteTask(task.id)}>
                        ✕
                      </ActionIcon>
                    </Group>
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