import { Task } from '../types'

const addMinutesToTime = (timeStr: string, minutesToAdd: number): string => {
  const [h, m] = timeStr.split(':').map(Number)
  const date = new Date()
  date.setHours(h, m + minutesToAdd, 0, 0)
  const resH = date.getHours().toString().padStart(2, '0')
  const resM = date.getMinutes().toString().padStart(2, '0')
  return `${resH}:${resM}`
}

/**
 * タスク一覧に自動小休憩を挿入し、スケジュール時刻をすべて同期再計算する
 */
export function applyAutoBreaks(
  tasks: Task[],
  autoBreakEnabled: boolean,
  breakMinutes: number
): Task[] {
  if (tasks.length === 0) return []

  // 1. 既存の「自動挿入された小休憩」を取り除き、作業タスクおよび手動休憩タスクのみ抽出
  const rawTasks = tasks.filter((t) => !t.id.startsWith('auto-break-'))
  if (rawTasks.length === 0) return []

  const result: Task[] = []
  let currentStartTime = rawTasks[0].startTime

  rawTasks.forEach((task, index) => {
    const isLast = index === rawTasks.length - 1
    const duration = task.estimatedMinutes || 30
    const startTime = currentStartTime
    const endTime = addMinutesToTime(startTime, duration)

    // 本来のタスク
    result.push({
      ...task,
      startTime,
      endTime
    })

    currentStartTime = endTime

    // 自動小休憩の割り込み処理（作業タスク直後 & 最後のタスクでない場合）
    const isWorkTask = !task.isBreak && !task.title.includes('休憩')
    if (autoBreakEnabled && isWorkTask && !isLast && breakMinutes > 0) {
      const breakStartTime = currentStartTime
      const breakEndTime = addMinutesToTime(breakStartTime, breakMinutes)

      result.push({
        id: `auto-break-${task.id}`,
        title: '☕ 小休憩',
        startTime: breakStartTime,
        endTime: breakEndTime,
        estimatedMinutes: breakMinutes,
        completed: false,
        isBreak: true
      })

      currentStartTime = breakEndTime
    }
  })

  return result
}