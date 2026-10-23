import { useState } from 'react'
import { Card, Text, Title, Button, Group, Flex, SegmentedControl, Center, Switch, NumberInput, Badge, Modal } from '@mantine/core'
import { Task } from '../types'
// usePomodoro の戻り値の型を使用するためインポート
import { usePomodoro } from '../hooks/usePomodoro'

interface PomodoroProps {
  pomodoroState: ReturnType<typeof usePomodoro>
  isDebugMode?: boolean
  tasks: Task[]
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
}

export function Pomodoro({
  pomodoroState,
  isDebugMode = false,
  tasks,
  setTasks
}: PomodoroProps) {
  const [confirmOpened, setConfirmOpened] = useState(false)

  // 親から受け取った単一のタイマー状態を展開
  const {
    minutes,
    seconds,
    isRunning,
    mode,
    workMinutes,
    breakMinutes,
    completedCycles,
    toggleTimer,
    resetTimer,
    switchMode,
    changePreset,
    debugSetTimeLeft,
    debugAddSeconds,
    autoCycleEnabled,
    setAutoCycleEnabled,
    targetCycles,
    setTargetCycles
  } = pomodoroState

  const handleStartClick = () => {
    if (!isRunning && tasks.some((t) => !t.completed)) {
      setConfirmOpened(true)
    } else {
      toggleTimer()
    }
  }

  const handleConfirmStart = () => {
    setConfirmOpened(false)
    setTasks([])
    toggleTimer()
  }

  const totalSec = mode === 'work' ? workMinutes * 60 : breakMinutes * 60
  const currentSec = parseInt(minutes, 10) * 60 + parseInt(seconds, 10)
  const progress = Math.max(0, Math.min(100, (currentSec / totalSec) * 100))

  const circleSize = 200
  const strokeWidth = 12
  const radius = (circleSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <Flex justify="center" align="center" py="xs" style={{ minHeight: '100%' }}>
      <style>{`
        @keyframes pomo-work-ring-pulse {
          0% { filter: drop-shadow(0 0 2px rgba(99, 102, 241, 0.25)); }
          50% { filter: drop-shadow(0 0 7px rgba(99, 102, 241, 0.55)); }
          100% { filter: drop-shadow(0 0 2px rgba(99, 102, 241, 0.25)); }
        }
        @keyframes pomo-break-ring-pulse {
          0% { filter: drop-shadow(0 0 2px rgba(16, 185, 129, 0.25)); }
          50% { filter: drop-shadow(0 0 7px rgba(16, 185, 129, 0.55)); }
          100% { filter: drop-shadow(0 0 2px rgba(16, 185, 129, 0.25)); }
        }
      `}</style>

      <Modal
        opened={confirmOpened}
        onClose={() => setConfirmOpened(false)}
        title="ポモドーロを開始しますか？"
        centered
        styles={{
          title: { color: 'white', fontWeight: 700 },
          content: { backgroundColor: '#151828', color: 'white' },
          header: { backgroundColor: '#151828' }
        }}
      >
        <Text size="sm" mb="lg" c="#c1c7d8">
          現在スケジューラに未完了のタスクがあります。<br />
          ポモドーロタイマーを開始すると、現在のスケジューラのタスクはすべて破棄されますがよろしいですか？
        </Text>
        <Group justify="flex-end">
          <Button
            variant="default"
            onClick={() => setConfirmOpened(false)}
            styles={{ root: { backgroundColor: '#21253a', color: 'white', border: 'none' } }}
          >
            キャンセル
          </Button>
          <Button color="red" onClick={handleConfirmStart}>
            破棄して開始
          </Button>
        </Group>
      </Modal>

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
        <Flex justify="space-between" align="center" mb="xs">
          <Text size="xs" style={{ color: '#71788e' }} fw={700} tt="uppercase" lts="0.1em">
            FOCUS SESSION
          </Text>
          <Badge variant="light" color="indigo" size="sm">
            完了セット: {completedCycles} {targetCycles > 0 ? `/ ${targetCycles}` : '(無限)'}
          </Badge>
        </Flex>

        <Title order={3} mb="md" c="white" fw={800} style={{ letterSpacing: '-0.02em' }}>
          ポモドーロタイマー
        </Title>

        <Group justify="center" gap="xs" mb="md">
          <Button size="xs" radius="xl" variant={workMinutes === 15 ? 'filled' : 'subtle'} color={workMinutes === 15 ? 'indigo' : 'gray'} onClick={() => changePreset(15, 3)}>15分 / 3分</Button>
          <Button size="xs" radius="xl" variant={workMinutes === 25 ? 'filled' : 'subtle'} color={workMinutes === 25 ? 'indigo' : 'gray'} onClick={() => changePreset(25, 5)}>25分 / 5分</Button>
          <Button size="xs" radius="xl" variant={workMinutes === 52 ? 'filled' : 'subtle'} color={workMinutes === 52 ? 'indigo' : 'gray'} onClick={() => changePreset(52, 17)}>52分 / 17分</Button>
          <Button size="xs" radius="xl" variant={workMinutes === 90 ? 'filled' : 'subtle'} color={workMinutes === 90 ? 'indigo' : 'gray'} onClick={() => changePreset(90, 20)}>90分 / 20分</Button>
        </Group>

        <SegmentedControl
          value={mode}
          onChange={(val) => switchMode(val as 'work' | 'break')}
          data={[
            { label: `🔥 作業 (${workMinutes}分)`, value: 'work' },
            { label: `☕ 休憩 (${breakMinutes}分)`, value: 'break' }
          ]}
          fullWidth
          mb="md"
          radius="xl"
          size="sm"
          styles={{
            root: { backgroundColor: '#0f111a', border: '1px solid rgba(255,255,255,0.06)', padding: '4px' },
            indicator: { background: mode === 'work' ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : '#10b981' },
            label: { color: '#ffffff', fontWeight: 700, fontSize: '0.85rem' }
          }}
        />

        <Group justify="space-between" align="center" mb="md" style={{ backgroundColor: '#0f111a', padding: '8px 16px', borderRadius: '12px' }}>
          <Switch
            label="自動で次のモードをスタート"
            checked={autoCycleEnabled}
            onChange={(e) => setAutoCycleEnabled(e.currentTarget.checked)}
            color="indigo"
            size="xs"
            styles={{ label: { color: '#c1c7d8', fontWeight: 600 } }}
          />
          <Group gap="xs" align="center">
            <Text size="xs" c="#828a9e" fw={600}>上限セット数:</Text>
            <NumberInput
              size="xs"
              value={targetCycles}
              onChange={(val) => setTargetCycles(typeof val === 'number' ? val : 0)}
              min={0}
              max={99}
              disabled={!autoCycleEnabled}
              placeholder="0 = 無限"
              styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff', width: '75px', textAlign: 'center' } }}
            />
          </Group>
        </Group>

        <Center mb="lg">
          <div style={{ position: 'relative', width: circleSize, height: circleSize }}>
            <svg width={circleSize} height={circleSize} style={{ display: 'block' }}>
              <defs>
                <linearGradient id="pomoWorkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
                <linearGradient id="pomoBreakGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>

              <circle
                cx={circleSize / 2}
                cy={circleSize / 2}
                r={radius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth={strokeWidth}
              />

              <circle
                cx={circleSize / 2}
                cy={circleSize / 2}
                r={radius}
                fill="none"
                stroke={mode === 'work' ? 'url(#pomoWorkGrad)' : 'url(#pomoBreakGrad)'}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${circleSize / 2} ${circleSize / 2})`}
                style={{
                  transition: 'stroke-dashoffset 0.4s ease',
                  animation: isRunning
                    ? mode === 'work'
                      ? 'pomo-work-ring-pulse 2.5s infinite ease-in-out'
                      : 'pomo-break-ring-pulse 2.5s infinite ease-in-out'
                    : 'none'
                }}
              />
            </svg>

            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none'
              }}
            >
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
            </div>
          </div>
        </Center>

        <Group justify="center" gap="md" mb={isDebugMode ? 'lg' : 0}>
          <Button
            size="md"
            radius="xl"
            onClick={isRunning ? toggleTimer : handleStartClick}
            styles={{
              root: {
                background: isRunning
                  ? 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)'
                  : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
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

        {isDebugMode && (
          <Card padding="sm" ta="left" styles={{ root: { backgroundColor: '#0f111a', borderRadius: '16px', border: '1px dashed rgba(255, 255, 255, 0.08)' } }}>
            <Text size="xs" style={{ color: '#71788e' }} fw={700} mb="xs">🐞 デバッグスキップ</Text>
            <Group gap="xs" mb="xs">
              {[-10, 10, 60, -60].map((sec) => (
                <Button
                  key={sec}
                  size="xs"
                  radius="xl"
                  onClick={() => debugAddSeconds(sec)}
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
              <Button size="xs" radius="xl" variant="outline" color="indigo" onClick={() => debugSetTimeLeft(5)} style={{ height: '24px', fontSize: '0.7rem' }}>
                終了5秒前へ
              </Button>
            </Group>
          </Card>
        )}
      </Card>
    </Flex>
  )
}

export default Pomodoro