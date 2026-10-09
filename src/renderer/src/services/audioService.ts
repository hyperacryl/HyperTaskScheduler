export type TtsProvider = 'webSpeech' | 'googleCloud' | 'voicevox_3' | 'voicevox_2' | 'voicevox_8' | 'voicevox_14'

let cachedVoices: SpeechSynthesisVoice[] = []
let currentAudio: HTMLAudioElement | null = null

/**
 * 現在再生中の音声の音量をリアルタイムで変更します
 */
export const setLiveVolume = (volume: number): void => {
  const normalizedVolume = volume <= 1 ? Math.max(0, Math.min(1, volume)) : Math.max(0, Math.min(1, volume / 100))
  if (currentAudio) {
    currentAudio.volume = normalizedVolume
  }
}

const getVoicesAsync = (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve([])
      return
    }
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      cachedVoices = voices
      resolve(voices)
      return
    }
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices()
      resolve(cachedVoices)
    }
    setTimeout(() => {
      resolve(window.speechSynthesis.getVoices())
    }, 500)
  })
}

export const speakText = async (
  text: string, 
  provider: TtsProvider, 
  volume: number = 50,
  _offset: number = 0,
  voiceName: string = 'ja-JP-Neural2-B',
  pitch: number = 0
): Promise<void> => {
  if (!text || volume === 0) return

  const normalizedVolume = volume <= 1 ? Math.max(0, Math.min(1, volume)) : Math.max(0, Math.min(1, volume / 100))

  // 既存再生中の音声を停止
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }

  // Google Cloud TTS の処理
  if (provider === 'googleCloud') {
    const apiKey = localStorage.getItem('ht_google_tts_api_key') || ''
    if (!apiKey) {
      console.warn('⚠️ Google Cloud TTS APIキーが設定されていません。Web Speech API にフォールバックします。')
    } else {
      try {
        const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text: text },
            voice: { languageCode: 'ja-JP', name: voiceName },
            audioConfig: { 
              audioEncoding: 'MP3',
              pitch: pitch // ピッチ（-20.0 ～ 20.0）を設定
            }
          })
        })
        
        if (!response.ok) throw new Error(`Google Cloud TTS API エラー: ${response.statusText}`)
        
        const data = await response.json()
        const audioSrc = `data:audio/mp3;base64,${data.audioContent}`
        
        const audio = new Audio(audioSrc)
        audio.volume = normalizedVolume
        currentAudio = audio
        
        audio.onended = () => {
          if (currentAudio === audio) currentAudio = null
        }

        await audio.play()
        return
      } catch (error) {
        console.warn('⚠️ Google Cloud TTSの呼び出しに失敗しました。Web Speech API にフォールバックします:', error)
      }
    }
  }

  // VOICEVOX の処理
  if (provider.startsWith('voicevox_')) {
    const speakerId = parseInt(provider.replace('voicevox_', ''), 10)
    const hosts = ['http://127.0.0.1:50021', 'http://localhost:50021']
    let success = false

    for (const host of hosts) {
      try {
        const queryRes = await fetch(`${host}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`, {
          method: 'POST'
        })
        if (!queryRes.ok) continue
        const queryData = await queryRes.json()

        const synthRes = await fetch(`${host}/synthesis?speaker=${speakerId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(queryData)
        })
        if (!synthRes.ok) continue

        const audioBlob = await synthRes.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)
        audio.volume = normalizedVolume
        currentAudio = audio

        audio.onended = () => {
          if (currentAudio === audio) currentAudio = null
        }

        await audio.play()
        success = true
        break
      } catch {
        // 次のホストを試行
      }
    }

    if (success) return
    console.warn('⚠️ VOICEVOX に接続できません。Web Speech API にフォールバックします。')
  }

  // Web Speech API（Windows標準音声へのフォールバック）
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.volume = normalizedVolume
    utterance.lang = 'ja-JP'

    const voices = cachedVoices.length > 0 ? cachedVoices : await getVoicesAsync()
    const jaVoice = voices.find((v) => v.lang.includes('ja') || v.lang.includes('JP'))
    if (jaVoice) {
      utterance.voice = jaVoice
    }

    window.speechSynthesis.speak(utterance)
  }
}

export const playNotification = async (
  text: string, 
  provider: TtsProvider, 
  volume: number = 50,
  offset: number = 0,
  voiceName: string = 'ja-JP-Neural2-B',
  pitch: number = 0
): Promise<void> => {
  await speakText(text, provider, volume, offset, voiceName, pitch)
}