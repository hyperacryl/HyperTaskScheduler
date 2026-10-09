import { useState, useEffect } from 'react'
import { Card, Title, Button, Textarea, Stack, Text, Group, TextInput, ActionIcon, Switch } from '@mantine/core'
import { generateSchedule } from '../services/aiService'
import { Task, AnnounceTemplates } from '../types'
import { TtsProvider } from '../services/audioService'
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
  breakMinutes = 5
}: SchedulerProps) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 仮想時間オフセット (デバッグ検証用, ms)
  const [timeOffset, setTimeOffset] = useState<number>(0)
  const [virtualClockStr, setVirtualClockStr] = useState<string>('')

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

  // リアルタイムタイマー監視フック (timeOffset も正確に渡します)
  useScheduleMonitor(tasks, ttsProvider, volume, preNotifyMinutes, timeOffset, templates)

  // 開始時刻コントロール
  const setBaseTimeToNow = () => {
    const vNow = new Date(Date.now() + timeOffset)
    const h = vNow.getHours().toString().padStart(2, '0')
    const m = vNow.getMinutes().toString().padStart(2, '0')
    setBaseTime(`${h}:${m}`)
  }

  const addMinutesToBaseTime = (minutes: number) => {
    const [h, m] = baseTime.split(':').map(Number)
    const d = new Date()
    d.setHours(h, m + minutes, 0, 0)
    const resH = d.getHours().toString().padStart(2, '0')
    const resM = d.getMinutes().toString().padStart(2, '0')
    setBaseTime(`${resH}:${resM}`)
  }

  // AIスケジュール生成 (Ctrl+Enter 対応)
  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return
    setLoading(true)
    setError(null)

    try {
      const generated = await generateSchedule(prompt, apiKey, baseTime)
      const withBreaks = applyAutoBreaks(generated, autoBreakEnabled, breakMinutes)
      setTasks(withBreaks)
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

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '16px', flex: 1, minHeight: 0 }}>
      {/* 左パネル: APP CLOCK, GENERATOR, 🐛デバッグ微調整 */}
      <Stack gap="md" style={{ overflowY: 'auto' }}>
        {/* 1. APP CLOCK */}
        <Card padding="md" styles={{ root: { backgroundColor: '#151828', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' } }}>
          <Text size="10px" fw={700} c="#828a9e" style={{ letterSpacing: '0.05em' }}>APP CLOCK</Text>
          <Text fw={900} style={{ fontSize: '36px', color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.1 }} my="xs">
            {virtualClockStr || '00:00:00'}
          </Text>

          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#c1c7d8">開始時刻:</Text>
            <Group gap="xs">
              <TextInput
                type="time"
                value={baseTime}
                onChange={(e) => setBaseTime(e.target.value)}
                size="xs"
                styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff', width: '90px' } }}
              />
              <Button size="xs" variant="subtle" color="indigo" onClick={setBaseTimeToNow} style={{ height: '30px' }}>
                現在時刻
              </Button>
            </Group>
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

        {/* 3. デバッグ微調整 */}
        <Card padding="md" styles={{ root: { backgroundColor: '#151828', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' } }}>
          <Text size="xs" fw={700} c="#c1c7d8" mb="xs">🐛 デバッグ微調整</Text>
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
              tasks.map((task) => (
                <Card
                  key={task.id}
                  padding="sm"
                  styles={{
                    root: {
                      backgroundColor: task.isBreak ? 'rgba(99, 102, 241, 0.08)' : '#21253a',
                      borderColor: task.isBreak ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      opacity: task.completed ? 0.5 : 1
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
                        <Text size="sm" fw={700} c={task.isBreak ? '#818cf8' : 'white'} style={{ textDecoration: task.completed ? 'line-through' : 'none' }}>
                          {task.title}
                        </Text>
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
              ))
            )}
          </Stack>
        </div>
      </Card>
    </div>
  )
}