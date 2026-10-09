export interface Task {
  id: string
  title: string
  startTime: string
  endTime: string
  estimatedMinutes: number
  completed: boolean
  isBreak?: boolean // 手動で追加された休憩タスクかの識別フラグ
}

export interface AnnounceTemplates {
  taskStart: string       // タスク開始時
  taskPreEnd: string      // タスク終了前
  taskEnd: string         // タスク終了時
  breakStart: string      // 休憩開始時
  breakPreEnd: string     // 休憩終了前
  allCompleted: string    // 全タスク完了時
}