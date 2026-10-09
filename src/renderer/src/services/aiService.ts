import { Task } from '../types'

// HH:mm に分数を加算するヘルパー
const addMinutesToTime = (timeStr: string, minutesToAdd: number): string => {
  const [h, m] = timeStr.split(':').map(Number)
  const date = new Date()
  date.setHours(h, m + minutesToAdd, 0, 0)
  const resH = date.getHours().toString().padStart(2, '0')
  const resM = date.getMinutes().toString().padStart(2, '0')
  return `${resH}:${resM}`
}

/**
 * Gemini API を呼び出して入力プロンプトからタスクスケジュールを自動生成
 */
export async function generateSchedule(
  prompt: string,
  apiKey: string,
  baseTime: string
): Promise<Task[]> {
  if (!prompt.trim()) {
    throw new Error('プロンプトが空です。')
  }
  if (!apiKey.trim()) {
    throw new Error('Gemini APIキーが設定されていません。設定画面で入力してください。')
  }

  const systemInstruction = `あなたは優秀なタスク自動スケジューラーです。
ユーザーの入力テキストから具体的なタスク項目と予測所要時間を抽出し、指定された基準開始時刻（${baseTime}）から連続するタイムスケジュールを作成してください。
出力は必ず以下のJSON配列形式のみで返してください。Markdownの装飾や余計な解説文は一切含めないでください。

[
  {
    "title": "タスク名",
    "estimatedMinutes": 30,
    "startTime": "HH:MM",
    "endTime": "HH:MM"
  }
]`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: `${systemInstruction}\n\nユーザー指示: ${prompt}` }]
          }
        ]
      })
    }
  )

  if (!response.ok) {
    throw new Error(`Gemini API エラー: ${response.statusText} (${response.status})`)
  }

  const data = await response.json()
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  const cleanedJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim()

  let generatedList: any[]
  try {
    generatedList = JSON.parse(cleanedJson)
  } catch {
    throw new Error('AIからの応答をJSON形式に解析できませんでした。')
  }

  if (!Array.isArray(generatedList)) {
    throw new Error('AIからの応答が配列形式ではありません。')
  }

  let currentStartTime = baseTime
  const tasks: Task[] = generatedList.map((item, index) => {
    const duration = typeof item.estimatedMinutes === 'number' && item.estimatedMinutes > 0 ? item.estimatedMinutes : 30
    const startTime = item.startTime || currentStartTime
    const endTime = item.endTime || addMinutesToTime(startTime, duration)
    currentStartTime = endTime

    return {
      id: `${Date.now()}-${index}`,
      title: item.title || '無題のタスク',
      startTime,
      endTime,
      estimatedMinutes: duration,
      completed: false
    }
  })

  return tasks
}