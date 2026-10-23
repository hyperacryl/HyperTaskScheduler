import { useState } from 'react'
import { 
  Stack, Card, Text, Title, Select, Slider, Button, 
  NumberInput, Divider, PasswordInput, TextInput, Switch, Tabs, Flex,
  SegmentedControl, Group, Badge
} from '@mantine/core'
import { playNotification, TtsProvider } from '../services/audioService'
import { AnnounceTemplates } from '../types'

interface SettingsProps {
  // apiKey, setApiKey は削除済
  googleTtsApiKey: string
  setGoogleTtsApiKey: (val: string) => void
  googleVoiceName: string
  setGoogleVoiceName: (val: string) => void
  googlePitch: number
  setGooglePitch: (val: number) => void
  ttsProvider: TtsProvider
  setTtsProvider: (val: TtsProvider) => void
  volume: number
  setVolume: (val: number) => void
  preNotifyMinutes: number
  setPreNotifyMinutes: (val: number) => void
  autoBreakEnabled: boolean
  setAutoBreakEnabled: (val: boolean) => void
  breakMinutes: number
  setBreakMinutes: (val: number) => void
  preBreakNotifyMinutes: number
  setPreBreakNotifyMinutes: (val: number) => void
  autoCompleteTask: boolean
  setAutoCompleteTask: (val: boolean) => void
  standardTemplates: AnnounceTemplates
  setStandardTemplates: (val: AnnounceTemplates) => void
  zundamonTemplates: AnnounceTemplates
  setZundamonTemplates: (val: AnnounceTemplates) => void
  onResetStandardTemplates: () => void
  onResetZundamonTemplates: () => void
  isDebugMode: boolean
  setIsDebugMode: (val: boolean) => void
  pomodoroAutoCycle: boolean
  setPomodoroAutoCycle: (val: boolean) => void
  pomodoroTargetCycles: number
  setPomodoroTargetCycles: (val: number) => void
}

