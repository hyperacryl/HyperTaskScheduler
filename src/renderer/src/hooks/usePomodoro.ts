import { useState, useEffect, useRef, useCallback } from 'react'
import { playNotification, TtsProvider } from '../services/audioService'
import { AnnounceTemplates } from '../types'

export interface PomodoroOptions {
  autoCycleEnabled: boolean
  targetCycles: number // 0 = 無制限
  onCycleComplete?: (completedCount: number) => void
}

export const usePomodoro = (
  ttsProvider: TtsProvider,
  volume: number,
  preNotifyMinutes: number,
  templates: AnnounceTemplates,
  options?: PomodoroOptions
) => {
  const [workMinutes, setWorkMinutes] = useState(25)
  const [breakMinutes, setBreakMinutes] = useState(5)

  const [autoCycleEnabled, setAutoCycleEnabled] = useState(options?.autoCycleEnabled ?? true)
  const [targetCycles, setTargetCycles] = useState(options?.targetCycles ?? 0)
  const [completedCycles, setCompletedCycles] = useState(0)

  const [mode, setMode] = useState<'work' | 'break'>('work')
  const [timeLeft, setTimeLeft] = useState(workMinutes * 60)
  const [isRunning, setIsRunning] = useState(false)

  const preNotified = useRef(false)
  const endNotified = useRef(false)

  useEffect(() => {
    if (options?.autoCycleEnabled !== undefined) {
      setAutoCycleEnabled(options.autoCycleEnabled)
    }
    if (options?.targetCycles !== undefined) {
      setTargetCycles(options.targetCycles)
    }
  }, [options?.autoCycleEnabled, options?.targetCycles])

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

  const resetTimer = useCallback(() => {
    setIsRunning(false)
    setTimeLeft(mode === 'work' ? workMinutes * 60 : breakMinutes * 60)
    preNotified.current = false
    endNotified.current = false
  }, [mode, workMinutes, breakMinutes])

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
      const templateText = templates.pomodoroWorkPreEnd || '作業終了まであと {minutes} 分です。仕上げに入りましょう。'
      const speech = templateText
        .replace('{minutes}', preNotifyMinutes.toString())
        .replace('{title}', 'ポモドーロ作業')
      playNotification(speech, ttsProvider, volume)
    }
  }, [timeLeft, isRunning, mode, preNotifyMinutes, ttsProvider, volume, templates])

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

      // 全セット完了チェック
      if (targetCycles > 0 && nextCompleted >= targetCycles) {
        nextShouldRun = false
        const speech = templates.pomodoroAllCompleted || 'すべてのセットが終了しました。お疲れ様でした。'
        playNotification(speech, ttsProvider, volume)
      } else {
        const templateText = templates.pomodoroBreakStart || '{minutes} 分間の休憩です。作業を止めてリフレッシュしてください。'
        const speech = templateText.replace('{minutes}', breakMinutes.toString())
        playNotification(speech, ttsProvider, volume)
        nextShouldRun = autoCycleEnabled
      }
    } else {
      // 休憩終了時（作業開始）
      const speech = templates.pomodoroWorkStart || 'ポモドーロ作業を開始します。'
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
    templates
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