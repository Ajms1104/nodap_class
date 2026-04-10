import type { Session, Message } from '../types';

const STORAGE_KEY = 'vibetutor_sessions';

export const storage = {
  getSessions: (): Session[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  getSession: (id: string): Session | undefined => {
    return storage.getSessions().find(s => s.id === id);
  },

  createSession: (initialInput: string, initialImage?: string, backendId?: string): Session => {
    const newSession: Session = {
      id: backendId || crypto.randomUUID(),
      title: initialInput.slice(0, 30) || '새 학습 세션',
      initialInput,
      initialImage,
      messages: [],
      turnCount: 0,
      userFinalOutput: '',
      createdAt: new Date(),
    };
    const sessions = storage.getSessions();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([newSession, ...sessions]));
    return newSession;
  },

  addMessage: (sessionId: string, message: Message): Session | null => {
    const sessions = storage.getSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    if (sessionIndex === -1) return null;

    const updatedSession = { ...sessions[sessionIndex] };
    updatedSession.messages = [...updatedSession.messages, message];
    
    // AI 메시지가 들어올 때만 턴 수 증가 (사용자 -> AI 1턴)
    if (message.role === 'assistant') {
      updatedSession.turnCount += 1;
    }

    sessions[sessionIndex] = updatedSession;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    return updatedSession;
  },

  updateMessageContent: (sessionId: string, messageId: string, content: string): void => {
    const sessions = storage.getSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    if (sessionIndex !== -1) {
      const messageIndex = sessions[sessionIndex].messages.findIndex(m => m.id === messageId);
      if (messageIndex !== -1) {
        sessions[sessionIndex].messages[messageIndex].content = content;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      }
    }
  },

  updateFinalOutput: (sessionId: string, output: string): void => {
    const sessions = storage.getSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    if (sessionIndex !== -1) {
      sessions[sessionIndex].userFinalOutput = output;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  }
};
