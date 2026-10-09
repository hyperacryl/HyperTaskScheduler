import { useEffect, useRef } from 'react'
import { Task, AnnounceTemplates } from '../types'
import { playNotification, TtsProvider } from '../services/audioService'

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

      tasks.forEach((task, index) => {
        if (task.completed || !task.startTime || !task.endTime) return

        const parseTime = (timeStr: string): number => {
          const [h, m] = timeStr.split(':').map(Number)
          const d = new Date()
          d.setHours(h, m, 0, 0)
          return d.getTime()
        }

        const startMs = parseTime(task.startTime)
        let endMs = parseTime(task.endTime)
        if (endMs < startMs) endMs += 24 * 60 * 60 * 1000

        const isBreak = Boolean(task.isBreak) || task.title.includes('休憩') || task.title.toLowerCase().includes('break')

        // 次のタスク名の取得
        const nextTask = tasks[index + 1]
        const nextTitle = nextTask ? nextTask.title : '次のタスク'

        // 1. 開始予定時刻の5秒前トリガー
        const startTriggerKey = `${task.id}-start`
        if (virtualNowMs >= startMs - 5000 && virtualNowMs < startMs + 10000) {
          if (!triggeredEventsRef.current.has(startTriggerKey)) {
            triggeredEventsRef.current.add(startTriggerKey)
            const templateText = isBreak 
              ? (templates.breakStart || '休憩時間です。') 
              : (templates.taskStart || '{title} を開始します。')
            const text = templateText
              .replace('{title}', task.title)
              .replace('{minutes}', Math.round((endMs - startMs) / 60000).toString())
            playNotification(text, ttsProvider, volume)
          }
        }

        // 2. 事前通知（終了のpreNotifyMinutes分前の、さらに5秒前）トリガー
        if (preNotifyMinutes > 0 && task.estimatedMinutes > preNotifyMinutes) {
          const preNotifyMs = endMs - preNotifyMinutes * 60 * 1000
          const preNotifyTriggerKey = `${task.id}-prenotify`
          if (virtualNowMs >= preNotifyMs - 5000 && virtualNowMs < preNotifyMs + 10000) {
            if (!triggeredEventsRef.current.has(preNotifyTriggerKey)) {
              triggeredEventsRef.current.add(preNotifyTriggerKey)
              const templateText = isBreak
                ? (templates.breakPreEnd || 'まもなく休憩が終了します。次は {nextTitle} です。')
                : (templates.taskPreEnd || '{title} 終了まであと {minutes} 分です。')
              const text = templateText
                .replace('{title}', task.title)
                .replace('{minutes}', preNotifyMinutes.toString())
                .replace('{nextTitle}', nextTitle)
              playNotification(text, ttsProvider, volume)
            }
          }
        }

        // 3. 終了予定時刻の5秒前トリガー
        const endTriggerKey = `${task.id}-end`
        if (virtualNowMs >= endMs - 5000 && virtualNowMs < endMs + 10000) {
          if (!triggeredEventsRef.current.has(endTriggerKey)) {
            triggeredEventsRef.current.add(endTriggerKey)
            const templateText = isBreak
              ? (templates.breakPreEnd || '休憩時間が終了しました。')
              : (templates.taskEnd || '{title} が終了しました。お疲れ様でした。')
            const text = templateText
              .replace('{title}', task.title)
              .replace('{nextTitle}', nextTitle)
            playNotification(text, ttsProvider, volume)
          }
        }
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [tasks, ttsProvider, volume, preNotifyMinutes, timeOffset, templates])
}