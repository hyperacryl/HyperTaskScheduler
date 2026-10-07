import { useEffect, useRef } from 'react'
import { Task } from '../types'
import { playNotification, TtsProvider } from '../services/audioService'

const parseTime = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.getTime()
}

const toReadableTime = (timeStr: string): string => {
  const [h, m] = timeStr.split(':').map(Number)
  if (m === 0) return `${h}時ちょうど`
  return `${h}時${m}分`
}

export const useScheduleMonitor = (
  tasks: Task[],
  ttsProvider: TtsProvider,
  volume: number,
  preNotifyMinutes: number,
  timeOffset: number = 0
): void => {
  const notifiedSet = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (tasks.length === 0) return

    const intervalId = setInterval(() => {
      const nowMs = Date.now() + timeOffset

      const isTriggerTime = (targetMs: number) => {
        const triggerMs = targetMs - 5000 // 5秒前
        const diff = triggerMs - nowMs
        return diff >= 0 && diff < 1000
      }

      tasks.forEach((task) => {
        if (task.completed || !task.startTime || !task.endTime) return

        const startTimeMs = parseTime(task.startTime)
        let endTimeMs = parseTime(task.endTime)
        
        if (endTimeMs < startTimeMs) {
          endTimeMs += 24 * 60 * 60 * 1000
        }

        // 1. 開始時刻の通知
        const startKey = `${task.id}-start`
        if (isTriggerTime(startTimeMs) && !notifiedSet.current.has(startKey)) {
          notifiedSet.current.add(startKey)
          const readableTime = toReadableTime(task.startTime)
          playNotification(`${readableTime}になりました。${task.title}を開始してください。`, ttsProvider, volume / 100, 5000)
        }

        // 2. 事前通知（タスク名に「休憩」が含まれる場合はスキップ）
        const isBreakTask = task.title.includes('休憩') || task.title.toLowerCase().includes('break')

        if (!isBreakTask && preNotifyMinutes > 0 && task.estimatedMinutes > preNotifyMinutes) {
          const preNotifyMs = endTimeMs - (preNotifyMinutes * 60 * 1000)
          const preNotifyKey = `${task.id}-prenotify`
          
          if (isTriggerTime(preNotifyMs) && !notifiedSet.current.has(preNotifyKey)) {
            notifiedSet.current.add(preNotifyKey)
            playNotification(`${task.title}の終了${preNotifyMinutes}分前です。終わらせる準備をしましょう。`, ttsProvider, volume / 100, 5000)
          }
        }

        // 3. 終了時刻の通知
        const finishKey = `${task.id}-finish`
        if (isTriggerTime(endTimeMs) && !notifiedSet.current.has(finishKey)) {
          notifiedSet.current.add(finishKey)
          playNotification(`時間です。${task.title}を終了してください。お疲れ様でした。`, ttsProvider, volume / 100, 5000)
        }
      })
    }, 1000)

    return () => clearInterval(intervalId)
  }, [tasks, ttsProvider, volume, preNotifyMinutes, timeOffset])
}