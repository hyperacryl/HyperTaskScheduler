import { Card, Text, Button, Group, Flex, ActionIcon, SegmentedControl } from '@mantine/core'

interface MiniTimerProps {
  activeTab: 'scheduler' | 'pomodoro'
  onChangeTab: (tab: 'scheduler' | 'pomodoro') => void

  pomodoroTitle: string
  pomodoroTimeString: string
  isPomodoroRunning: boolean
  onTogglePomodoro: () => void

  currentTaskTitle: string
  virtualTimeStr: string

  isAlwaysOnTop: boolean
  onToggleAlwaysOnTop: () => void
  onRestoreNormalMode: () => void
}

export function MiniTimer({
  activeTab,
  onChangeTab,
  pomodoroTitle,
  pomodoroTimeString,
  isPomodoroRunning,
  onTogglePomodoro,
  currentTaskTitle,
  virtualTimeStr,
  isAlwaysOnTop,
  onToggleAlwaysOnTop,
  onRestoreNormalMode
}: MiniTimerProps) {
  const timeDisplay = activeTab === 'pomodoro' ? pomodoroTimeString : (virtualTimeStr || '--:--:--')
  const titleDisplay = activeTab === 'pomodoro' ? pomodoroTitle : (currentTaskTitle || '進行中のタスクなし')

  return (
    <Card
      padding="12px"
      styles={{
        root: {
          backgroundColor: '#151828',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          userSelect: 'none',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)'
        }
      }}
    >
      <Flex justify="space-between" align="center" gap="xs">
        <SegmentedControl
          size="xs"
          radius="xl"
          value={activeTab}
          onChange={(val) => onChangeTab(val as 'scheduler' | 'pomodoro')}
          data={[
            { label: 'スケジューラ', value: 'scheduler' },
            { label: 'ポモドーロ', value: 'pomodoro' }
          ]}
          styles={{
            root: { backgroundColor: '#0f111a', border: '1px solid rgba(255,255,255,0.06)', padding: '2px' },
            indicator: { background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' },
            label: { color: '#ffffff', fontWeight: 700, fontSize: '0.68rem', padding: '2px 8px' }
          }}
        />

        <Group gap="4px">
          <ActionIcon
            size="sm"
            radius="md"
            variant="subtle"
            onClick={onRestoreNormalMode}
            title="通常表示に戻す"
            styles={{ 
              root: { 
                backgroundColor: '#21253a', 
                color: '#a0a7bc',
                border: '1px solid rgba(255,255,255,0.08)' 
              } 
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9"></polyline>
              <polyline points="9 21 3 21 3 15"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          </ActionIcon>

          <ActionIcon
            size="sm"
            radius="md"
            variant={isAlwaysOnTop ? 'filled' : 'subtle'}
            color={isAlwaysOnTop ? 'indigo' : 'gray'}
            onClick={onToggleAlwaysOnTop}
            title={isAlwaysOnTop ? '最前面表示解除' : '常に最前面に表示'}
            styles={{ 
              root: { 
                backgroundColor: isAlwaysOnTop ? undefined : '#21253a', 
                color: isAlwaysOnTop ? '#ffffff' : '#a0a7bc',
                border: '1px solid rgba(255,255,255,0.08)' 
              } 
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={isAlwaysOnTop ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="17" x2="12" y2="22"></line>
              <path d="M5 17h14l-1.5-6H6.5L5 17z"></path>
              <path d="M9 11V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v7"></path>
            </svg>
          </ActionIcon>
        </Group>
      </Flex>

      <Flex direction="column" align="center" justify="center" my="xs">
        <Text
          size="xs"
          fw={700}
          c="#71788e"
          ta="center"
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
            letterSpacing: '0.02em',
            marginBottom: '2px'
          }}
        >
          {titleDisplay}
        </Text>

        <Text
          fw={900}
          c="white"
          ta="center"
          style={{
            fontSize: '2.5rem',
            lineHeight: 1,
            letterSpacing: '-0.03em',
            fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
          }}
        >
          {timeDisplay}
        </Text>
      </Flex>

      <div>
        {activeTab === 'pomodoro' ? (
          <Button
            size="xs"
            radius="xl"
            fullWidth
            onClick={onTogglePomodoro}
            styles={{
              root: {
                height: '32px',
                background: isPomodoroRunning
                  ? 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)'
                  : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                border: 'none',
                boxShadow: isPomodoroRunning
                  ? '0 4px 14px rgba(239, 68, 68, 0.35)'
                  : '0 4px 14px rgba(99, 102, 241, 0.35)'
              },
              label: { fontWeight: 800, fontSize: '0.8rem' }
            }}
          >
            {isPomodoroRunning ? '一時停止' : '再開'}
          </Button>
        ) : (
          <Button
            size="xs"
            radius="xl"
            fullWidth
            disabled
            styles={{
              root: {
                height: '32px',
                backgroundColor: '#21253a',
                border: '1px solid rgba(255,255,255,0.08)'
              },
              label: { color: '#71788e', fontWeight: 700, fontSize: '0.75rem' }
            }}
          >
            リアルタイム同期中
          </Button>
        )}
      </div>
    </Card>
  )
}

export default MiniTimer