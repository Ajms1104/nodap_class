export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  duration?: number; // 답변에 걸린 시간 (초)
}

export type Session = {
 id: string;
 title: string;          // 초기 입력 앞 30자
 initialInput: string;   // 초기 코드/기획안 전문
 initialImage?: string;  // 추가: 업로드된 이미지 (base64)
 messages: Message[];    // 대화 내역
 turnCount: number;      // 현재 턴 수
 userFinalOutput: string;// 사용자가 쓴 최종 정리본
 createdAt: Date;
};

export type AISummary = {
 understood: string[];   // AI 분석: 이해한 것
 lacking: string[];      // AI 분석: 부족한 것
 keyConcepts: string[];  // AI 분석: 핵심 개념 3가지
};
