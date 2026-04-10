//API 라우팅
import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import multer from 'multer'
import { streamChat } from '../services/chat.service'
import { generateSummary } from '../services/summary.service'
import { analyzeImage } from '../services/image.service'
import { ChatRequest, SummaryRequest, FinishRequest } from '../models/session.model'

const router = Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
})

const imageUpload = upload.single('image')
const fileUpload = upload.single('file')

/**
 * @swagger
 * /api/sessions:
 *   post:
 *     summary: 세션 시작（사용자 글 저장）
 *     tags: [Sessions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - initial_input
 *             properties:
 *               initial_input:
 *                 type: string
 *         example: "def fibo(n):\n  if n <= 1:\n    return n\n  return fibo(n-1) + fibo(n-2)"
 *     responses:
 *       200:
 *         description: 세션 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 session_id:
 *                   type: string
 *                 title:
 *                   type: string
 *                 created_at:
 *                   type: string
 */
router.post('/', (req: Request, res: Response) => {
  const { initial_input } = req.body

  if (!initial_input) {
    res.status(400).json({ error: 'initial_input은 필수입니다' })
    return
  }

  const session_id = uuidv4()
  const title = initial_input.slice(0, 30)

  res.json({
    session_id,
    title,
    created_at: new Date().toISOString()
  })
})

/**
 * @swagger
 * /api/sessions/{session_id}/chat:
 *   post:
 *     summary: GPT(3.5) 와의 대화
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: session_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             initial_input: "def fibo(n):\n  if n <= 1:\n    return n\n  return fibo(n-1) + fibo(n-2)"
 *             messages:
 *               - role: "user"
 *                 content: "n이 0이거나 1일 때 그냥 반환하면 된다고 생각해요"
 *               - role: "assistant"
 *                 content: "흥미롭네요, 그렇다면 n이 음수일 때는 어떻게 될까요?"
 *             turn_count: 2
 *           schema:
 *             type: object
 *             required:
 *               - initial_input
 *               - messages
 *               - turn_count
 *             properties:
 *               initial_input:
 *                 type: string
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant]
 *                     content:
 *                       type: string
 *               turn_count:
 *                 type: number
 *     responses:
 *       200:
 *         description: SSE 스트리밍 응답
 */
router.post('/:session_id/chat', async (req: Request, res: Response) => {
  const { initial_input, messages, turn_count }: ChatRequest = req.body

  if (!initial_input || !messages || messages.length === 0) {
    res.status(400).json({ error: 'initial_input과 messages는 필수입니다' })
    return
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  try {
    await streamChat(initial_input, messages, turn_count, (chunk) => {
      res.write(`data: ${JSON.stringify({ type: 'text', value: chunk })}\n\n`)
    })
    res.write('data: [DONE]\n\n')
  } catch (err) {
    console.error('chat error:', err)
    res.write(`data: ${JSON.stringify({ type: 'error', value: '오류가 발생했습니다' })}\n\n`)
  } finally {
    res.end()
  }
})

/**
 * @swagger
 * /api/sessions/{session_id}/summary:
 *   post:
 *     summary: AI 분석 정리집 생성
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: session_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             initial_input: "def fibo(n):\n  if n <= 1:\n    return n\n  return fibo(n-1) + fibo(n-2)"
 *             messages:
 *               - role: "user"
 *                 content: "재귀가 계속 자기 자신을 호출하는 구조라고 생각해요"
 *               - role: "assistant"
 *                 content: "좋아요, 그렇다면 언제 호출이 멈춰야 할까요?"
 *           schema:
 *             type: object
 *             required:
 *               - initial_input
 *               - messages
 *             properties:
 *               initial_input:
 *                 type: string
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                     content:
 *                       type: string
 *     responses:
 *       200:
 *         description: AI 분석 결과
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 understood:
 *                   type: array
 *                   items:
 *                     type: string
 *                 lacking:
 *                   type: array
 *                   items:
 *                     type: string
 *                 key_concepts:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.post('/:session_id/summary', async (req: Request, res: Response) => {
  const { initial_input, messages }: SummaryRequest = req.body

  if (!initial_input || !messages || messages.length === 0) {
    res.status(400).json({ error: 'initial_input과 messages는 필수입니다' })
    return
  }

  try {
    const summary = await generateSummary(initial_input, messages)
    res.json(summary)
  } catch (err) {
    console.error('summary error:', err)
    res.status(500).json({ error: 'summary 생성에 실패했습니다' })
  }
})

/**
 * @swagger
 * /api/sessions/{session_id}/finish:
 *   post:
 *     summary: 최종 정리본 제출
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: session_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             user_final_output: "재귀 함수는 자기 자신을 호출하되, 반드시 멈추는 조건인 기저 조건이 있어야 합니다. fibo에서는 n이 0이거나 1일 때 그대로 반환하는 게 기저 조건입니다."
 *           schema:
 *             type: object
 *             required:
 *               - user_final_output
 *             properties:
 *               user_final_output:
 *                 type: string
 *     responses:
 *       200:
 *         description: 제출 완료
 */
router.post('/:session_id/finish', (req: Request, res: Response) => {
  const { user_final_output }: FinishRequest = req.body

  if (!user_final_output) {
    res.status(400).json({ error: 'user_final_output은 필수입니다' })
    return
  }

  res.json({
    completed_at: new Date().toISOString(),
    user_final_output
  })
})

/**
 * @swagger
 * /api/sessions/{session_id}/image:
 *   post:
 *     summary: 이미지 업로드 및 분석
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: session_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               user_text:
 *                 type: string
 *                 example: "이 이미지에서 뭘 배울 수 있을까요?"
 *     responses:
 *       200:
 *         description: 이미지 분석 결과
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ai_response:
 *                   type: string
 */
router.post('/:session_id/image', imageUpload, async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: '이미지 파일이 필요합니다' })
    return
  }

  const userText = req.body.user_text || ''

  try {
    const aiResponse = await analyzeImage(
      req.file.buffer,
      req.file.mimetype,
      userText
    )
    res.json({ ai_response: aiResponse })
  } catch (err) {
    console.error('image analyze error:', err)
    res.status(500).json({ error: '이미지 분석에 실패했습니다' })
  }
})

/**
 * @swagger
 * /api/sessions/{session_id}/file:
 *   post:
 *     summary: 텍스트 파일 업로드
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: session_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: 파일 텍스트 추출 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 extracted_text:
 *                   type: string
 */
router.post('/:session_id/file', fileUpload, async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: '파일이 필요합니다' })
    return
  }

  const allowedTypes = [
    'text/plain',
    'text/markdown',
    'application/json',
    'text/html',
    'text/css',
    'application/javascript',
    'text/javascript'
  ]

  if (!allowedTypes.includes(req.file.mimetype)) {
    res.status(400).json({ error: '텍스트 파일만 업로드 가능합니다 (.txt, .md, .json, .html, .css, .js)' })
    return
  }

  try {
    const extractedText = req.file.buffer.toString('utf-8')
    res.json({ extracted_text: extractedText })
  } catch (err) {
    console.error('file extract error:', err)
    res.status(500).json({ error: '파일 읽기에 실패했습니다' })
  }
})

export default router