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
let currentAudioElement: HTMLAudioElement | null = null

export function setLiveVolume(volume: number): void {
  const targetVolume = Math.max(0, Math.min(1, volume / 100))
  if (currentGainNode && audioCtx) {
    currentGainNode.gain.setValueAtTime(targetVolume, audioCtx.currentTime)
  }
  if (currentAudioElement) {
    currentAudioElement.volume = targetVolume
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
      
      // 次のキュー実行前に1.2秒のインターバルを挟み、429制限を回避
      if (speechQueue.length > 0) {
        await new Promise((res) => setTimeout(res, 1200))
      }
    }
  }

  isProcessingQueue = false
}

/**
 * 内部ヘルパー: VOICEVOX API呼び出し＋ステータス確認ポーリング（短縮待機・404非発生化）
 */
async function attemptPlayTtsQuest(
  text: string,
  volume: number,
  speakerId: number,
  apiKey: string
): Promise<void> {
  const queryParams = new URLSearchParams({
    text: text,
    speaker: speakerId.toString()
  })
  if (apiKey.trim()) {
    queryParams.append('apiKey', apiKey.trim())
  }

  const controller = new AbortController()
  const fetchTimer = setTimeout(() => controller.abort(), 6000)

  let response: Response
  try {
    response = await fetch(`https://api.tts.quest/v3/voicevox/synthesis?${queryParams.toString()}`, {
      signal: controller.signal
    })
  } catch (err: any) {
    clearTimeout(fetchTimer)
    throw new Error(`TTS Quest 接続失敗: ${err?.message || err}`)
  }
  clearTimeout(fetchTimer)

  if (!response.ok) {
    throw new Error(`APIレスポンスエラー: ${response.status}`)
  }

  const data = await response.json()
  if (data.isAudioError) {
    throw new Error('音声合成エラーが発生しました。')
  }

  const downloadUrl = data.mp3DownloadUrl || data.mp3StreamingUrl
  const statusUrl = data.audioStatusUrl
  if (!downloadUrl) {
    throw new Error('音声URLを取得できませんでした。')
  }

  // ステータスURLの確認（最大20回 × 350ms ＝ 約7秒で判定し、無駄な長時間拘束を抑止）
  if (statusUrl) {
    let isReady = false
    for (let i = 0; i < 20; i++) {
      const statusController = new AbortController()
      const timer = setTimeout(() => statusController.abort(), 3000)
      try {
        const sResp = await fetch(statusUrl, { signal: statusController.signal })
        clearTimeout(timer)
        if (sResp.ok) {
          const sData = await sResp.json()
          if (sData.isAudioError) {
            throw new Error('音声合成処理中にエラーが発生しました。')
          }
          if (sData.isAudioReady) {
            isReady = true
            break
          }
        }
      } catch (err: any) {
        clearTimeout(timer)
      }
      await new Promise((resolve) => setTimeout(resolve, 350))
    }

    if (!isReady) {
      throw new Error('音声データの生成完了待ちがタイムアウトしました。')
    }
  } else {
    let isOk = false
    for (let i = 0; i < 20; i++) {
      try {
        const testResp = await fetch(downloadUrl)
        if (testResp.ok) {
          isOk = true
          break
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 350))
    }
    if (!isOk) {
      throw new Error('音声データの取得がタイムアウトしました。')
    }
  }

  // 生成完了後にMP3データをダウンロード
  const audioRespController = new AbortController()
  const audioFetchTimer = setTimeout(() => audioRespController.abort(), 8000)

  let audioResp: Response
  try {
    audioResp = await fetch(downloadUrl, { signal: audioRespController.signal })
  } catch (err: any) {
    clearTimeout(audioFetchTimer)
    throw new Error(`音声データのダウンロード失敗: ${err?.message || err}`)
  }
  clearTimeout(audioFetchTimer)

  if (!audioResp.ok) {
    throw new Error(`音声ダウンロードエラー: ${audioResp.status}`)
  }

  const blob = await audioResp.blob()
  const objectUrl = URL.createObjectURL(blob)

  return new Promise((resolve, reject) => {
    let isSettled = false
    const audio = new Audio(objectUrl)
    const targetVolume = Math.max(0, Math.min(1, volume / 100))
    audio.volume = targetVolume
    currentAudioElement = audio

    const cleanup = () => {
      clearTimeout(playTimer)
      audio.onended = null
      audio.onerror = null
      currentAudioElement = null
      URL.revokeObjectURL(objectUrl)
    }

    const playTimer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true
        try { audio.pause() } catch {}
        cleanup()
        reject(new Error('音声再生がタイムアウトしました。'))
      }
    }, 15000)

    audio.onended = () => {
      if (!isSettled) {
        isSettled = true
        cleanup()
        resolve()
      }
    }

    audio.onerror = () => {
      if (!isSettled) {
        isSettled = true
        cleanup()
        reject(new Error('音声の再生に失敗しました。'))
      }
    }

    audio.play().catch((err) => {
      if (!isSettled) {
        isSettled = true
        cleanup()
        reject(err)
      }
    })
  })
}

/**
 * 1. VOICEVOX (TTS Quest) 再生制御 (リトライ待機を1秒に短縮)
 */
async function playTtsQuestWithRetry(
  text: string,
  volume: number,
  speakerId: number = 3,
  apiKey: string = ''
): Promise<void> {
  let lastError: any = null

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await attemptPlayTtsQuest(text, volume, speakerId, apiKey)
      return
    } catch (err) {
      lastError = err
      console.warn(`VOICEVOX 通信・再生エラー (試行 ${attempt}/2):`, err)
      if (attempt < 2) {
        await new Promise((res) => setTimeout(res, 1000))
      }
    }
  }

  throw new Error(`VOICEVOXの取得に失敗しました。(${lastError})`)
}

/**
 * 2. Google Cloud TTS での再生
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
 * メイン読み上げ関数 (フォールバックなし)
 */
async function executeSpeak(
  text: string,
  provider: TtsProvider,
  volume: number,
  options?: TtsOptions
): Promise<void> {
  const opts = { ...globalTtsOptions, ...options }

  if (provider === 'ttsQuest' || provider.startsWith('voicevox_')) {
    let speakerId = opts.speakerId || 3
    if (provider.startsWith('voicevox_')) {
      const parsedId = parseInt(provider.replace('voicevox_', ''), 10)
      if (!isNaN(parsedId)) speakerId = parsedId
    }
    await playTtsQuestWithRetry(text, volume, speakerId, opts.ttsQuestApiKey || '')
    return
  }

  if (provider === 'googleCloud') {
    await playGoogleCloudTts(
      text,
      volume,
      opts.googleTtsApiKey || '',
      opts.googleVoiceName || 'ja-JP-Neural2-B',
      opts.googlePitch || 0
    )
    return
  }

  await playWebSpeech(text, volume)
}

/**
 * 外部から呼ばれるキュー登録用関数
 */
export function speak(
  text: string,
  provider: TtsProvider,
  volume: number,
  options?: TtsOptions
): Promise<void> {
  if (!text.trim()) return Promise.resolve()

  return new Promise((resolve) => {
    const isDuplicate = speechQueue.some(
      (task) => task.text === text && task.provider === provider
    )
    if (isDuplicate) {
      console.warn('重複リクエストを破棄しました。')
      resolve()
      return
    }

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