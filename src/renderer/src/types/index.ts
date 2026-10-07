export interface Task {
  id: string
  title: string
  estimatedMinutes: number
  startTime: string // 例: "14:00"
  endTime: string   // 例: "14:25"
  completed: boolean
}