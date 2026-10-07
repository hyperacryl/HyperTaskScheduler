import type { JSX } from 'react'
import { usePomodoro } from '../hooks/usePomodoro'
import { TtsProvider } from '../services/audioService'

interface PomodoroProps {
  ttsProvider: TtsProvider
  volume: number
  preNotifyMinutes: number
}

export function Pomodoro({ ttsProvider, volume, preNotifyMinutes }: PomodoroProps): JSX.Element {
  const {
    minutes,
    seconds,
    isRunning,
    mode,
    toggleTimer,
    resetTimer,
    switchMode,
    debugSetTimeLeft
  } = usePomodoro(ttsProvider, volume, preNotifyMinutes)

  return (
    <section className="pomodoro-wrap">
      <article className="card pomodoro-card">
        <p className="card-title">FOCUS SESSION</p>
        <h2>ポモドーロタイマー</h2>

        <div className="mode-tabs">
          <button
            className={`mode-btn${mode === 'work' ? ' is-work' : ''}`}
            onClick={() => switchMode('work')}
          >
            作業 (25分)
          </button>
          <button
            className={`mode-btn${mode === 'break' ? ' is-break' : ''}`}
            onClick={() => switchMode('break')}
          >
            休憩 (5分)
          </button>
        </div>

        <div className="ring" />
        <div className="timer">
          {minutes}:{seconds}
        </div>

        <div className="controls">
          <button className={`btn${isRunning ? ' btn-pause' : ''}`} onClick={toggleTimer}>
            {isRunning ? '一時停止' : 'スタート'}
          </button>
          <button className="btn btn-reset" onClick={resetTimer}>
            リセット
          </button>
        </div>

        <div className="card debug-card" style={{ marginTop: '28px', textAlign: 'left' }}>
          <p className="debug-title">🐞 デバッグ操作</p>
          <div className="row">
            <button
              className="debug-btn"
              onClick={() => debugSetTimeLeft(preNotifyMinutes * 60 + 10)}
            >
              事前通知の10秒前にスキップ
            </button>
            <button className="debug-btn" onClick={() => debugSetTimeLeft(10)}>
              終了10秒前にスキップ
            </button>
          </div>
        </div>
      </article>
    </section>
  )
}
