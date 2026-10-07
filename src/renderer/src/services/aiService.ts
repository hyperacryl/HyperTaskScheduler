import type { Task } from '../types'

interface OpenAIChatResponse {
  choices?: Array<{
    message?: {
      content?: string | null
    }
  }>
}

interface SchedulePayload {
  tasks: Array<{ title: string; estimatedMinutes: number; startTime: string; endTime: string }>
}

export const generateSchedule = async (inputText: string, apiKey: string, baseTime: string): Promise<Task[]> => {
  if (!apiKey) {
    throw new Error('OpenAI APIキーが設定されていません。')
  }
  if (!inputText.trim()) {
    throw new Error('タスクが入力されていません。')
  }

  const systemPrompt = `
あなたは優秀なタスクスケジューラ兼秘書です。
ユーザーが入力したタスクを分析し、指定された開始時刻（${baseTime}）を起点として、各タスクの実行順序、予想所要時間（分）、開始時刻（HH:MM）、終了時刻（HH:MM）を見積もってタイムスケジュールを作成してください。

【重要ルール】
1. リストの最初のタスクの "startTime" は、必ず指定された開始時刻（${baseTime}）と完全に一致させてください。準備時間などを勝手に設けて開始を遅らせないでください。
2. ポモドーロテクニック（25分作業）に適合しやすいように、大きなタスクは適宜分割してください。
3. タスク間には短い休憩（5分）を挟むスケジュールにすると良いです。

必ず以下のJSONフォーマットのみを出力し、それ以外の説明テキストやマークダウンブロックは一切含めないでください。

{
  "tasks": [
    {
      "title": "タスク名",
      "estimatedMinutes": 25,
      "startTime": "14:00",
      "endTime": "14:25"
    }
  ]
}
`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: inputText }
      ],
      temperature: 0.7
    })
  })

  if (!response.ok) {
    throw new Error(`AI通信エラー: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as OpenAIChatResponse
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) {
    throw new Error('AIからのレスポンスが空でした。')
  }

  try {
    const jsonStr = content.replace(/^```(json)?/i, '').replace(/```$/i, '').trim()
    const parsed = JSON.parse(jsonStr) as SchedulePayload

    if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
      throw new Error('不正なデータ形式が返却されました。')
    }

    return parsed.tasks.map((t: { title: string; estimatedMinutes: number; startTime: string; endTime: string }) => ({
      id: crypto.randomUUID(),
      title: t.title,
      estimatedMinutes: typeof t.estimatedMinutes === 'number' ? t.estimatedMinutes : 25,
      startTime: t.startTime || '',
      endTime: t.endTime || '',
      completed: false
    }))
  } catch (error) {
    console.error('JSON Parse Error:', content, error)
    throw new Error('AIからのレスポンス解析に失敗しました。')
  }
}