import { useState, useEffect, useRef, useCallback } from 'react'
import { playNotification, TtsProvider } from '../services/audioService'

export interface PomodoroOptions {
  autoCycleEnabled: boolean
  targetCycles: number // 0 = 無制限
  onCycleComplete?: (completedCount: number) => void
}

export const usePomodoro = (
  ttsProvider: TtsProvider,
  volume: number,
  preNotifyMinutes: number,
  options?: PomodoroOptions
) => {
  // プリセット時間の管理 (デフォルト: 25分 / 5分)
  const [workMinutes, setWorkMinutes] = useState(25)
  const [breakMinutes, setBreakMinutes] = useState(5)

  // 自動サイクル設定
  const [autoCycleEnabled, setAutoCycleEnabled] = useState(options?.autoCycleEnabled ?? true)
  const [targetCycles, setTargetCycles] = useState(options?.targetCycles ?? 0)
  const [completedCycles, setCompletedCycles] = useState(0)

  const [mode, setMode] = useState<'work' | 'break'>('work')
  const [timeLeft, setTimeLeft] = useState(workMinutes * 60)
  const [isRunning, setIsRunning] = useState(false)

  // 重複通知防止用のRefフラグ
  const preNotified = useRef(false)
  const endNotified = useRef(false)

  // 外部からのオプション変化を同期
  useEffect(() => {
    if (options?.autoCycleEnabled !== undefined) {
      setAutoCycleEnabled(options.autoCycleEnabled)
    }
    if (options?.targetCycles !== undefined) {
      setTargetCycles(options.targetCycles)
    }
  }, [options?.autoCycleEnabled, options?.targetCycles])

  // ずんだもん（voicevox_3）の場合に語尾を変更するヘルパー関数
  const formatSpeech = useCallback(
    (normalText: string, zundamonText: string) => {
      return ttsProvider === 'voicevox_3' ? zundamonText : normalText
    },
    [ttsProvider]
  )

  // プリセット切替関数 (15/3, 25/5, 52/17, 90/20)
  const changePreset = useCallback((work: number, brk: number) => {
    setWorkMinutes(work)
    setBreakMinutes(brk)
    setIsRunning(false)
    setMode('work')
    setTimeLeft(work * 60)
    preNotified.current = false
    endNotified.current = false
  }, [])

  const toggleTimer = () => setIsRunning((prev) => !prev)

  // リセットボタンが押された時
  const resetTimer = useCallback(() => {
    setIsRunning(false)
    setTimeLeft(mode === 'work' ? workMinutes * 60 : breakMinutes * 60)
    preNotified.current = false
    endNotified.current = false
  }, [mode, workMinutes, breakMinutes])

  // 作業 / 休憩タブ切り替え（タブ切り替えに合わせてタイマー数字も切り替える）
  const switchMode = useCallback((newMode: 'work' | 'break') => {
    setMode(newMode)
    setIsRunning(false)
    setTimeLeft(newMode === 'work' ? workMinutes * 60 : breakMinutes * 60)
    preNotified.current = false
    endNotified.current = false
  }, [workMinutes, breakMinutes])

  const debugSetTimeLeft = (seconds: number) => {
    endNotified.current = false
    preNotified.current = false
    setTimeLeft(Math.max(1, seconds))
  }

  const debugAddSeconds = (seconds: number) => {
    endNotified.current = false
    preNotified.current = false
    setTimeLeft((prev) => Math.max(1, prev + seconds))
  }

  // 1秒ごとのタイマーカウントダウン
  useEffect(() => {
    if (!isRunning) return

    const intervalId = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(intervalId)
  }, [isRunning])

  // 事前通知の判定 (作業モード時のみ)
  useEffect(() => {
    if (!isRunning) return

    if (
      mode === 'work' &&
      preNotifyMinutes > 0 &&
      timeLeft === preNotifyMinutes * 60 &&
      !preNotified.current
    ) {
      preNotified.current = true
      const speech = formatSpeech(
        `作業終了の${preNotifyMinutes}分前です。キリのいいところで終わらせる準備をしましょう。`,
        `作業終了の${preNotifyMinutes}分前なのだ。キリのいいところで終わらせる準備をするのだ！`
      )
      playNotification(speech, ttsProvider, volume)
    }
  }, [timeLeft, isRunning, mode, preNotifyMinutes, ttsProvider, volume, formatSpeech])

  // タイマー終了（0秒到達）時の処理と自動サイクル制御
  useEffect(() => {
    if (!isRunning || timeLeft > 0) return
    if (endNotified.current) return

    endNotified.current = true

    let nextShouldRun = false
    const nextMode: 'work' | 'break' = mode === 'work' ? 'break' : 'work'

    if (mode === 'work') {
      const nextCompleted = completedCycles + 1
      setCompletedCycles(nextCompleted)

      const speech = formatSpeech(
        `作業時間が終了しました。${breakMinutes}分間の休憩に入ってください。`,
        `作業時間が終了したのだ！${breakMinutes}分間の休憩に入るのだ！`
      )
      playNotification(speech, ttsProvider, volume)

      // 指定セット数に達したかどうかのチェック (targetCycles > 0 のとき)
      if (targetCycles > 0 && nextCompleted >= targetCycles) {
        nextShouldRun = false
      } else {
        nextShouldRun = autoCycleEnabled
      }
    } else {
      const speech = formatSpeech(
        '休憩が終了しました。作業を再開しましょう。',
        '休憩が終了したのだ！作業を再開するのだ！'
      )
      playNotification(speech, ttsProvider, volume)

      nextShouldRun = autoCycleEnabled
    }

    setMode(nextMode)
    setTimeLeft(nextMode === 'work' ? workMinutes * 60 : breakMinutes * 60)
    preNotified.current = false
    endNotified.current = false
    setIsRunning(nextShouldRun)
  }, [
    timeLeft,
    isRunning,
    mode,
    workMinutes,
    breakMinutes,
    autoCycleEnabled,
    targetCycles,
    completedCycles,
    ttsProvider,
    volume,
    formatSpeech
  ])

  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0')
  const seconds = (timeLeft % 60).toString().padStart(2, '0')

  return {
    minutes,
    seconds,
    timeLeft,
    isRunning,
    mode,
    workMinutes,
    breakMinutes,
    autoCycleEnabled,
    setAutoCycleEnabled,
    targetCycles,
    setTargetCycles,
    completedCycles,
    setCompletedCycles,
    toggleTimer,
    resetTimer,
    switchMode,
    changePreset,
    debugSetTimeLeft,
    debugAddSeconds
  }
}