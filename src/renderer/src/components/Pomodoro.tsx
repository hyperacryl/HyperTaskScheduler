import type { JSX } from 'react'
import { usePomodoro } from '../hooks/usePomodoro'
import { TtsProvider } from '../services/audioService'
import { Card, Text, Title, Button, Group, Flex, SegmentedControl, RingProgress, Center } from '@mantine/core'
import { AnnounceTemplates } from '../App'

interface PomodoroProps {
  ttsProvider: TtsProvider
  volume: number
  preNotifyMinutes: number
  templates: AnnounceTemplates
}

export function Pomodoro({ ttsProvider, volume, preNotifyMinutes }: PomodoroProps): JSX.Element {
  const { minutes, seconds, isRunning, mode, toggleTimer, resetTimer, switchMode, debugAddSeconds } = usePomodoro(ttsProvider, volume, preNotifyMinutes)

  const totalSec = mode === 'work' ? 25 * 60 : 5 * 60
  const currentSec = parseInt(minutes, 10) * 60 + parseInt(seconds, 10)
  const progress = (currentSec / totalSec) * 100

  return (
    <Flex justify="center" align="center" py="xs" style={{ minHeight: '100%' }}>
      <Card 
        padding="28px" 
        w="100%" 
        maw={480} 
        miw={320}
        ta="center" 
        styles={{ 
          root: { 
            backgroundColor: '#151828', 
            borderRadius: '24px', 
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
          } 
        }}
      >
        <Text size="xs" style={{ color: '#71788e' }} fw={700} tt="uppercase" lts="0.1em" mb="xs">
          FOCUS SESSION
        </Text>
        <Title order={3} mb="lg" c="white" fw={800} style={{ letterSpacing: '-0.02em' }}>
          ポモドーロタイマー
        </Title>

        <SegmentedControl
          value={mode}
          onChange={(val): void => switchMode(val as 'work' | 'break')}
          data={[
            { label: '🔥 作業 (25分)', value: 'work' },
            { label: '☕ 休憩 (5分)', value: 'break' },
          ]}
          fullWidth
          mb="lg"
          radius="xl"
          size="sm"
          styles={{ 
            root: { backgroundColor: '#0f111a', border: '1px solid rgba(255,255,255,0.06)', padding: '4px' },
            indicator: { background: mode === 'work' ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : '#10b981' },
            label: { color: '#ffffff', fontWeight: 700, fontSize: '0.85rem' }
          }}
        />

        <Center mb="lg">
          <RingProgress
            size={210}
            thickness={16}
            roundCaps
            sections={[{ value: progress, color: mode === 'work' ? 'indigo.5' : 'teal.4' }]}
            rootColor="rgba(255, 255, 255, 0.05)"
            label={
              <Text 
                c="white" 
                fw={800} 
                ta="center" 
                style={{ 
                  fontSize: '2.8rem', 
                  letterSpacing: '-0.02em', 
                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}
              >
                {minutes}:{seconds}
              </Text>
            }
          />
        </Center>

        <Group justify="center" gap="md" mb="lg">
          <Button 
            size="md" 
            radius="xl"
            onClick={toggleTimer}
            styles={{ 
              root: { 
                background: isRunning ? 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                border: 'none',
                minWidth: '120px',
                height: '44px',
                boxShadow: isRunning ? '0 6px 16px rgba(239, 68, 68, 0.35)' : '0 6px 16px rgba(99, 102, 241, 0.35)'
              },
              label: { fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap' }
            }}
          >
            {isRunning ? '一時停止' : 'スタート'}
          </Button>
          <Button 
            size="md" 
            radius="xl" 
            onClick={resetTimer}
            styles={{ 
              root: { 
                backgroundColor: '#21253a', 
                border: '1px solid rgba(255, 255, 255, 0.08)',
                minWidth: '100px',
                height: '44px'
              },
              label: { color: '#ffffff', fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap' }
            }}
          >
            リセット
          </Button>
        </Group>

        <Card padding="sm" ta="left" styles={{ root: { backgroundColor: '#0f111a', borderRadius: '16px', border: '1px dashed rgba(255, 255, 255, 0.08)' } }}>
          <Text size="xs" style={{ color: '#71788e' }} fw={700} mb="xs">🐞 デバッグ微調整</Text>
          <Group gap="xs">
            {[-10, 10, 60, -60].map((sec) => (
              <Button 
                key={sec} 
                size="xs" 
                radius="xl" 
                onClick={(): void => debugAddSeconds(sec)}
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
        </Card>
      </Card>
    </Flex>
  )
}

export default Pomodoro