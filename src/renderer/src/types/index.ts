export interface Task {
  id: string
  title: string
  estimatedMinutes: number
  startTime: string // 例: "14:00"
  endTime: string   // 例: "14:25"
  completed: boolean
}

export interface AnnounceTemplates {
  taskStart: string
  taskPreNotify: string
  taskEnd: string
  pomodoroWorkStart: string
  pomodoroBreakStart: string
  pomodoroBreakEnd: string
}