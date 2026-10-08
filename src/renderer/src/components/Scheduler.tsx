import { useState, useEffect, useRef } from 'react'
import type { JSX, KeyboardEvent } from 'react'
import { Card, Text, Title, Button, Textarea, Checkbox, Flex, Stack, Badge, Group, Alert, TextInput } from '@mantine/core'
import { generateSchedule } from '../services/aiService'
import { useScheduleMonitor } from '../hooks/useScheduleMonitor'
import { Task, type AnnounceTemplates } from '../types'
import { TtsProvider } from '../services/audioService'

interface SchedulerProps {
  apiKey: string
  ttsProvider: TtsProvider
  volume: number
  preNotifyMinutes: number
  templates: AnnounceTemplates
}

export function Scheduler({
  apiKey,
  ttsProvider,
  volume,
  preNotifyMinutes,
  templates
}: SchedulerProps): JSX.Element {
  const [taskInput, setTaskInput] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [timeOffset, setTimeOffset] = useState<number>(0)
  const [virtualTimeStr, setVirtualTimeStr] = useState<string>('')

  const [baseTime, setBaseTime] = useState<string>(() => {
    const now = new Date()
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  })
  const [tasks, setTasks] = useState<Task[]>([])
  const [isGenerating, setIsGenerating] = useState<boolean>(false)

  useEffect(() => {
    const intervalId = setInterval(() => {
      const virtualNow = new Date(Date.now() + timeOffset)
      const h = virtualNow.getHours().toString().padStart(2, '0')
      const m = virtualNow.getMinutes().toString().padStart(2, '0')
      const s = virtualNow.getSeconds().toString().padStart(2, '0')
      setVirtualTimeStr(`${h}:${m}:${s}`)
    }, 1000)
    return () => clearInterval(intervalId)
  }, [timeOffset])

  useScheduleMonitor(tasks, ttsProvider, volume, preNotifyMinutes, timeOffset, templates)

  const handleSetNow = (): void => {
    const virtualNow = new Date(Date.now() + timeOffset)
    setBaseTime(`${virtualNow.getHours().toString().padStart(2, '0')}:${virtualNow.getMinutes().toString().padStart(2, '0')}`)
  }

  const addOffsetSeconds = (seconds: number): void => {
    setTimeOffset((prev) => prev + seconds * 1000)
  }

  const resetOffset = (): void => {
    setTimeOffset(0)
  }

  const handleGenerate = async (): Promise<void> => {
    if (!taskInput.trim() || isGenerating) return
    setErrorMessage('')
    try {
      setIsGenerating(true)
      const newTasks = await generateSchedule(taskInput, apiKey, baseTime)
      setTasks(newTasks)
      setTaskInput('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'エラーが発生しました。')
    } finally {
      setIsGenerating(false)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      void handleGenerate()
    }
  }

  return (
    <Flex 
      gap="md" 
      style={{ 
        flex: 1,
        width: '100%', 
        minHeight: 0,
        fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' 
      }}
    >
      <div style={{ width: '380px', flexShrink: 0 }}>
        <Stack gap="sm">
          <Card padding="16px" styles={{ root: { backgroundColor: '#151828', borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.08)', transition: 'none' } }}>
            <Flex justify="space-between" align="center" mb="2px">
              <Text size="xs" style={{ color: '#71788e' }} fw={800} tt="uppercase">APP CLOCK</Text>
              <Group gap="xs" align="center">
                <Text size="xs" style={{ color: '#71788e' }} fw={700}>開始:</Text>
                <TextInput 
                  type="time" 
                  value={baseTime} 
                  onChange={(e) => setBaseTime(e.target.value)} 
                  radius="md"
                  size="xs"
                  w={90}
                  tabIndex={2}
                  styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff', fontWeight: 700, padding: '2px 6px' } }}
                />
                <Button size="xs" radius="md" variant="subtle" color="gray" p={0} onClick={handleSetNow} tabIndex={3} style={{ fontSize: '0.75rem', textDecoration: 'underline' }}>
                  現在時刻
                </Button>
              </Group>
            </Flex>

            <Text 
              fw={800} 
              c="white" 
              style={{ 
                fontSize: '2.5rem', 
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
              }}
            >
              {virtualTimeStr || '--:--:--'}
            </Text>
          </Card>

          <Card padding="16px" styles={{ root: { backgroundColor: '#151828', borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.08)', transition: 'none' } }}>
            <Text size="xs" style={{ color: '#71788e' }} fw={800} tt="uppercase" mb="xs">GENERATOR</Text>
            <Title order={5} mb="xs" c="white" fw={800}>タスク生成</Title>
            <Stack gap="xs">
              <Textarea
                ref={textareaRef}
                value={taskInput}
                onChange={(e) => { 
                  setTaskInput(e.target.value)
                  if (errorMessage) setErrorMessage('') 
                }}
                onKeyDown={handleKeyDown}
                placeholder="例: 会議の資料作成、メール返信3件、経費精算 (Ctrl+Enterで生成)"
                minRows={3}
                maxRows={3}
                radius="md"
                size="xs"
                tabIndex={1}
                autoFocus
                styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
              />
              {errorMessage && <Alert color="red" title="エラー" radius="md" p="xs">{errorMessage}</Alert>}
              
              <Button 
                size="xs"
                radius="xl"
                onClick={() => { void handleGenerate() }} 
                loading={isGenerating}
                w="100%"
                tabIndex={4}
                styles={{ 
                  root: { 
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    border: 'none',
                    height: '38px',
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
                  },
                  label: { fontWeight: 700, fontSize: '0.85rem' }
                }}
              >
                ✨ スケジュールを自動生成 (Ctrl+Enter)
              </Button>
            </Stack>
          </Card>

          <Card padding="sm" styles={{ root: { backgroundColor: '#0f111a', borderRadius: '16px', border: '1px dashed rgba(255, 255, 255, 0.08)', transition: 'none' } }}>
            <Text size="xs" style={{ color: '#71788e' }} fw={700} mb="xs">🐞 デバッグ微調整</Text>
            <Group mb="xs" gap="xs">
              {[-10, 10, 60, -60, 300].map((sec) => (
                <Button 
                  key={sec} 
                  size="xs" 
                  radius="xl" 
                  tabIndex={-1}
                  onClick={() => addOffsetSeconds(sec)}
                  styles={{
                    root: {
                      backgroundColor: '#21253a',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#c1c7d8',
                      padding: '0 8px',
                      height: '24px'
                    },
                    label: { fontWeight: 700, fontSize: '0.72rem' }
                  }}
                >
                  {sec > 0 ? `+${sec < 60 ? sec + '秒' : sec / 60 + '分'}` : `${sec > -60 ? sec + '秒' : sec / 60 + '分'}`}
                </Button>
              ))}
            </Group>
            <Group gap="xs">
              <Button 
                size="xs" 
                radius="xl" 
                tabIndex={-1}
                onClick={resetOffset}
                styles={{
                  root: { backgroundColor: '#21253a', border: '1px solid rgba(255,255,255,0.08)', color: '#828a9e', height: '24px', padding: '0 8px' },
                  label: { fontSize: '0.72rem', fontWeight: 700 }
                }}
              >
                現実時間に戻す
              </Button>
            </Group>
          </Card>
        </Stack>
      </div>

      <div style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Card 
          padding="20px" 
          styles={{ 
            root: { 
              backgroundColor: '#151828', 
              borderRadius: '18px', 
              border: '1px solid rgba(255, 255, 255, 0.08)', 
              height: '100%',
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              transition: 'none'
            } 
          }}
        >
          <Text size="xs" style={{ color: '#71788e' }} fw={800} tt="uppercase" lts="0.08em" mb="2px">TIMELINE</Text>
          <Title order={4} mb="sm" c="white" fw={800}>タイムスケジュール</Title>
          
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: '6px' }}>
            {tasks.length === 0 ? (
              <Flex justify="center" align="center" h="100%" direction="column" gap="xs">
                <Text size="sm" style={{ color: '#71788e' }}>左のフォームからタスクを入力して生成してください</Text>
              </Flex>
            ) : (
              <Stack gap="xs">
                {tasks.map((task) => (
                  <Card key={task.id} p="sm" radius="md" styles={{ root: { backgroundColor: '#21253a', border: '1px solid rgba(255,255,255,0.05)', opacity: task.completed ? 0.4 : 1, transition: 'none' } }}>
                    <Flex align="center" gap="sm">
                      <Checkbox 
                        size="sm" 
                        checked={task.completed} 
                        onChange={() => setTasks(tasks.map((t) => t.id === task.id ? { ...t, completed: !t.completed } : t))} 
                        color="indigo" 
                      />
                      <Badge color="indigo" variant="light" size="md" radius="sm">{task.startTime} - {task.endTime}</Badge>
                      <Text style={{ textDecoration: task.completed ? 'line-through' : 'none' }} fw={700} c="white" size="sm" flex={1}>{task.title}</Text>
                      <Badge color="gray" variant="filled" size="sm">{task.estimatedMinutes}分</Badge>
                    </Flex>
                  </Card>
                ))}
              </Stack>
            )}
          </div>
        </Card>
      </div>
    </Flex>
  )
}

export default Scheduler