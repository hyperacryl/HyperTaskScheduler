import { Card, Flex, Text, ActionIcon, Group, Button } from '@mantine/core'

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
  return (
    <Card
      padding="md"
      radius="none"
      styles={{
        root: {
          backgroundColor: '#0f111a',
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
          border: 'none'
        }
      }}
    >
      {/* 1. ヘッダー (通常画面のヘッダー右端ボタンと位置・サイズを完全同期) */}
      <Flex justify="space-between" align="center" style={{ height: '36px' }}>
        <Group gap={4} style={{ backgroundColor: '#151828', padding: '3px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Button
            size="xs"
            radius="xl"
            variant={activeTab === 'scheduler' ? 'filled' : 'subtle'}
            color={activeTab === 'scheduler' ? 'indigo' : 'gray'}
            onClick={() => onChangeTab('scheduler')}
            styles={{ root: { height: '24px', padding: '0 10px', fontSize: '11px', fontWeight: 700 } }}
          >
            スケジューラ
          </Button>
          <Button
            size="xs"
            radius="xl"
            variant={activeTab === 'pomodoro' ? 'filled' : 'subtle'}
            color={activeTab === 'pomodoro' ? 'indigo' : 'gray'}
            onClick={() => onChangeTab('pomodoro')}
            styles={{ root: { height: '24px', padding: '0 10px', fontSize: '11px', fontWeight: 700 } }}
          >
            ポモドーロ
          </Button>
        </Group>

        {/* 右上アクションボタン群: 通常モードと同等サイズ (size="md") */}
        <Flex align="center" gap="xs">
          <ActionIcon
            size="md"
            radius="md"
            variant="subtle"
            onClick={onRestoreNormalMode}
            title="通常サイズに戻す"
            styles={{ root: { backgroundColor: '#21253a', color: '#c1c7d8', border: '1px solid rgba(255,255,255,0.08)' } }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9"></polyline>
              <polyline points="9 21 3 21 3 15"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          </ActionIcon>

          <ActionIcon
            size="md"
            radius="md"
            variant={isAlwaysOnTop ? 'filled' : 'subtle'}
            color={isAlwaysOnTop ? 'indigo' : 'gray'}
            onClick={onToggleAlwaysOnTop}
            title={isAlwaysOnTop ? '最前面表示解除' : '常に最前面に表示'}
            styles={{ root: { backgroundColor: isAlwaysOnTop ? undefined : '#21253a', border: '1px solid rgba(255,255,255,0.08)' } }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={isAlwaysOnTop ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="17" x2="12" y2="22"></line>
              <path d="M5 17h14l-1.5-6H6.5L5 17z"></path>
              <path d="M9 11V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v7"></path>
            </svg>
          </ActionIcon>
        </Flex>
      </Flex>

      {/* 2. メイン時計・タスク表示エリア */}
      {activeTab === 'scheduler' ? (
        <Flex direction="column" align="center" justify="center" my="xs">
          <Text size="xs" c="#828a9e" fw={700} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }} mb={2}>
            {currentTaskTitle}
          </Text>
          <Text fw={900} style={{ fontSize: '32px', color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {virtualTimeStr || '00:00:00'}
          </Text>
        </Flex>
      ) : (
        <Flex direction="column" align="center" justify="center" my="xs">
          <Text size="xs" c="#828a9e" fw={700} mb={2}>
            {pomodoroTitle}
          </Text>
          <Text fw={900} style={{ fontSize: '32px', color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {pomodoroTimeString}
          </Text>
        </Flex>
      )}

      {/* 3. フッター操作ボタン */}
      {activeTab === 'scheduler' ? (
        <Button
          fullWidth
          size="sm"
          radius="xl"
          variant="light"
          color="gray"
          disabled
          styles={{ root: { backgroundColor: '#151828', color: '#626982', border: 'none', height: '36px', fontWeight: 600 } }}
        >
          ● リアルタイム同期中
        </Button>
      ) : (
        <Button
          fullWidth
          size="sm"
          radius="xl"
          variant="filled"
          color={isPomodoroRunning ? 'orange' : 'indigo'}
          onClick={onTogglePomodoro}
          styles={{ root: { height: '36px', fontWeight: 700, fontSize: '13px' } }}
        >
          {isPomodoroRunning ? '一時停止' : 'スタート'}
        </Button>
      )}
    </Card>
  )
}