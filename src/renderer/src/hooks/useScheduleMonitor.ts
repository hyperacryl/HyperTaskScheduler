import { useEffect, useRef } from 'react'
import { Task, AnnounceTemplates } from '../types'
import { playNotification, TtsProvider } from '../services/audioService'

export function useScheduleMonitor(
  tasks: Task[],
  ttsProvider: TtsProvider,
  volume: number,
  preNotifyMinutes: number,
  timeOffset: number,
  templates: AnnounceTemplates,
  autoCompleteEnabled: boolean = false,
  onAutoTaskComplete?: (id: string) => void
): void {
  const triggeredEventsRef = useRef<Set<string>>(new Set())
  const autoCompletedSetRef = useRef<Set<string>>(new Set())

  // 再レンダリングに伴うタイマーの不要な再生成を防ぐため、最新の参照を保持
  const tasksRef = useRef<Task[]>(tasks)
  tasksRef.current = tasks

  const onAutoTaskCompleteRef = useRef(onAutoTaskComplete)
  onAutoTaskCompleteRef.current = onAutoTaskComplete

  const templatesRef = useRef(templates)
  templatesRef.current = templates

  const ttsProviderRef = useRef(ttsProvider)
  ttsProviderRef.current = ttsProvider

  const volumeRef = useRef(volume)
  volumeRef.current = volume

  const preNotifyMinutesRef = useRef(preNotifyMinutes)
  preNotifyMinutesRef.current = preNotifyMinutes

  const autoCompleteEnabledRef = useRef(autoCompleteEnabled)
  autoCompleteEnabledRef.current = autoCompleteEnabled

  useEffect(() => {
    const interval = setInterval(() => {
      const virtualNowMs = Date.now() + timeOffset
      const vNow = new Date(virtualNowMs)

      // 仮想時刻の年月日を基準にパースして日時の不整合を解消
      const parseTime = (timeStr: string): number => {
        const [h, m] = timeStr.split(':').map(Number)
        const d = new Date(vNow.getFullYear(), vNow.getMonth(), vNow.getDate(), h, m, 0, 0)
        return d.getTime()
      }

      const currentTasks = tasksRef.current

      currentTasks.forEach((task, index) => {
        if (task.completed || !task.startTime || !task.endTime) return

        const startMs = parseTime(task.startTime)
        let endMs = parseTime(task.endTime)
        if (endMs < startMs) endMs += 24 * 60 * 60 * 1000

        const isBreak = Boolean(task.isBreak) || task.title.includes('休憩') || task.title.toLowerCase().includes('break')
        const nextTask = currentTasks[index + 1]
        const nextTitle = nextTask ? nextTask.title : '次のタスク'

        // 1. 開始予定時刻の5秒前トリガー
        const startTriggerKey = `${task.id}-start`
        if (virtualNowMs >= startMs - 5000 && virtualNowMs < startMs + 10000) {
          if (!triggeredEventsRef.current.has(startTriggerKey)) {
            triggeredEventsRef.current.add(startTriggerKey)
            const templateText = isBreak 
              ? (templatesRef.current.breakStart || '休憩時間です。') 
              : (templatesRef.current.taskStart || '{title} を開始します。')
            const text = templateText
              .replace('{title}', task.title)
              .replace('{minutes}', Math.round((endMs - startMs) / 60000).toString())
            playNotification(text, ttsProviderRef.current, volumeRef.current)
          }
        }

        // 2. 事前通知トリガー
        const preMin = preNotifyMinutesRef.current
        if (!isBreak && preMin > 0 && task.estimatedMinutes > preMin) {
          const preNotifyMs = endMs - preMin * 60 * 1000
          const preNotifyTriggerKey = `${task.id}-prenotify`
          if (virtualNowMs >= preNotifyMs - 5000 && virtualNowMs < preNotifyMs + 10000) {
            if (!triggeredEventsRef.current.has(preNotifyTriggerKey)) {
              triggeredEventsRef.current.add(preNotifyTriggerKey)
              const templateText = isBreak
                ? (templatesRef.current.breakPreEnd || 'まもなく休憩が終了します。次は {nextTitle} です。')
                : (templatesRef.current.taskPreEnd || '{title} 終了まであと {minutes} 分です。')
              const text = templateText
                .replace('{title}', task.title)
                .replace('{minutes}', preMin.toString())
                .replace('{nextTitle}', nextTitle)
              playNotification(text, ttsProviderRef.current, volumeRef.current)
            }
          }
        }

        // 3. 終了予定時刻の5秒前トリガー
        const endTriggerKey = `${task.id}-end`
        if (virtualNowMs >= endMs - 5000 && virtualNowMs < endMs + 10000) {
          if (!triggeredEventsRef.current.has(endTriggerKey)) {
            triggeredEventsRef.current.add(endTriggerKey)
            const templateText = isBreak
              ? (templatesRef.current.breakPreEnd || '休憩時間が終了しました。')
              : (templatesRef.current.taskEnd || '{title} が終了しました。お疲れ様でした。')
            const text = templateText
              .replace('{title}', task.title)
              .replace('{nextTitle}', nextTitle)
            playNotification(text, ttsProviderRef.current, volumeRef.current)
          }
        }

        // 4. 終了時刻到達時の自動完了トリガー
        if (autoCompleteEnabledRef.current && onAutoTaskCompleteRef.current) {
          if (virtualNowMs >= endMs && !autoCompletedSetRef.current.has(task.id)) {
            autoCompletedSetRef.current.add(task.id)
            onAutoTaskCompleteRef.current(task.id)
          }
        }
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [timeOffset])
}