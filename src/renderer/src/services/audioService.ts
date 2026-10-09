export type TtsProvider = 'ttsQuest' | 'googleCloud' | 'webSpeech' | 'voicevox_3' | 'voicevox_2' | 'voicevox_8' | 'voicevox_14'

// 現在再生中の Audio インスタンス（リアルタイム音量調整用）
let currentAudioInstance: HTMLAudioElement | null = null

// 音声処理中（APIリクエスト中〜再生完了）フラグ（連投・重複API呼び出し防止用）
let isSpeaking = false

/**
 * 再生中の音声に対してリアルタイムに音量を変更
 */
export function setLiveVolume(volume: number): void {
  if (currentAudioInstance) {
    currentAudioInstance.volume = Math.max(0, Math.min(1, volume / 100))
  }
}

/**
 * 1. TTS Quest (VOICEVOX) での再生を試みる
 */
async function playTtsQuest(
  text: string,
  volume: number,
  speakerId: number = 3,
  apiKey: string = ''
): Promise<void> {
  const queryParams = new URLSearchParams({
    text: text,
    speaker: speakerId.toString()
  })
  if (apiKey.trim()) {
    queryParams.append('apiKey', apiKey.trim())
  }

  const response = await fetch(`https://api.tts.quest/v3/voicevox/synthesis?${queryParams.toString()}`)
  if (!response.ok) {
    throw new Error(`TTS Quest API エラー: ステータスコード ${response.status}`)
  }

  const data = await response.json()
  
  if (data.isAudioError) {
    throw new Error('TTS Quest API側で音声合成エラーが発生しました。')
  }

  const audioUrl = data.mp3StreamingUrl || data.mp3DownloadUrl
  if (!audioUrl) {
    throw new Error('TTS Quest API から音声URLを取得できませんでした。')
  }

  return new Promise((resolve, reject) => {
    const audio = new Audio(audioUrl)
    audio.volume = Math.max(0, Math.min(1, volume / 100))
    currentAudioInstance = audio

    audio.onended = () => {
      currentAudioInstance = null
      resolve()
    }
    audio.onerror = () => {
      currentAudioInstance = null
      reject(new Error(`TTS Quest 音声データの読み込み・再生に失敗しました。`))
    }

    audio.play().catch((err) => {
      currentAudioInstance = null
      reject(err)
    })
  })
}

/**
 * 2. Google Cloud TTS での再生を試みる
 */
async function playGoogleCloudTts(
  text: string,
  volume: number,
  apiKey: string,
  voiceName: string = 'ja-JP-Neural2-B',
  pitch: number = 0
): Promise<void> {
  if (!apiKey.trim()) {
    throw new Error('Google Cloud TTS APIキーが設定されていません。')
  }

  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey.trim()}`
  const body = {
    input: { text },
    voice: { languageCode: 'ja-JP', name: voiceName },
    audioConfig: { audioEncoding: 'MP3', pitch: pitch }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    throw new Error(`Google Cloud TTS エラー: ${response.statusText}`)
  }

  const data = await response.json()
  if (!data.audioContent) {
    throw new Error('Google Cloud TTS から音声コンテンツを取得できませんでした。')
  }

  return new Promise((resolve, reject) => {
    const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`)
    audio.volume = Math.max(0, Math.min(1, volume / 100))
    currentAudioInstance = audio

    audio.onended = () => {
      currentAudioInstance = null
      resolve()
    }
    audio.onerror = () => {
      currentAudioInstance = null
      reject(new Error('Google Cloud TTS 音声の再生中にエラーが発生しました。'))
    }

    audio.play().catch(reject)
  })
}

/**
 * 3. ブラウザ標準 (Web Speech API) での再生
 */
function playWebSpeech(text: string, volume: number): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      console.error('Web Speech API に非対応の環境です。')
      resolve()
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'ja-JP'
    utterance.volume = Math.max(0, Math.min(1, volume / 100))

    utterance.onend = () => resolve()
    utterance.onerror = () => resolve()

    window.speechSynthesis.speak(utterance)
  })
}

/**
 * メイン読み上げ関数（段階的フォールバック & 重複呼出ガード付き）
 */
export async function speak(
  text: string,
  provider: TtsProvider,
  volume: number,
  options?: {
    googleTtsApiKey?: string
    googleVoiceName?: string
    googlePitch?: number
    ttsQuestApiKey?: string
    speakerId?: number
  }
): Promise<void> {
  if (!text.trim()) return

  // 連投防止ガード: すでに音声生成・再生中であれば新たなリクエストを遮断する
  if (isSpeaking) {
    console.warn('現在音声が再生中（または処理中）のため、新しい音声リクエストをスキップしました。')
    return
  }

  isSpeaking = true

  try {
    // 1. TTS Quest (VOICEVOX) の指定、またはデフォルト
    if (provider === 'ttsQuest' || provider.startsWith('voicevox_')) {
      try {
        let speakerId = options?.speakerId || 3 // デフォルト: ずんだもん
        if (provider === 'voicevox_3') speakerId = 3
        if (provider === 'voicevox_2') speakerId = 2
        if (provider === 'voicevox_8') speakerId = 8
        if (provider === 'voicevox_14') speakerId = 14

        await playTtsQuest(text, volume, speakerId, options?.ttsQuestApiKey)
        return
      } catch (err) {
        console.warn('TTS Quest での再生に失敗しました。Google Cloud TTS へ切り替えます。', err)
      }
    }

    // 2. Google Cloud TTS へのフォールバック
    if (provider === 'googleCloud' || provider === 'ttsQuest' || provider.startsWith('voicevox_')) {
      try {
        await playGoogleCloudTts(
          text,
          volume,
          options?.googleTtsApiKey || '',
          options?.googleVoiceName || 'ja-JP-Neural2-B',
          options?.googlePitch || 0
        )
        return
      } catch (err) {
        console.warn('Google Cloud TTS での再生に失敗しました。Web Speech API へ切り替えます。', err)
      }
    }

    // 3. Web Speech API への最終フォールバック
    await playWebSpeech(text, volume)
  } finally {
    // 成功・失敗に関わらず、発話が完全に終了した時点でロック解除
    isSpeaking = false
  }
}

/**
 * 通知テスト用・設定画面呼び出し用関数
 */
export async function playNotification(
  text: string,
  provider: TtsProvider,
  volume: number,
  options?: {
    googleTtsApiKey?: string
    googleVoiceName?: string
    googlePitch?: number
    ttsQuestApiKey?: string
    speakerId?: number
  }
): Promise<void> {
  await speak(text, provider, volume, options)
}