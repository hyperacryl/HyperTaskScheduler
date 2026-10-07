import { useState, useEffect, useRef, type JSX } from 'react'
import { generateSchedule } from '../services/aiService'
import { useScheduleMonitor } from '../hooks/useScheduleMonitor'
import { Task } from '../types'
import { TtsProvider } from '../services/audioService'

interface SchedulerProps {
  apiKey: string
  ttsProvider: TtsProvider
  volume: number
  preNotifyMinutes: number
}

export function Scheduler({
  apiKey,
  ttsProvider,
  volume,
  preNotifyMinutes
}: SchedulerProps): JSX.Element {
  const [taskInput, setTaskInput] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [timeOffset, setTimeOffset] = useState<number>(0)
  const [virtualTimeStr, setVirtualTimeStr] = useState<string>('')

  const [baseTime, setBaseTime] = useState<string>(() => {
    const now = new Date()
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  })
  const [tasks, setTasks] = useState<Task[]>([])
  const [isGenerating, setIsGenerating] = useState<boolean>(false)

  useEffect(() => {
    const intervalId = setInterval(() => {
      const virtualNow = new Date(Date.now() + timeOffset)
      const h = virtualNow.getHours().toString().padStart(2, '0')
      const m = virtualNow.getMinutes().toString().padStart(2, '0')
      const s = virtualNow.getSeconds().toString().padStart(2, '0')
      setVirtualTimeStr(`${h}:${m}:${s}`)
    }, 1000)
    return () => clearInterval(intervalId)
  }, [timeOffset])

  useScheduleMonitor(tasks, ttsProvider, volume, preNotifyMinutes, timeOffset)

  const handleSetNow = (): void => {
    const virtualNow = new Date(Date.now() + timeOffset)
    setBaseTime(
      `${virtualNow.getHours().toString().padStart(2, '0')}:${virtualNow.getMinutes().toString().padStart(2, '0')}`
    )
  }

  const addOffsetMinutes = (minutes: number): void =>
    setTimeOffset((prev) => prev + minutes * 60 * 1000)
  const resetOffset = (): void => setTimeOffset(0)

  const handleGenerate = async (): Promise<void> => {
    setErrorMessage('')
    try {
      setIsGenerating(true)
      const newTasks = await generateSchedule(taskInput, apiKey, baseTime)
      setTasks(newTasks)
      setTaskInput('')
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('予期せぬエラーが発生しました。')
      }
    } finally {
      setIsGenerating(false)
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 50)
    }
  }

  const toggleTaskStatus = (id: string): void => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)))
  }

  return (
    <section className="stack">
      <div className="grid-2">
        <article className="card">
          <p className="card-title">APP CLOCK</p>
          <h2>現在の時刻</h2>
          <div className="metric">{virtualTimeStr || '--:--:--'}</div>
          <p className="label">アプリ内の仮想時刻です</p>
        </article>

        <article className="card">
          <p className="card-title">START TIME</p>
          <h2>開始予定時刻</h2>
          <div className="row">
            <input
              type="time"
              value={baseTime}
              onChange={(e) => setBaseTime(e.target.value)}
              className="control"
            />
            <button onClick={handleSetNow} className="btn-ghost">
              現在時刻にする
            </button>
          </div>
        </article>
      </div>

      <article className="card">
        <p className="card-title">GENERATOR</p>
        <h2>タスク生成</h2>
        <div className="field">
          <textarea
            ref={textareaRef}
            value={taskInput}
            onChange={(e) => {
              setTaskInput(e.target.value)
              if (errorMessage) setErrorMessage('')
            }}
            placeholder="例: 会議の資料作成、メール返信3件、経費精算"
            className="control"
          />

          {errorMessage && <div className="error-banner">⚠️ {errorMessage}</div>}

          <button onClick={handleGenerate} disabled={isGenerating} className="btn">
            {isGenerating ? 'AIがスケジュールを生成中...' : 'スケジュールを自動生成'}
          </button>
        </div>
      </article>

      {tasks.length > 0 && (
        <article className="card">
          <p className="card-title">TIMELINE</p>
          <h3>タイムスケジュール</h3>
          <ul className="task-list">
            {tasks.map((task) => (
              <li key={task.id} className={`task-item${task.completed ? ' is-done' : ''}`}>
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleTaskStatus(task.id)}
                />
                <span className="task-time">
                  {task.startTime} - {task.endTime}
                </span>
                <span className="task-title">
                  {task.title} ({task.estimatedMinutes}分)
                </span>
              </li>
            ))}
          </ul>
        </article>
      )}

      <article className="card debug-card">
        <p className="debug-title">🐞 デバッグ操作 (時間を早送り)</p>
        <div className="row">
          <button className="debug-btn" onClick={() => addOffsetMinutes(1)}>
            +1分進める
          </button>
          <button className="debug-btn" onClick={() => addOffsetMinutes(5)}>
            +5分進める
          </button>
          <button className="debug-btn reset" onClick={resetOffset}>
            現実時間に戻す
          </button>
        </div>
      </article>
    </section>
  )
}
