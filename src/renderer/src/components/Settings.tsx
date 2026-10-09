import { 
  Stack, Card, Text, Title, Select, Slider, Button, 
  NumberInput, Divider, PasswordInput, TextInput, Switch, Tabs, Flex 
} from '@mantine/core'
import { playNotification, TtsProvider } from '../services/audioService'
import { AnnounceTemplates } from '../types'

interface SettingsProps {
  apiKey: string
  setApiKey: (val: string) => void
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
  templates: AnnounceTemplates
  setTemplates: (val: AnnounceTemplates) => void
  onResetTemplates?: () => void
  isDebugMode: boolean
  setIsDebugMode: (val: boolean) => void
  pomodoroAutoCycle: boolean
  setPomodoroAutoCycle: (val: boolean) => void
  pomodoroTargetCycles: number
  setPomodoroTargetCycles: (val: number) => void
}

export function Settings({
  apiKey, setApiKey,
  googleTtsApiKey, setGoogleTtsApiKey,
  googleVoiceName, setGoogleVoiceName,
  googlePitch, setGooglePitch,
  ttsProvider, setTtsProvider,
  volume, setVolume,
  preNotifyMinutes, setPreNotifyMinutes,
  autoBreakEnabled, setAutoBreakEnabled,
  breakMinutes, setBreakMinutes,
  preBreakNotifyMinutes, setPreBreakNotifyMinutes,
  templates, setTemplates,
  onResetTemplates,
  isDebugMode, setIsDebugMode,
  pomodoroAutoCycle, setPomodoroAutoCycle,
  pomodoroTargetCycles, setPomodoroTargetCycles
}: SettingsProps) {

  const handleTestPlay = () => {
    const testText = ttsProvider === 'voicevox_3' 
      ? 'これは音声通知のテストなのだ。音量と声質を確認するのだ！' 
      : 'これはテスト再生です。音量と声質を確認してください。'
      
    playNotification(
      testText, 
      ttsProvider, 
      volume, 
      {
        googleTtsApiKey,
        googleVoiceName,
        googlePitch
      }
    )
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

            <div>
              <Text size="sm" fw={700} c="#c1c7d8" mb="xs">AI自動生成用 (OpenAI API Key - GPT)</Text>
              <PasswordInput 
                value={apiKey} 
                onChange={(e) => setApiKey(e.target.value)} 
                placeholder="sk-proj-..."
                styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
              />
            </div>

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
            
            <Button onClick={handleTestPlay} variant="light" color="indigo" radius="md">
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
                  styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
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

        {/* 4. 通知セリフ設定 */}
        <Tabs.Panel value="templates" pl="xl">
          <Stack gap="md">
            <Flex justify="space-between" align="center">
              <Title order={5} c="white" fw={700}>通知セリフのカスタマイズ</Title>
              {onResetTemplates && (
                <Button variant="subtle" color="gray" size="xs" onClick={onResetTemplates}>
                  🔄 デフォルトに戻す
                </Button>
              )}
            </Flex>

            <div>
              <Flex justify="space-between" align="center" mb="4px">
                <Text size="xs" fw={700} c="#c1c7d8">1. タスク開始時</Text>
                <Text size="xs" c="#6366f1">使用可能: <code style={{ color: '#818cf8' }}>{'{title}'}</code></Text>
              </Flex>
              <TextInput 
                value={templates.taskStart || ''} 
                onChange={(e) => setTemplates({ ...templates, taskStart: e.target.value })}
                placeholder="例: {title} を開始します。集中していきましょう！"
                styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
              />
            </div>

            <div>
              <Flex justify="space-between" align="center" mb="4px">
                <Text size="xs" fw={700} c="#c1c7d8">2. タスク終了前</Text>
                <Text size="xs" c="#6366f1">使用可能: <code style={{ color: '#818cf8' }}>{'{title}'}</code>, <code style={{ color: '#818cf8' }}>{'{minutes}'}</code></Text>
              </Flex>
              <TextInput 
                value={templates.taskPreEnd || ''} 
                onChange={(e) => setTemplates({ ...templates, taskPreEnd: e.target.value })}
                placeholder="例: {title} 終了まであと {minutes} 分です。"
                styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
              />
            </div>

            <div>
              <Flex justify="space-between" align="center" mb="4px">
                <Text size="xs" fw={700} c="#c1c7d8">3. タスク終了時</Text>
                <Text size="xs" c="#6366f1">使用可能: <code style={{ color: '#818cf8' }}>{'{title}'}</code></Text>
              </Flex>
              <TextInput 
                value={templates.taskEnd || ''} 
                onChange={(e) => setTemplates({ ...templates, taskEnd: e.target.value })}
                placeholder="例: {title} が終了しました。お疲れ様でした。"
                styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
              />
            </div>

            <div>
              <Flex justify="space-between" align="center" mb="4px">
                <Text size="xs" fw={700} c="#c1c7d8">4. 休憩開始時</Text>
                <Text size="xs" c="#6366f1">使用可能: <code style={{ color: '#818cf8' }}>{'{minutes}'}</code></Text>
              </Flex>
              <TextInput 
                value={templates.breakStart || ''} 
                onChange={(e) => setTemplates({ ...templates, breakStart: e.target.value })}
                placeholder="例: 休憩時間です。しっかりリフレッシュしましょう。"
                styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
              />
            </div>

            <div>
              <Flex justify="space-between" align="center" mb="4px">
                <Text size="xs" fw={700} c="#c1c7d8">5. 休憩終了前</Text>
                <Text size="xs" c="#6366f1">使用可能: <code style={{ color: '#818cf8' }}>{'{minutes}'}</code>, <code style={{ color: '#818cf8' }}>{'{nextTitle}'}</code></Text>
              </Flex>
              <TextInput 
                value={templates.breakPreEnd || ''} 
                onChange={(e) => setTemplates({ ...templates, breakPreEnd: e.target.value })}
                placeholder="例: まもなく休憩が終了します。次は {nextTitle} です。"
                styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
              />
            </div>

            <div>
              <Flex justify="space-between" align="center" mb="4px">
                <Text size="xs" fw={700} c="#c1c7d8">6. すべてのタスク完了時</Text>
                <Text size="xs" c="#828a9e">使用可能変数なし</Text>
              </Flex>
              <TextInput 
                value={templates.allCompleted || ''} 
                onChange={(e) => setTemplates({ ...templates, allCompleted: e.target.value })}
                placeholder="例: 本日のタスクがすべて終了しました。お疲れ様でした！"
                styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
              />
            </div>
          </Stack>
        </Tabs.Panel>

        {/* 5. システム・デバッグ設定 */}
        <Tabs.Panel value="system" pl="xl">
          <Stack gap="lg">
            <Title order={5} c="white" fw={700}>開発・デバッグ機能の表示切り替え</Title>
            <Text size="xs" c="#828a9e">
              「🐞 デバッグスキップ」パネル（タイマーの早送り・巻き戻しボタン）をアプリ上に表示するかどうかを設定します。完成時はOFFにしてください。
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