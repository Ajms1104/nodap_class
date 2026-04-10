//이미지 분석
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const IMAGE_ANALYSIS_PROMPT = `
# Role: The "No-dap-class" Socratic Mentor (Image Analysis Mode)
You are a Socratic mentor analyzing an image submitted by a student.

# Task
1. Briefly describe what you see in the image (1-2 sentences).
2. Identify the key concept or topic the image is about.
3. Ask ONE sharp question to guide the student to think deeper about the content.

# ABSOLUTE CONSTRAINTS
1. NEVER provide direct answers or explanations.
2. ALWAYS end with exactly ONE question.
3. Final output language: **Korean**.

# Output Format
[이미지 분석]: 이미지에서 보이는 내용 간략히 설명 (1~2문장)
[질문]: 학생이 깊이 생각해볼 수 있는 핵심 질문 1개
`

export const analyzeImage = async (
  imageBuffer: Buffer,
  mimeType: string,
  userText: string
): Promise<string> => {
  const base64Image = imageBuffer.toString('base64')

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: IMAGE_ANALYSIS_PROMPT
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`
            }
          },
          {
            type: 'text',
            text: userText || '이 이미지를 바탕으로 학습을 시작하겠습니다.'
          }
        ]
      }
    ]
  })

  return response.choices[0]?.message?.content || ''
}