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
 * OpenAI API (GPT) を呼び出して入力プロンプトからタスクスケジュールを自動生成
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
    throw new Error('OpenAI APIキーが設定されていません。設定画面で入力してください。')
  }

  const systemInstruction = `あなたは優秀なタスク自動スケジューラーです。
ユーザーの入力テキストから具体的なタスク項目と予測所要時間を抽出し、指定された基準開始時刻（${baseTime}）から連続するタイムスケジュールを作成してください。
出力は必ず {"tasks": [...] } というJSONオブジェクト形式で返し、配列要素は以下の構造にしてください。

[
  {
    "title": "タスク名",
    "estimatedMinutes": 30,
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "isBreak": false
  }
]`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.trim()}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const msg = errorData?.error?.message || response.statusText
    throw new Error(`OpenAI API エラー: ${msg} (${response.status})`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''

  let parsed: any
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error('AIからの応答をJSON形式に解析できませんでした。')
  }

  const rawList = Array.isArray(parsed) ? parsed : parsed.tasks || parsed.schedule || []
  if (!Array.isArray(rawList)) {
    throw new Error('AIからの応答にタスク配列が含まれていません。')
  }

  let currentStartTime = baseTime
  const tasks: Task[] = rawList.map((item: any, index: number) => {
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
      completed: false,
      isBreak: Boolean(item.isBreak)
    }
  })

  return tasks
}