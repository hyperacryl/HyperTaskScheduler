import { Stack, Card, Text, Title, TextInput, Select, Slider, Button, NumberInput, Divider } from '@mantine/core'
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
  templates: AnnounceTemplates
  setTemplates: (val: AnnounceTemplates) => void
}

export function Settings({
  apiKey, setApiKey,
  googleTtsApiKey, setGoogleTtsApiKey,
  googleVoiceName, setGoogleVoiceName,
  googlePitch, setGooglePitch,
  ttsProvider, setTtsProvider,
  volume, setVolume,
  preNotifyMinutes, setPreNotifyMinutes
}: SettingsProps) {

  const handleTestPlay = () => {
    playNotification(
      'これはテスト再生です。音量と声質を確認してください。', 
      ttsProvider, 
      volume, 
      0, 
      googleVoiceName, 
      googlePitch
    )
  }

  return (
    <Card padding="xl" styles={{ root: { backgroundColor: '#151828', borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.08)' } }}>
      <Title order={4} c="white" mb="md" fw={800}>設定</Title>
      <Stack gap="lg">
        
        <div>
          <Text size="sm" fw={700} c="#c1c7d8" mb="xs">AI自動生成用 (Gemini API Key)</Text>
          <TextInput 
            value={apiKey} 
            onChange={(e) => setApiKey(e.target.value)} 
            placeholder="AIzaSy..."
            styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
          />
        </div>

        <div>
          <Text size="sm" fw={700} c="#c1c7d8" mb="xs">音声通知用 (Google Cloud TTS API Key)</Text>
          <TextInput 
            value={googleTtsApiKey} 
            onChange={(e) => setGoogleTtsApiKey(e.target.value)} 
            placeholder="AIzaSy..."
            styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
          />
        </div>

        <Divider color="rgba(255,255,255,0.08)" />

        <div>
          <Text size="sm" fw={700} c="#c1c7d8" mb="xs">音声通知エンジン</Text>
          <Select
            value={ttsProvider}
            onChange={(val) => setTtsProvider((val as TtsProvider) || 'googleCloud')}
            data={[
              { value: 'googleCloud', label: 'Google Cloud TTS (クラウドAPI)' },
              { value: 'webSpeech', label: 'Windows標準音声 (Web Speech)' },
              { value: 'voicevox_3', label: 'VOICEVOX (ずんだもん)' }
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

        <Divider color="rgba(255,255,255,0.08)" />

        <div>
          <Text size="sm" fw={700} c="#c1c7d8" mb="xs">タスク終了前の通知 (分前)</Text>
          <NumberInput 
            value={preNotifyMinutes} 
            onChange={(val) => setPreNotifyMinutes(typeof val === 'number' ? val : 5)}
            min={1} max={30}
            styles={{ input: { backgroundColor: '#21253a', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' } }}
          />
        </div>

      </Stack>
    </Card>
  )
}