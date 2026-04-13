# 🤖 답없는 교실 (NoDapClass)

> **"AI가 답을 주는 걸 구조적으로 막는 코딩 학습 파트너"**

답없는 교실(NoDapClass)은 학습자가 AI에게 의존하여 정답만 복사 붙여넣기 하는 습관을 방지하고, 스스로 생각하며 논리적 허점을 메울 수 있도록 설계된 AI 학습 보조 플랫폼입니다.

---
### 기획 및 개발 문서 (notion 활용)

> 📎 https://www.notion.so/e0b50fd1b23b8358b6e3010167261c12?v=68850fd1b23b82409cb78897b964a20f&source=copy_link 
---

## 핵심 철학

1. **정답 제공 금지**: AI는 절대로 코드나 정답을 먼저 제공하지 않습니다. 시스템 프롬프트를 통해 철저히 질문 위주의 대화를 유도합니다.
2. **강제적 사고 과정**: 최소 5턴 이상의 대화를 진행해야만 세션을 종료할 수 있는 락(Lock) 로직이 적용되어 있습니다.
3. **직접 정리하는 학습**: 학습이 끝나면 AI가 요약해 주는 것이 아니라, 학습자가 직접 이해한 내용을 정리하고 AI의 분석과 비교하며 메타인지를 높입니다.
4. **프라이버시 우선**: 별도의 데이터베이스 없이 브라우저의 localStorage만을 활용하여 개인정보 수집 없이 안전하게 세션을 유지합니다.

---

## 기술 스택

### Frontend

- Framework: Vite + React (TypeScript)
- Styling: TailwindCSS, shadcn/ui
- State & Storage: React Hooks, LocalStorage
- Library: react-markdown, react-syntax-highlighter (코드 및 마크다운 렌더링)

### Backend

- Runtime: Node.js (Express)
- AI Model: GPT 4o & Claude Sonnet 4.6
- API: Axios + Server-Sent Events (SSE) (AI 스트리밍 응답 구현)
- Documentation: Swagger UI (/api-docs)

---

## 프로젝트 구조

```text
nodap_class/
├── backend/                # Express 서버
│   ├── src/
│   │   ├── services/       # AI(Gemini), 요약, 이미지 처리 로직
│   │   ├── routers/        # API 라우팅 (Chat, Session)
│   │   └── server.ts       # 서버 엔트리 포인트
├── frontend/               # React 클라이언트
│   ├── src/
│   │   ├── pages/          # Landing, Session, Result 페이지
│   │   ├── components/     # UI 컴포넌트
│   │   └── lib/            # storage 유틸리티 등
└── package.json            # 전체 실행을 위한 script (concurrently)
```

---

## 시작하기

### 1. 환경 변수 설정 (.env 에 API 키가 포함되어 있어 비공개 처리함) 

### 2. 의존성 설치 및 실행

루트 폴더에서 다음 명령어를 실행하면 백엔드와 프론트엔드가 동시에 실행됩니다.

```bash
# 의존성 설치 (최초 1회)
npm install
npm install --prefix backend
npm install --prefix frontend
npm install --prefix frontend react-markdown react-syntax-highlighter remark-gfm

# 프로젝트 실행
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000
- API Docs: http://localhost:4000/api-docs

---

## 주요 화면 구성

1. **초기 입력 화면**: 학습할 코드나 기획안 초기 입력.
2. **분석 워크숍 화면**:
   - 좌측: 초기 입력 내용.
   - 중앙: AI의 분석 피드백 및 핵심 질문 카드, 유저와 AI 대화 내역.
   - 하단 : 답변 입력창.
   - 상단 : 진행도 표, PDF 저장.
   
3. **결과 리포트 페이지**: 사용자가 직접 쓴 최종 정리본과 AI의 정밀 분석 결과를 비교 분석.
