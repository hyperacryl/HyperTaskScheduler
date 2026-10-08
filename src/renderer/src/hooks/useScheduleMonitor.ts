import { useEffect, useRef } from 'react'
import { Task } from '../types'
import { playNotification, TtsProvider } from '../services/audioService'
import { AnnounceTemplates } from '../App'

export function useScheduleMonitor(
  tasks: Task[],
  ttsProvider: TtsProvider,
  volume: number,
  preNotifyMinutes: number,
  timeOffset: number,
  templates: AnnounceTemplates
): void {
  const triggeredEventsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const interval = setInterval(() => {
      const virtualNowMs = Date.now() + timeOffset

      tasks.forEach((task) => {
        if (task.completed || !task.startTime || !task.endTime) return

        const parseTime = (timeStr: string) => {
          const [h, m] = timeStr.split(':').map(Number)
          const d = new Date()
          d.setHours(h, m, 0, 0)
          return d.getTime()
        }

        const startMs = parseTime(task.startTime)
        let endMs = parseTime(task.endTime)
        if (endMs < startMs) endMs += 24 * 60 * 60 * 1000

        // 開始予定時刻の5秒前トリガー
        const startTriggerKey = `${task.id}-start`
        if (virtualNowMs >= startMs - 5000 && virtualNowMs < startMs + 10000) {
          if (!triggeredEventsRef.current.has(startTriggerKey)) {
            triggeredEventsRef.current.add(startTriggerKey)
            const text = (templates.taskStart || '{title}の時間です。').replace('{title}', task.title)
            playNotification(text, ttsProvider, volume / 100, 0)
          }
        }

        // 事前通知（終了のpreNotifyMinutes分前の、さらに5秒前）トリガー
        const isBreak = task.title.includes('休憩') || task.title.toLowerCase().includes('break')
        if (!isBreak && preNotifyMinutes > 0 && task.estimatedMinutes > preNotifyMinutes) {
          const preNotifyMs = endMs - preNotifyMinutes * 60 * 1000
          const preNotifyTriggerKey = `${task.id}-prenotify`
          if (virtualNowMs >= preNotifyMs - 5000 && virtualNowMs < preNotifyMs + 10000) {
            if (!triggeredEventsRef.current.has(preNotifyTriggerKey)) {
              triggeredEventsRef.current.add(preNotifyTriggerKey)
              const text = (templates.taskPreNotify || 'まもなく{title}が終了します。').replace('{title}', task.title)
              playNotification(text, ttsProvider, volume / 100, 0)
            }
          }
        }

        // 終了予定時刻の5秒前トリガー
        const endTriggerKey = `${task.id}-end`
        if (virtualNowMs >= endMs - 5000 && virtualNowMs < endMs + 10000) {
          if (!triggeredEventsRef.current.has(endTriggerKey)) {
            triggeredEventsRef.current.add(endTriggerKey)
            const text = isBreak
              ? (templates.pomodoroBreakEnd || '休憩時間が終了しました。次の作業を始めましょう。')
              : (templates.taskEnd || '{title}の時間になりました。').replace('{title}', task.title)
            playNotification(text, ttsProvider, volume / 100, 0)
          }
        }
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [tasks, ttsProvider, volume, preNotifyMinutes, timeOffset, templates])
}