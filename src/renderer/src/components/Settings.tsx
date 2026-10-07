import type { JSX } from 'react'
import { playNotification, TtsProvider } from '../services/audioService'

interface SettingsProps {
  apiKey: string
  setApiKey: (val: string) => void
  ttsProvider: TtsProvider
  setTtsProvider: (val: TtsProvider) => void
  volume: number
  setVolume: (val: number) => void
  preNotifyMinutes: number
  setPreNotifyMinutes: (val: number) => void
}

export function Settings({
  apiKey,
  setApiKey,
  ttsProvider,
  setTtsProvider,
  volume,
  setVolume,
  preNotifyMinutes,
  setPreNotifyMinutes
}: SettingsProps): JSX.Element {
  const handleTestAudio = (): void => {
    let testMessage = 'これは音声通知のテストです。タスクの時間が迫っています。'
    if (ttsProvider === 'voicevox_3')
      testMessage = 'これは音声通知のテストなのだ。タスクの時間が迫っているのだ。'
    else if (ttsProvider === 'voicevox_2')
      testMessage = 'これは音声通知のテストよ。タスクの時間が迫っているわ。'
    else if (ttsProvider === 'voicevox_8')
      testMessage = 'これは音声通知のテストだよ。タスクの時間が迫ってるよ。'
    else if (ttsProvider === 'voicevox_14')
      testMessage = 'これは音声通知のテストです。タスクの時間が迫っています。'

    playNotification(testMessage, ttsProvider, volume / 100, 0)
  }

  return (
    <section>
      <article className="card settings-card">
        <p className="card-title">PREFERENCES</p>
        <h2>設定</h2>
        <div className="field">
          <label className="label">OpenAI API Key (AIタスク自動編成用):</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="control"
          />
        </div>

        <div className="field">
          <label className="label">音声通知キャラクター (自動保存):</label>
          <select
            value={ttsProvider}
            onChange={(e) => setTtsProvider(e.target.value as TtsProvider)}
            className="control"
          >
            <option value="voicevox_3">ずんだもん (VOICEVOX)</option>
            <option value="voicevox_2">四国めたん (VOICEVOX)</option>
            <option value="voicevox_8">春日部つむぎ (VOICEVOX)</option>
            <option value="voicevox_14">冥鳴ひまり (VOICEVOX)</option>
            <option value="webSpeech">OS標準 (Web Speech API)</option>
          </select>
        </div>

        <div className="field">
          <label className="label">通知音量: {volume}% (自動保存):</label>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
        </div>

        <div className="field">
          <label className="label">終了の事前通知 (分前 / 0でオフ): {preNotifyMinutes}分前</label>
          <input
            type="number"
            min="0"
            max="60"
            value={preNotifyMinutes}
            onChange={(e) => setPreNotifyMinutes(Number(e.target.value))}
            className="control"
          />
        </div>

        <button className="btn" onClick={handleTestAudio}>
          🔊 音声通知をテストする
        </button>
      </article>
    </section>
  )
}
