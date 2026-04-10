import express from 'express'
import cors from 'cors'
import swaggerUi from 'swagger-ui-express'
import swaggerJsdoc from 'swagger-jsdoc'
import sessionRouter from './routers/session.router'

const app = express()

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VibeTutor API',
      version: '1.0.0',
      description: 'AI 코딩 튜터 API 명세서'
    },
    servers: [{ url: 'http://localhost:4000' }]
  },
  apis: ['./src/routers/*.ts']
}

const swaggerSpec = swaggerJsdoc(swaggerOptions)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
app.use('/api/sessions', sessionRouter)

export default app