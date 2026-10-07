import { useState, useEffect, useRef, useCallback } from 'react'
import { playNotification, TtsProvider } from '../services/audioService'

export const usePomodoro = (
  ttsProvider: TtsProvider,
  volume: number,
  preNotifyMinutes: number
) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [mode, setMode] = useState<'work' | 'break'>('work')
  const preNotified = useRef(false)

  const toggleTimer = () => setIsRunning((prev) => !prev)

  const resetTimer = useCallback(() => {
    setIsRunning(false)
    setTimeLeft(mode === 'work' ? 25 * 60 : 5 * 60)
    preNotified.current = false
  }, [mode])

  const switchMode = (newMode: 'work' | 'break') => {
    setMode(newMode)
    setIsRunning(false)
    setTimeLeft(newMode === 'work' ? 25 * 60 : 5 * 60)
    preNotified.current = false
  }

  // 🐞 デバッグ用：残り時間を強制的に変更
  const debugSetTimeLeft = (seconds: number) => {
    setTimeLeft(seconds)
  }

  useEffect(() => {
    if (!isRunning) return

    const intervalId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // 自動で次のタイマーを進めたい場合は、下の行をコメントアウトしてください
          setIsRunning(false) 
          
          const nextMode = mode === 'work' ? 'break' : 'work'
          if (mode === 'work') {
            playNotification('作業時間が終了しました。5分間の休憩に入ってください。', ttsProvider, volume / 100, 0)
          } else {
            playNotification('休憩が終了しました。作業を再開しましょう。', ttsProvider, volume / 100, 0)
          }
          
          setMode(nextMode)
          preNotified.current = false
          return nextMode === 'work' ? 25 * 60 : 5 * 60
        }

        if (
          mode === 'work' &&
          preNotifyMinutes > 0 &&
          prev === preNotifyMinutes * 60 &&
          !preNotified.current
        ) {
          preNotified.current = true
          playNotification(
            `作業終了の${preNotifyMinutes}分前です。キリのいいところで終わらせる準備をしましょう。`,
            ttsProvider, volume / 100, 0
          )
        }

        return prev - 1
      })
    }, 1000)

    return () => clearInterval(intervalId)
  }, [isRunning, mode, preNotifyMinutes, ttsProvider, volume])

  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0')
  const seconds = (timeLeft % 60).toString().padStart(2, '0')

  return { minutes, seconds, isRunning, mode, toggleTimer, resetTimer, switchMode, debugSetTimeLeft }
}