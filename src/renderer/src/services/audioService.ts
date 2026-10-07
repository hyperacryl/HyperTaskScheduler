export type TtsProvider = 'webSpeech' | 'voicevox_3' | 'voicevox_2' | 'voicevox_8' | 'voicevox_14'

interface QueueItem {
  text: string
  provider: TtsProvider
  volume: number
  delayMs: number
  callStart: number
}

const audioQueue: QueueItem[] = []
let isProcessingQueue = false

const processQueue = async (): Promise<void> => {
  if (isProcessingQueue || audioQueue.length === 0) return

  isProcessingQueue = true
  const item = audioQueue.shift()!

  const elapsed = Date.now() - item.callStart
  const remaining = Math.max(0, item.delayMs - elapsed)

  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining))
  }

  try {
    await playAudioItem(item.text, item.provider, item.volume)
  } catch (error) {
    console.error('音声再生エラー:', error)
  } finally {
    isProcessingQueue = false
    processQueue()
  }
}

// VOICEVOX APIの音声生成完了を最大5秒間リトライ待ちする関数
const fetchVoicevoxAudioUrl = async (text: string, speakerId: string): Promise<string | null> => {
  const apiUrl = `https://api.tts.quest/v3/voicevox/synthesis?text=${encodeURIComponent(text)}&speaker=${speakerId}`
  
  for (let i = 0; i < 10; i++) {
    try {
      const res = await fetch(apiUrl)
      if (!res.ok) return null
      const data = await res.json()
      
      if (data.mp3StreamingUrl) {
        return data.mp3StreamingUrl
      }
      
      // 生成中の場合は500ms待ってリトライ
      await new Promise((resolve) => setTimeout(resolve, 500))
    } catch {
      return null
    }
  }
  return null
}

const playAudioItem = (text: string, provider: TtsProvider, volume: number): Promise<void> => {
  return new Promise((resolve) => {
    if (provider === 'webSpeech') {
      const synth = window.speechSynthesis
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'ja-JP'
      utterance.volume = volume

      const voices = synth.getVoices()
      const jaVoice = voices.find((v) => v.lang === 'ja-JP' || v.lang.includes('ja'))
      if (jaVoice) utterance.voice = jaVoice

      utterance.onend = () => resolve()
      utterance.onerror = () => resolve()
      synth.speak(utterance)
      return
    }

    if (provider.startsWith('voicevox_')) {
      const speakerId = provider.split('_')[1]

      fetchVoicevoxAudioUrl(text, speakerId)
        .then(async (audioUrl) => {
          if (!audioUrl) {
            resolve()
            return
          }
          const audioRes = await fetch(audioUrl)
          const blob = await audioRes.blob()
          const objectUrl = URL.createObjectURL(blob)

          const audio = new Audio(objectUrl)
          audio.volume = volume

          audio.onended = () => {
            URL.revokeObjectURL(objectUrl)
            resolve()
          }
          audio.onerror = () => {
            URL.revokeObjectURL(objectUrl)
            resolve()
          }

          audio.play().catch(() => resolve())
        })
        .catch((err) => {
          console.error('VOICEVOX再生失敗:', err)
          resolve()
        })
    }
  })
}

export const playNotification = (
  text: string,
  provider: TtsProvider,
  volume: number = 0.5,
  delayMs: number = 0
): void => {
  audioQueue.push({
    text,
    provider,
    volume,
    delayMs,
    callStart: Date.now()
  })

  processQueue()
}