import dotenv from 'dotenv'
dotenv.config()

import app from './app'

const PORT = process.env.PORT || 4000

app.listen(PORT, () => {
  console.log(`📌서버 실행 중: http://localhost:${PORT}`)
  console.log(`📜 Swagger UI（ＡＰＩ 문서）: http://localhost:${PORT}/api-docs`)
})