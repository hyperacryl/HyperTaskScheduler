import { Task } from '../types'

// 作成した Cloudflare Worker のURL
const RELAY_WORKER_URL = 'https://hyper-task.nakagawahayato-music.workers.dev'

export async function generateSchedule(
  prompt: string,
  baseTime: string
): Promise<Task[]> {
  const response = await fetch(RELAY_WORKER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt,
      baseTime
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `通信エラーが発生しました (${response.status})`)
  }

  const generatedTasks: Array<{
    title: string
    startTime: string
    endTime: string
    estimatedMinutes: number
  }> = await response.json()

  return generatedTasks.map((task, index) => ({
    id: `task-${Date.now()}-${index}`,
    title: task.title,
    startTime: task.startTime,
    endTime: task.endTime,
    estimatedMinutes: task.estimatedMinutes,
    completed: false,
    isBreak: false
  }))
}