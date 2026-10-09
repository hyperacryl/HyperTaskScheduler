export type TtsProvider = 
  | 'googleCloud' 
  | 'webSpeech' 
  | 'ttsQuest'
  | `voicevox_${number}`

// Web Audio API 用の AudioContext（シングルトン管理）
let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    audioCtx = new AudioContextClass()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

// 現在再生中の GainNode（リアルタイム音量調整用）
let currentGainNode: GainNode | null = null

// 音声処理中（APIリクエスト中〜再生完了）フラグ
let isSpeaking = false

/**
 * 再生中の音声に対してリアルタイムに音量を変更
 */
export function setLiveVolume(volume: number): void {
  if (currentGainNode && audioCtx) {
    const targetVolume = Math.max(0, Math.min(1, volume / 100))
    currentGainNode.gain.setValueAtTime(targetVolume, audioCtx.currentTime)
  }
}

/**
 * 1. TTS Quest (VOICEVOX) での再生を試みる (Web Audio API 方式)
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

  const audioUrl = data.mp3DownloadUrl || data.mp3StreamingUrl
  if (!audioUrl) {
    throw new Error('TTS Quest API から音声URLを取得できませんでした。')
  }

  // 1. 音声データを ArrayBuffer として取得
  const audioResp = await fetch(audioUrl)
  if (!audioResp.ok) {
    throw new Error('音声データのダウンロードに失敗しました。')
  }
  const arrayBuffer = await audioResp.arrayBuffer()

  // 2. Web Audio API でデコードして再生
  const ctx = getAudioContext()
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer)

  return new Promise((resolve, reject) => {
    let isSettled = false

    const source = ctx.createBufferSource()
    source.buffer = audioBuffer

    const gainNode = ctx.createGain()
    const targetVolume = Math.max(0, Math.min(1, volume / 100))
    gainNode.gain.setValueAtTime(targetVolume, ctx.currentTime)

    source.connect(gainNode)
    gainNode.connect(ctx.destination)

    currentGainNode = gainNode

    const cleanup = () => {
      clearTimeout(timeoutTimer)
      currentGainNode = null
    }

    // デッドロック防止用タイムアウト（15秒経過で強制解除）
    const timeoutTimer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true
        try { source.stop() } catch {}
        cleanup()
        reject(new Error('TTS Quest 音声再生がタイムアウトしました。'))
      }
    }, 15000)

    source.onended = () => {
      if (!isSettled) {
        isSettled = true
        cleanup()
        resolve()
      }
    }

    try {
      source.start(0)
    } catch (err) {
      if (!isSettled) {
        isSettled = true
        cleanup()
        reject(err)
      }
    }
  })
}

/**
 * 2. Google Cloud TTS での再生を試みる (Web Audio API 方式)
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

  const binaryStr = atob(data.audioContent)
  const len = binaryStr.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i)
  }

  const ctx = getAudioContext()
  const audioBuffer = await ctx.decodeAudioData(bytes.buffer)

  return new Promise((resolve, reject) => {
    let isSettled = false

    const source = ctx.createBufferSource()
    source.buffer = audioBuffer

    const gainNode = ctx.createGain()
    const targetVolume = Math.max(0, Math.min(1, volume / 100))
    gainNode.gain.setValueAtTime(targetVolume, ctx.currentTime)

    source.connect(gainNode)
    gainNode.connect(ctx.destination)

    currentGainNode = gainNode

    const cleanup = () => {
      clearTimeout(timeoutTimer)
      currentGainNode = null
    }

    const timeoutTimer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true
        try { source.stop() } catch {}
        cleanup()
        reject(new Error('Google Cloud TTS 音声再生がタイムアウトしました。'))
      }
    }, 10000)

    source.onended = () => {
      if (!isSettled) {
        isSettled = true
        cleanup()
        resolve()
      }
    }

    try {
      source.start(0)
    } catch (err) {
      if (!isSettled) {
        isSettled = true
        cleanup()
        reject(err)
      }
    }
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

  // 連投防止ガード
  if (isSpeaking) {
    console.warn('現在音声が再生中（または処理中）のため、新しい音声リクエストをスキップしました。')
    return
  }

  isSpeaking = true

  try {
    // 1. TTS Quest (VOICEVOX) の指定、またはデフォルト
    if (provider === 'ttsQuest' || provider.startsWith('voicevox_')) {
      try {
        let speakerId = options?.speakerId || 3
        if (provider.startsWith('voicevox_')) {
          const parsedId = parseInt(provider.replace('voicevox_', ''), 10)
          if (!isNaN(parsedId)) speakerId = parsedId
        }

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