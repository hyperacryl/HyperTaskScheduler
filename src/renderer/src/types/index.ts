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
  taskStart: string       // 1. タスク開始時 ({title})
  taskPreEnd: string      // 2. タスク終了前 ({title}, {minutes})
  taskEnd: string         // 3. タスク終了時 ({title})
  breakStart: string      // 4. 休憩開始時 ({minutes})
  breakPreEnd: string     // 5. 休憩終了前 ({minutes}, {nextTitle})
  allCompleted: string    // 6. 全タスク完了時
}