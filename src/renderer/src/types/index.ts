export interface Task {
  id: string
  title: string
  startTime: string
  endTime: string
  estimatedMinutes: number
  completed: boolean
  isBreak?: boolean
}

export interface AnnounceTemplates {
  // スケジューラー用
  taskStart: string
  taskPreEnd: string
  taskEnd: string
  breakStart: string
  breakPreEnd: string
  allCompleted: string

  // ポモドーロ用
  pomodoroWorkStart?: string
  pomodoroWorkPreEnd?: string
  pomodoroBreakStart?: string
  pomodoroBreakPreEnd?: string
  pomodoroAllCompleted?: string
}