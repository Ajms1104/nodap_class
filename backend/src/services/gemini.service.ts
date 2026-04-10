import { GoogleGenerativeAI } from '@google/generative-ai'
import { Message, AISummary } from '../models/session.model'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

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
  onChunk: (chunk: string) => void
): Promise<void> => {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: turnCount >= 5
      ? SYSTEM_PROMPT + FINAL_NUDGE
      : SYSTEM_PROMPT
  })

  const history = [
    {
      role: 'user' as const,
      parts: [{ text: `[학습자가 제출한 코드/기획안]\n\n${initialInput}` }]
    },
    {
      role: 'model' as const,
      parts: [{ text: '확인했습니다. 바로 살펴볼게요.' }]
    },
    ...messages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' as const : 'model' as const,
      parts: [{ text: m.content }]
    }))
  ]

  const chat = model.startChat({ history })
  const lastMessage = messages[messages.length - 1].content
  const result = await chat.sendMessageStream(lastMessage)

  for await (const chunk of result.stream) {
    const text = chunk.text()
    if (text) onChunk(text)
  }
}

export const generateSummary = async (
  initialInput: string,
  messages: Message[]
): Promise<AISummary> => {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const prompt = `
Below is the complete record of a student's coding learning session.

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
`

  const result = await model.generateContent(prompt)
  const raw = result.response.text()
  const cleaned = raw.replace(/```json|```/g, '').trim()

  return JSON.parse(cleaned) as AISummary
}