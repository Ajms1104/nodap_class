//AI 분석 정리집
import OpenAI from 'openai'
import { Message, AISummary } from '../models/session.model'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export const generateSummary = async (
  initialInput: string,
  messages: Message[]
): Promise<AISummary> => {
  const prompt = `
Below is the complete record of a student's learning session.

## Initial Submission
${initialInput}

## Conversation History
${messages.map(m =>
  `[${m.role === 'user' ? 'Student' : 'AI Tutor'}]: ${m.content}`
).join('\n\n')}

# Task
Analyze the conversation above and respond ONLY in the following JSON format.
Do NOT include any markdown, code blocks, backticks, or extra text. Return pure JSON only.

{
  "understood": ["concept the student understood 1", "concept 2"],
  "lacking": ["area still lacking 1", "area 2"],
  "key_concepts": ["key concept 1", "key concept 2", "key concept 3"]
}

# Important
- All values in the JSON must be written in **Korean**.
- Return pure JSON only, no markdown, no backticks.
`

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }]
  })

  const raw = response.choices[0]?.message?.content || ''
  const cleaned = raw.replace(/```json|```/g, '').trim()

  return JSON.parse(cleaned) as AISummary
}