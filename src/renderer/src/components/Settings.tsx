import type { JSX } from 'react'
import { playNotification, TtsProvider } from '../services/audioService'
import { Card, Text, Title, Button, Stack, PasswordInput, Select, Slider, NumberInput, TextInput, Divider } from '@mantine/core'
import { AnnounceTemplates } from '../App'

interface SettingsProps {
  apiKey: string
  setApiKey: (val: string) => void
  ttsProvider: TtsProvider
  setTtsProvider: (val: TtsProvider) => void
  volume: number
  setVolume: (val: number) => void
  preNotifyMinutes: number
  setPreNotifyMinutes: (val: number) => void
  templates: AnnounceTemplates
  setTemplates: React.Dispatch<React.SetStateAction<AnnounceTemplates>>
}

export function Settings({
  apiKey, setApiKey, ttsProvider, setTtsProvider, volume, setVolume, preNotifyMinutes, setPreNotifyMinutes, templates, setTemplates
}: SettingsProps): JSX.Element {

  const handleTestAudio = () => {
    let testMsg = 'これは音声通知のテストです。タスクの時間が迫っています。'
    if (ttsProvider === 'voicevox_3') testMsg = 'これは音声通知のテストなのだ。タスクの時間が迫っているのだ。'
    else if (ttsProvider === 'voicevox_2') testMsg = 'これは音声通知のテストよ。タスクの時間が迫っているわ。'
    else if (ttsProvider === 'voicevox_8') testMsg = 'これは音声通知のテストだよ。タスクの時間が迫ってるよ。'
    
    playNotification(testMsg, ttsProvider, volume / 100, 0)
  }

  return (
    <Card padding="28px" maw={680} mx="auto" mb="xl" styles={{ root: { backgroundColor: '#151828', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)' } }}>
      <Text size="xs" style={{ color: '#71788e' }} fw={700} tt="uppercase" lts="0.08em" mb="xs">PREFERENCES</Text>
      <Title order={3} mb="xl" c="white" fw={800}>設定</Title>

      <Stack gap="lg">
        <PasswordInput
          label="OpenAI API Key"
          description="AIタスク自動編成用"
          placeholder="sk-..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          radius="md"
          size="md"
          styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
        />

        <Select
          label="音声通知キャラクター"
          description="選択すると自動保存されます"
          value={ttsProvider}
          onChange={(val) => setTtsProvider((val as TtsProvider) || 'voicevox_3')}
          radius="md"
          size="md"
          styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
          data={[
            { value: 'voicevox_3', label: 'ずんだもん (VOICEVOX)' },
            { value: 'voicevox_2', label: '四国めたん (VOICEVOX)' },
            { value: 'voicevox_8', label: '春日部つむぎ (VOICEVOX)' },
            { value: 'voicevox_14', label: '冥鳴ひまり (VOICEVOX)' },
            { value: 'webSpeech', label: 'OS標準 (Web Speech API)' },
          ]}
        />

        <div>
          <Text size="sm" fw={700} mb={6} c="white">通知音量: {volume}%</Text>
          <Slider 
            value={volume} 
            onChange={setVolume} 
            color="indigo"
            size="md"
            radius="xl"
            marks={[ { value: 0, label: '0%' }, { value: 50, label: '50%' }, { value: 100, label: '100%' } ]}
            mb="xl"
          />
        </div>

        <NumberInput
          label="終了の事前通知 (分前)"
          description="0に設定するとオフになります"
          min={0}
          max={60}
          value={preNotifyMinutes}
          onChange={(val) => setPreNotifyMinutes(Number(val))}
          radius="md"
          size="md"
          styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
        />

        <Button 
          variant="filled" 
          onClick={handleTestAudio} 
          w="fit-content" 
          radius="xl"
          size="sm"
          styles={{ 
            root: { backgroundColor: '#21253a', border: '1px solid rgba(255, 255, 255, 0.08)' },
            label: { color: '#a855f7', fontWeight: 700 }
          }}
        >
          🔊 音声通知をテストする
        </Button>

        <Divider my="sm" color="rgba(255,255,255,0.08)" />

        <div>
          <Title order={4} mb="xs" c="white" fw={800}>🗣️ アナウンスのセリフカスタマイズ</Title>
          <Text size="xs" style={{ color: '#71788e' }} mb="md">
            `{"{title}"}` と入力した部分が実際のタスク名に置換されます。
          </Text>

          <Stack gap="md">
            <TextInput
              label="タスク開始時"
              value={templates.taskStart}
              onChange={(e) => setTemplates({ ...templates, taskStart: e.target.value })}
              radius="md"
              styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
            />
            <TextInput
              label="タスク終了の事前通知"
              value={templates.taskPreNotify}
              onChange={(e) => setTemplates({ ...templates, taskPreNotify: e.target.value })}
              radius="md"
              styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
            />
            <TextInput
              label="タスク終了時"
              value={templates.taskEnd}
              onChange={(e) => setTemplates({ ...templates, taskEnd: e.target.value })}
              radius="md"
              styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
            />
            <TextInput
              label="ポモドーロ 休憩終了時"
              value={templates.pomodoroBreakEnd}
              onChange={(e) => setTemplates({ ...templates, pomodoroBreakEnd: e.target.value })}
              radius="md"
              styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
            />
          </Stack>
        </div>
      </Stack>
    </Card>
  )
}

export default Settings