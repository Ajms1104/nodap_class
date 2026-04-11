//타입정리

export type Role = 'user' | 'assistant'

export interface Message {
  role: Role
  content: string
}

export interface ChatRequest {
  initial_input: string
  messages: Message[]
  turn_count: number
  initial_image?: string
}

export interface SummaryRequest {
  initial_input: string
  messages: Message[]
}

export interface FinishRequest {
  user_final_output: string
}

export interface AISummary {
  understood: string[]
  lacking: string[]
  key_concepts: string[]
}

export interface ImageAnalyzeRequest {
  initial_input: string
  image_description: string
}