export function Settings({
  googleTtsApiKey, setGoogleTtsApiKey,
  googleVoiceName, setGoogleVoiceName,
  googlePitch, setGooglePitch,
  ttsProvider, setTtsProvider,
  volume, setVolume,
  preNotifyMinutes, setPreNotifyMinutes,
  autoBreakEnabled, setAutoBreakEnabled,
  breakMinutes, setBreakMinutes,
  preBreakNotifyMinutes, setPreBreakNotifyMinutes,
  autoCompleteTask, setAutoCompleteTask,
  standardTemplates, setStandardTemplates,
  zundamonTemplates, setZundamonTemplates,
  onResetStandardTemplates,
  onResetZundamonTemplates,
  isDebugMode, setIsDebugMode,
  pomodoroAutoCycle, setPomodoroAutoCycle,
  pomodoroTargetCycles, setPomodoroTargetCycles
}: SettingsProps) {

  const [isTesting, setIsTesting] = useState(false)

  // 口調サブタブ（アナウンス口調 / ずんだもん口調）
  const [templateTab, setTemplateTab] = useState<'standard' | 'zundamon'>(() =>
    ttsProvider === 'voicevox_3' ? 'zundamon' : 'standard'
  )

  const handleTestPlay = async () => {
    if (isTesting) return
    setIsTesting(true)

    const isZunda = ttsProvider === 'voicevox_3'
    const testText = isZunda
      ? 'これは音声通知のテストなのだ。音量と声質を確認するのだ！' 
      : 'これはテスト再生です。音量と声質を確認してください。'
      
    try {
      await playNotification(
        testText, 
        ttsProvider, 
        volume, 
        {
          googleTtsApiKey,
          googleVoiceName,
          googlePitch
        }
      )
    } finally {
      setIsTesting(false)
    }
  }

  const currentTpl = templateTab === 'standard' ? standardTemplates : zundamonTemplates
  const setCurrentTpl = templateTab === 'standard' ? setStandardTemplates : setZundamonTemplates
  const handleResetCurrent = templateTab === 'standard' ? onResetStandardTemplates : onResetZundamonTemplates

  const handleInsertVar = (field: keyof AnnounceTemplates, varName: string) => {
    const val = currentTpl[field] || ''
    const nextVal = val ? `${val} ${varName}` : varName
    setCurrentTpl({ ...currentTpl, [field]: nextVal })
  }

  return (
    <Card padding="xl" styles={{ root: { backgroundColor: '#151828', borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.08)' } }}>
      <Title order={4} c="white" mb="lg" fw={800}>設定</Title>
      
      <Tabs defaultValue="api" orientation="vertical" variant="pills" color="indigo">
        <Tabs.List style={{ minWidth: '180px' }}>
          <Tabs.Tab value="api" fw={600}>🔑 API・連携</Tabs.Tab>
          <Tabs.Tab value="audio" fw={600}>🎵 音声・発話</Tabs.Tab>
          <Tabs.Tab value="timer" fw={600}>⏱️ タイマー・休憩</Tabs.Tab>
          <Tabs.Tab value="templates" fw={600}>💬 通知セリフ</Tabs.Tab>
          <Tabs.Tab value="system" fw={600}>🛠️ システム・デバッグ</Tabs.Tab>
        </Tabs.List>

        {/* 1. API・連携設定 */}
        <Tabs.Panel value="api" pl="xl">
          <Stack gap="lg">
            <Title order={5} c="white" fw={700}>外部APIキー設定</Title>
            {/* OpenAI API Key入力欄は削除済 */}
            <div>
              <Text size="sm" fw={700} c="#c1c7d8" mb="xs">音声通知用 (Google Cloud TTS API Key)</Text>
              <PasswordInput 
                value={googleTtsApiKey} 
                onChange={(e) => setGoogleTtsApiKey(e.target.value)} 
                placeholder="AIzaSy..."
                styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
              />
            </div>
          </Stack>
        </Tabs.Panel>

        {/* 2. 音声・発話設定 */}
        <Tabs.Panel value="audio" pl="xl">
          <Stack gap="lg">
            <Title order={5} c="white" fw={700}>音声通知エンジン設定</Title>

            <div>
              <Text size="sm" fw={700} c="#c1c7d8" mb="xs">音声通知エンジン</Text>
              <Select
                value={ttsProvider}
                onChange={(val) => setTtsProvider((val as TtsProvider) || 'voicevox_3')}
                data={[
                  { value: 'voicevox_3', label: 'VOICEVOX (ずんだもん)' },
                  { value: 'voicevox_2', label: 'VOICEVOX (四国めたん)' },
                  { value: 'voicevox_8', label: 'VOICEVOX (春日部つむぎ)' },
                  { value: 'voicevox_14', label: 'VOICEVOX (冥鳴ひまり)' },
                  { value: 'googleCloud', label: 'Google Cloud TTS (クラウドAPI)' },
                  { value: 'webSpeech', label: 'Windows標準音声 (Web Speech)' }
                ]}
                styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
              />
            </div>

            {ttsProvider === 'googleCloud' && (
              <>
                <div>
                  <Text size="sm" fw={700} c="#c1c7d8" mb="xs">Google TTS 声の種類</Text>
                  <Select
                    value={googleVoiceName}
                    onChange={(val) => setGoogleVoiceName(val || 'ja-JP-Neural2-B')}
                    data={[
                      { value: 'ja-JP-Neural2-B', label: '女性 (高品質 Neural2)' },
                      { value: 'ja-JP-Neural2-C', label: '男性 (高品質 Neural2)' }
                    ]}
                    styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
                  />
                </div>

                <div>
                  <Text size="sm" fw={700} c="#c1c7d8" mb="xs">声の高さ・ピッチ ({googlePitch > 0 ? `+${googlePitch}` : googlePitch})</Text>
                  <Slider 
                    value={googlePitch} 
                    onChange={setGooglePitch} 
                    min={-10} 
                    max={10} 
                    step={0.5} 
                    color="indigo" 
                    marks={[
                      { value: -10, label: '低い' },
                      { value: 0, label: '標準' },
                      { value: 10, label: '高い/明るい' }
                    ]}
                  />
                </div>
              </>
            )}

            <div>
              <Text size="sm" fw={700} c="#c1c7d8" mb="xs">音量 ({volume}%)</Text>
              <Slider value={volume} onChange={setVolume} color="indigo" />
            </div>
            
            <Button 
              onClick={handleTestPlay} 
              loading={isTesting}
              variant="light" color="indigo" radius="md"
            >
              🎵 音声テスト再生
            </Button>
          </Stack>
        </Tabs.Panel>

        {/* 3. タイマー・休憩設定 */}
        <Tabs.Panel value="timer" pl="xl">
          <Stack gap="lg">
            <Title order={5} c="white" fw={700}>ポモドーロタイマー設定</Title>

            <Switch
              label="ポモドーロ終了時に自動で次のモード（作業/休憩）をスタートする"
              checked={pomodoroAutoCycle}
              onChange={(e) => setPomodoroAutoCycle(e.currentTarget.checked)}
              color="indigo"
              size="md"
              styles={{ label: { color: '#ffffff', fontWeight: 600 } }}
            />

            {pomodoroAutoCycle && (
              <div>
                <Text size="sm" fw={700} c="#c1c7d8" mb="xs">自動サイクルの上限セット数 (0 = 無限に繰り返し)</Text>
                <NumberInput
                  value={pomodoroTargetCycles}
                  onChange={(val) => setPomodoroTargetCycles(typeof val === 'number' ? val : 0)}
                  min={0}
                  max={99}
                  styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff', width: '75px' } }}
                />
              </div>
            )}

            <Divider color="rgba(255,255,255,0.08)" />

            <Title order={5} c="white" fw={700}>スケジューラ自動小休憩設定</Title>

            <Switch
              label="タスク終了後に自動で小休憩を差し込む"
              checked={autoBreakEnabled}
              onChange={(e) => setAutoBreakEnabled(e.currentTarget.checked)}
              color="indigo"
              size="md"
              styles={{ label: { color: '#ffffff', fontWeight: 600 } }}
            />

            {autoBreakEnabled && (
              <div>
                <Text size="sm" fw={700} c="#c1c7d8" mb="xs">自動小休憩の長さ (分)</Text>
                <NumberInput 
                  value={breakMinutes} 
                  onChange={(val) => setBreakMinutes(typeof val === 'number' ? val : 5)}
                  min={1} max={30}
                  styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
                />
              </div>
            )}

            <Divider color="rgba(255,255,255,0.08)" />

            <Title order={5} c="white" fw={700}>タスク自動完了設定</Title>

            <Switch
              label="終了時刻になったタスクを自動で完了済みにする"
              checked={autoCompleteTask}
              onChange={(e) => setAutoCompleteTask(e.currentTarget.checked)}
              color="indigo"
              size="md"
              styles={{ label: { color: '#ffffff', fontWeight: 600 } }}
            />

            <Divider color="rgba(255,255,255,0.08)" />

            <div>
              <Text size="sm" fw={700} c="#c1c7d8" mb="xs">タスク終了前の予告通知 (分前)</Text>
              <NumberInput 
                value={preNotifyMinutes} 
                onChange={(val) => setPreNotifyMinutes(typeof val === 'number' ? val : 5)}
                min={1} max={30}
                styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
              />
            </div>

            {autoBreakEnabled && (
              <div>
                <Text size="sm" fw={700} c="#c1c7d8" mb="xs">休憩終了前の予告通知 (分前)</Text>
                <NumberInput 
                  value={preBreakNotifyMinutes} 
                  onChange={(val) => setPreBreakNotifyMinutes(typeof val === 'number' ? val : 1)}
                  min={1} max={10}
                  styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
                />
              </div>
            )}
          </Stack>
        </Tabs.Panel>

        {/* 4. 通知セリフ設定 (口調タブ・変数ボタン・プレビュー付き) */}
        <Tabs.Panel value="templates" pl="xl">
          <Stack gap="md">
            <Flex justify="space-between" align="center">
              <Title order={5} c="white" fw={700}>通知セリフのカスタマイズ</Title>
              <Button variant="subtle" color="gray" size="xs" onClick={handleResetCurrent}>
                🔄 現在のタブをデフォルトに戻す
              </Button>
            </Flex>

            {/* サブタブ切替 */}
            <SegmentedControl
              value={templateTab}
              onChange={(val) => setTemplateTab(val as 'standard' | 'zundamon')}
              data={[
                { label: '📢 アナウンス口調 (標準 / その他)', value: 'standard' },
                { label: '🟢 ずんだもん口調 (ずんだもん)', value: 'zundamon' }
              ]}
              fullWidth
              radius="md"
              styles={{
                root: { backgroundColor: '#0f111a', border: '1px solid rgba(255,255,255,0.06)', padding: '4px' },
                indicator: { background: templateTab === 'standard' ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : '#10b981' },
                label: { color: '#ffffff', fontWeight: 700, fontSize: '0.85rem' }
              }}
            />

            <Text size="xs" c="#828a9e">
              ※ 音声エンジンが「ずんだもん」のときは「ずんだもん口調」、それ以外（Google / Windows / めたん・つむぎ・ひまり等）はすべて「アナウンス口調」が適用されます。
            </Text>

            <Divider my="xs" label="📋 スケジューラー用セリフ" labelPosition="left" color="rgba(255,255,255,0.1)" />

            {/* 1. タスク開始時 */}
            <div>
              <Flex justify="space-between" align="center" mb="4px">
                <Group gap="xs" align="center">
                  <Text size="xs" fw={700} c="#c1c7d8">1. タスク開始時</Text>
                  <Badge size="xs" variant="light" color="gray">開始5秒前</Badge>
                </Group>
                <Group gap="4px">
                  <Text size="11px" c="#828a9e">変数挿入:</Text>
                  <Button size="compact-xs" variant="light" color="indigo" onClick={() => handleInsertVar('taskStart', '{title}')}>+ タスク名</Button>
                </Group>
              </Flex>
              <TextInput 
                value={currentTpl.taskStart || ''} 
                onChange={(e) => setCurrentTpl({ ...currentTpl, taskStart: e.target.value })}
                placeholder="セリフを入力..."
                styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
              />
              <Text size="xs" c="#828a9e" mt="2px">
                💬 プレビュー: {(currentTpl.taskStart || '').replace('{title}', '資料作成')}
              </Text>
            </div>

            {/* 2. タスク終了前 */}
            <div>
              <Flex justify="space-between" align="center" mb="4px">
                <Group gap="xs" align="center">
                  <Text size="xs" fw={700} c="#c1c7d8">2. タスク終了前</Text>
                  <Badge size="xs" variant="light" color="gray">{preNotifyMinutes}分前</Badge>
                </Group>
                <Group gap="4px">
                  <Text size="11px" c="#828a9e">変数挿入:</Text>
                  <Button size="compact-xs" variant="light" color="indigo" onClick={() => handleInsertVar('taskPreEnd', '{title}')}>+ タスク名</Button>
                  <Button size="compact-xs" variant="light" color="indigo" onClick={() => handleInsertVar('taskPreEnd', '{minutes}')}>+ 残り分数</Button>
                </Group>
              </Flex>
              <TextInput 
                value={currentTpl.taskPreEnd || ''} 
                onChange={(e) => setCurrentTpl({ ...currentTpl, taskPreEnd: e.target.value })}
                placeholder="セリフを入力..."
                styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
              />
              <Text size="xs" c="#828a9e" mt="2px">
                💬 プレビュー: {(currentTpl.taskPreEnd || '').replace('{title}', '資料作成').replace('{minutes}', preNotifyMinutes.toString())}
              </Text>
            </div>

            {/* 3. タスク終了時 */}
            <div>
              <Flex justify="space-between" align="center" mb="4px">
                <Group gap="xs" align="center">
                  <Text size="xs" fw={700} c="#c1c7d8">3. タスク終了時</Text>
                  <Badge size="xs" variant="light" color="gray">終了5秒前</Badge>
                </Group>
                <Group gap="4px">
                  <Text size="11px" c="#828a9e">変数挿入:</Text>
                  <Button size="compact-xs" variant="light" color="indigo" onClick={() => handleInsertVar('taskEnd', '{title}')}>+ タスク名</Button>
                </Group>
              </Flex>
              <TextInput 
                value={currentTpl.taskEnd || ''} 
                onChange={(e) => setCurrentTpl({ ...currentTpl, taskEnd: e.target.value })}
                placeholder="セリフを入力..."
                styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
              />
              <Text size="xs" c="#828a9e" mt="2px">
                💬 プレビュー: {(currentTpl.taskEnd || '').replace('{title}', '資料作成')}
              </Text>
            </div>

            {/* 4. 休憩開始時 */}
            <div>
              <Flex justify="space-between" align="center" mb="4px">
                <Group gap="xs" align="center">
                  <Text size="xs" fw={700} c="#c1c7d8">4. 休憩開始時</Text>
                  <Badge size="xs" variant="light" color="gray">休憩開始5秒前</Badge>
                </Group>
                <Group gap="4px">
                  <Text size="11px" c="#828a9e">変数挿入:</Text>
                  <Button size="compact-xs" variant="light" color="indigo" onClick={() => handleInsertVar('breakStart', '{minutes}')}>+ 休憩分数</Button>
                </Group>
              </Flex>
              <TextInput 
                value={currentTpl.breakStart || ''} 
                onChange={(e) => setCurrentTpl({ ...currentTpl, breakStart: e.target.value })}
                placeholder="セリフを入力..."
                styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
              />
              <Text size="xs" c="#828a9e" mt="2px">
                💬 プレビュー: {(currentTpl.breakStart || '').replace('{minutes}', breakMinutes.toString())}
              </Text>
            </div>

            {/* 5. 休憩終了前 */}
            <div>
              <Flex justify="space-between" align="center" mb="4px">
                <Group gap="xs" align="center">
                  <Text size="xs" fw={700} c="#c1c7d8">5. 休憩終了前</Text>
                  <Badge size="xs" variant="light" color="gray">{preBreakNotifyMinutes}分前</Badge>
                </Group>
                <Group gap="4px">
                  <Text size="11px" c="#828a9e">変数挿入:</Text>
                  <Button size="compact-xs" variant="light" color="indigo" onClick={() => handleInsertVar('breakPreEnd', '{minutes}')}>+ 残り分数</Button>
                  <Button size="compact-xs" variant="light" color="indigo" onClick={() => handleInsertVar('breakPreEnd', '{nextTitle}')}>+ 次のタスク名</Button>
                </Group>
              </Flex>
              <TextInput 
                value={currentTpl.breakPreEnd || ''} 
                onChange={(e) => setCurrentTpl({ ...currentTpl, breakPreEnd: e.target.value })}
                placeholder="セリフを入力..."
                styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
              />
              <Text size="xs" c="#828a9e" mt="2px">
                💬 プレビュー: {(currentTpl.breakPreEnd || '').replace('{minutes}', preBreakNotifyMinutes.toString()).replace('{nextTitle}', '定例ミーティング')}
              </Text>
            </div>

            {/* 6. すべてのタスク完了時 */}
            <div>
              <Flex justify="space-between" align="center" mb="4px">
                <Group gap="xs" align="center">
                  <Text size="xs" fw={700} c="#c1c7d8">6. すべてのタスク完了時</Text>
                  <Badge size="xs" variant="light" color="gray">全タスク完了時</Badge>
                </Group>
                <Text size="11px" c="#828a9e">使用可能変数なし</Text>
              </Flex>
              <TextInput 
                value={currentTpl.allCompleted || ''} 
                onChange={(e) => setCurrentTpl({ ...currentTpl, allCompleted: e.target.value })}
                placeholder="セリフを入力..."
                styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
              />
              <Text size="xs" c="#828a9e" mt="2px">
                💬 プレビュー: {currentTpl.allCompleted || ''}
              </Text>
            </div>

            <Divider my="xs" label="🍅 ポモドーロタイマー用セリフ" labelPosition="left" color="rgba(255,255,255,0.1)" />

            {/* 7. ポモドーロ作業開始時 */}
            <div>
              <Flex justify="space-between" align="center" mb="4px">
                <Text size="xs" fw={700} c="#c1c7d8">7. ポモドーロ作業開始時</Text>
                <Text size="11px" c="#828a9e">使用可能変数なし</Text>
              </Flex>
              <TextInput 
                value={currentTpl.pomodoroWorkStart || ''} 
                onChange={(e) => setCurrentTpl({ ...currentTpl, pomodoroWorkStart: e.target.value })}
                placeholder="セリフを入力..."
                styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
              />
              <Text size="xs" c="#828a9e" mt="2px">
                💬 プレビュー: {currentTpl.pomodoroWorkStart || ''}
              </Text>
            </div>

            {/* 8. ポモドーロ作業終了前 */}
            <div>
              <Flex justify="space-between" align="center" mb="4px">
                <Group gap="xs" align="center">
                  <Text size="xs" fw={700} c="#c1c7d8">8. ポモドーロ作業終了前</Text>
                  <Badge size="xs" variant="light" color="gray">{preNotifyMinutes}分前</Badge>
                </Group>
                <Group gap="4px">
                  <Text size="11px" c="#828a9e">変数挿入:</Text>
                  <Button size="compact-xs" variant="light" color="indigo" onClick={() => handleInsertVar('pomodoroWorkPreEnd', '{minutes}')}>+ 残り分数</Button>
                </Group>
              </Flex>
              <TextInput 
                value={currentTpl.pomodoroWorkPreEnd || ''} 
                onChange={(e) => setCurrentTpl({ ...currentTpl, pomodoroWorkPreEnd: e.target.value })}
                placeholder="セリフを入力..."
                styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
              />
              <Text size="xs" c="#828a9e" mt="2px">
                💬 プレビュー: {(currentTpl.pomodoroWorkPreEnd || '').replace('{minutes}', preNotifyMinutes.toString())}
              </Text>
            </div>

            {/* 9. ポモドーロ休憩開始時 */}
            <div>
              <Flex justify="space-between" align="center" mb="4px">
                <Text size="xs" fw={700} c="#c1c7d8">9. ポモドーロ休憩開始時</Text>
                <Group gap="4px">
                  <Text size="11px" c="#828a9e">変数挿入:</Text>
                  <Button size="compact-xs" variant="light" color="indigo" onClick={() => handleInsertVar('pomodoroBreakStart', '{minutes}')}>+ 休憩分数</Button>
                </Group>
              </Flex>
              <TextInput 
                value={currentTpl.pomodoroBreakStart || ''} 
                onChange={(e) => setCurrentTpl({ ...currentTpl, pomodoroBreakStart: e.target.value })}
                placeholder="セリフを入力..."
                styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
              />
              <Text size="xs" c="#828a9e" mt="2px">
                💬 プレビュー: {(currentTpl.pomodoroBreakStart || '').replace('{minutes}', '5')}
              </Text>
            </div>

            {/* 10. ポモドーロ休憩終了前 */}
            <div>
              <Flex justify="space-between" align="center" mb="4px">
                <Text size="xs" fw={700} c="#c1c7d8">10. ポモドーロ休憩終了前</Text>
                <Text size="11px" c="#828a9e">使用可能変数なし</Text>
              </Flex>
              <TextInput 
                value={currentTpl.pomodoroBreakPreEnd || ''} 
                onChange={(e) => setCurrentTpl({ ...currentTpl, pomodoroBreakPreEnd: e.target.value })}
                placeholder="セリフを入力..."
                styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
              />
              <Text size="xs" c="#828a9e" mt="2px">
                💬 プレビュー: {currentTpl.pomodoroBreakPreEnd || ''}
              </Text>
            </div>

            {/* 11. ポモドーロ全セット完了時 */}
            <div>
              <Flex justify="space-between" align="center" mb="4px">
                <Text size="xs" fw={700} c="#c1c7d8">11. ポモドーロ全セット完了時</Text>
                <Text size="11px" c="#828a9e">使用可能変数なし</Text>
              </Flex>
              <TextInput 
                value={currentTpl.pomodoroAllCompleted || ''} 
                onChange={(e) => setCurrentTpl({ ...currentTpl, pomodoroAllCompleted: e.target.value })}
                placeholder="セリフを入力..."
                styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
              />
              <Text size="xs" c="#828a9e" mt="2px">
                💬 プレビュー: {currentTpl.pomodoroAllCompleted || ''}
              </Text>
            </div>
          </Stack>
        </Tabs.Panel>

        {/* 5. システム・デバッグ設定 */}
        <Tabs.Panel value="system" pl="xl">
          <Stack gap="lg">
            <Title order={5} c="white" fw={700}>開発・デバッグ機能の表示切り替え</Title>
            <Text size="xs" c="#828a9e">
              「🐞 デバッグスキップ」パネルをアプリ上に表示するかどうかを設定します。完成時はOFFにしてください。
            </Text>

            <Switch
              label="デバッグ機能を画面に表示する"
              checked={isDebugMode}
              onChange={(e) => setIsDebugMode(e.currentTarget.checked)}
              color="indigo"
              size="md"
              styles={{ label: { color: '#ffffff', fontWeight: 600 } }}
            />
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Card>
  )
}