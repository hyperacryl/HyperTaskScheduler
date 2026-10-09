export type TtsProvider = 
  | 'googleCloud' 
  | 'webSpeech' 
  | 'ttsQuest'
  | `voicevox_${number}`

export interface TtsOptions {
  googleTtsApiKey?: string
  googleVoiceName?: string
  googlePitch?: number
  ttsQuestApiKey?: string
  speakerId?: number
}

// グローバルオプション保持
let globalTtsOptions: TtsOptions = {}

export function setTtsOptions(options: TtsOptions): void {
  globalTtsOptions = { ...globalTtsOptions, ...options }
}

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

let currentGainNode: GainNode | null = null

export function setLiveVolume(volume: number): void {
  if (currentGainNode && audioCtx) {
    const targetVolume = Math.max(0, Math.min(1, volume / 100))
    currentGainNode.gain.setValueAtTime(targetVolume, audioCtx.currentTime)
  }
}

interface SpeechTask {
  text: string
  provider: TtsProvider
  volume: number
  options?: TtsOptions
  resolve: () => void
}

const speechQueue: SpeechTask[] = []
let isProcessingQueue = false

async function processQueue(): Promise<void> {
  if (isProcessingQueue || speechQueue.length === 0) return
  isProcessingQueue = true

  while (speechQueue.length > 0) {
    const currentTask = speechQueue[0]
    try {
      await executeSpeak(
        currentTask.text, 
        currentTask.provider, 
        currentTask.volume, 
        currentTask.options
      )
    } catch (err) {
      console.error('音声再生エラー:', err)
    } finally {
      speechQueue.shift()
      currentTask.resolve()
    }
  }

  isProcessingQueue = false
}

/**
 * VOICEVOX (TTS Quest) 再生 (404生成待ちリトライ付き)
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

  // 404 (ファイル未生成) 対策: 1秒間隔で最大12回リトライ
  let audioResp: Response | null = null
  for (let attempt = 0; attempt < 12; attempt++) {
    audioResp = await fetch(audioUrl)
    if (audioResp.ok) {
      break
    }
    if (audioResp.status === 404) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      continue
    }
    throw new Error(`音声ダウンロードエラー: ステータスコード ${audioResp.status}`)
  }

  if (!audioResp || !audioResp.ok) {
    throw new Error('TTS Quest 音声データの生成完了待ちがタイムアウトしました。')
  }

  const arrayBuffer = await audioResp.arrayBuffer()

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

async function executeSpeak(
  text: string,
  provider: TtsProvider,
  volume: number,
  options?: TtsOptions
): Promise<void> {
  // 引数の options とグローバル設定をマージ
  const opts = { ...globalTtsOptions, ...options }

  if (provider === 'ttsQuest' || provider.startsWith('voicevox_')) {
    try {
      let speakerId = opts.speakerId || 3
      if (provider.startsWith('voicevox_')) {
        const parsedId = parseInt(provider.replace('voicevox_', ''), 10)
        if (!isNaN(parsedId)) speakerId = parsedId
      }
      await playTtsQuest(text, volume, speakerId, opts.ttsQuestApiKey)
      return
    } catch (err) {
      console.warn('TTS Quest での再生に失敗しました。Google Cloud TTS へ切り替えます。', err)
    }
  }

  if (provider === 'googleCloud' || provider === 'ttsQuest' || provider.startsWith('voicevox_')) {
    try {
      await playGoogleCloudTts(
        text,
        volume,
        opts.googleTtsApiKey || '',
        opts.googleVoiceName || 'ja-JP-Neural2-B',
        opts.googlePitch || 0
      )
      return
    } catch (err) {
      console.warn('Google Cloud TTS での再生に失敗しました。Web Speech API へ切り替えます。', err)
    }
  }

  await playWebSpeech(text, volume)
}

export function speak(
  text: string,
  provider: TtsProvider,
  volume: number,
  options?: TtsOptions
): Promise<void> {
  if (!text.trim()) return Promise.resolve()

  return new Promise((resolve) => {
    speechQueue.push({
      text,
      provider,
      volume,
      options,
      resolve
    })
    processQueue()
  })
}

export async function playNotification(
  text: string,
  provider: TtsProvider,
  volume: number,
  options?: TtsOptions
): Promise<void> {
  await speak(text, provider, volume, options)
}