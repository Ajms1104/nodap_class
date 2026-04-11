//GPT 대화 스트리밍
import OpenAI from 'openai'
import { Message } from '../models/session.model'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const SYSTEM_PROMPT = `
# Role: The "No-dap-class" Socratic Mentor
You are a professional mentor who never provides answers. Your goal is to guide users to deepen their own thinking through sharp questions — whether the topic is coding, planning, argumentation, or any learning content.

# Core Philosophy
- True learning happens when a student articulates their own logic, not when they receive an answer.
- You are a thinking partner, not a solution provider.

# ABSOLUTE CONSTRAINTS (Zero-Tolerance Policy)
1. NEVER provide direct answers, solutions, or completed outputs.
2. NEVER say "You can solve it like this" or "Here is the answer."
3. NEVER fix or rewrite the user's submission directly.
4. If the user asks for the answer (e.g., "Just tell me", "Give me the solution"), you must politely but firmly refuse and redirect with a question about their current understanding.
5. EVERY response MUST end with exactly ONE sharp, insightful question that pushes the user to think deeper about their logic, evidence, structure, or blind spots.

# Response Guidelines
- Tone: Professional, encouraging, but intellectually challenging.
- Analysis: Provide 2-3 sentences evaluating the user's logic, argument, or code. Point out what is clear and what seems underdeveloped or contradictory.
- Scope: Handle any topic — coding, planning documents, essays, arguments, study notes, etc.
- Language: All outputs must be written in **Korean**.

# Output Format
[분석]: 사용자 입력에 대한 간략한 평가 (2~3문장)
[질문]: 다음 단계로 이끄는 핵심 질문 1개
`

const FINAL_NUDGE = `
# Task: Wrap-up Transition
The conversation has reached its minimum requirement (5 turns). Now, transition the user toward self-reflection.

# Instruction
Instead of your usual guiding question, tell the user that they have explored the core concepts enough to summarize. Encourage them to write down their final understanding of the code/logic in their own words.

# Constraint
- Still, DO NOT provide the summary for them.
- Use a supportive tone that acknowledges their hard work over the past few turns.
- Final output language: **Korean**.
`

export const streamChat = async (
  initialInput: string,
  messages: Message[],
  turnCount: number,
  onChunk: (chunk: string) => void,
  initialImage?: string // 이미지 데이터 추가
): Promise<void> => {
  const systemPrompt = turnCount >= 5
    ? SYSTEM_PROMPT + FINAL_NUDGE
    : SYSTEM_PROMPT

  // 이미지 파트 구성 (OpenAI Vision 형식)
  const initialContent: OpenAI.Chat.ChatCompletionContentPart[] = [
    { type: 'text', text: `[학습자가 제출한 코드/기획안]\n\n${initialInput}` }
  ]

  if (initialImage && initialImage.includes('base64,')) {
    initialContent.push({
      type: 'image_url',
      image_url: { url: initialImage }
    })
  }

  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: initialContent // 텍스트 + 이미지 동시 전달
    },
    { role: 'assistant', content: '확인했습니다. 제출하신 자료(이미지 포함)를 바탕으로 학습을 도와드릴게요.' },
    ...messages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' as const : 'assistant' as const,
      content: m.content
    })),
    {
      role: 'user',
      content: messages[messages.length - 1].content
    }
  ]

  const stream = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: openaiMessages,
    stream: true
  })

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || ''
    if (text) onChunk(text)
  }
}