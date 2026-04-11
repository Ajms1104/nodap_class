import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../lib/storage';
import type { Session, Message } from '../types';
import { Upload, Send, Bot, ImageIcon, FileText, X, Terminal, Code, Activity, ChevronRight } from 'lucide-react';

type AttachedFile = {
  id: string;
  type: 'image' | 'text';
  content: string;
  name: string;
};

const API_BASE_URL = 'http://localhost:4000/api';

export default function LandingPage() {
  const navigate = useNavigate();
  const [chatInput, setChatInput] = useState('');
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [isAiTyping, setIsAiTyping] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (!isAiTyping) {
      inputRef.current?.focus();
    }
  }, [currentSession?.messages, isAiTyping]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const processFile = (content: string, type: 'image' | 'text') => {
      setFiles(prev => [...prev, { id: crypto.randomUUID(), type, content, name: file.name }]);
    };

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => processFile(e.target?.result as string, 'image');
      reader.readAsDataURL(file);
    } else if (file.name.endsWith('.txt') || file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (e) => processFile(e.target?.result as string, 'text');
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const triggerAiResponse = async (session: Session, messages: Message[], turnCount: number) => {
    setIsAiTyping(true);
    const aiMessageId = crypto.randomUUID();
    
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${session.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initial_input: session.initialInput,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          turn_count: turnCount
        })
      });

      if (!response.body) throw new Error('No response body');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiContent = '';

      // 임시 AI 메시지 추가
      const initialAiMsg: Message = {
        id: aiMessageId,
        role: 'assistant',
        content: '',
        createdAt: new Date(),
      };
      
      const updated = storage.addMessage(session.id, initialAiMsg);
      if (updated) setCurrentSession(updated);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === 'text') {
                aiContent += parsed.value;
                setCurrentSession(prev => {
                  if (!prev) return null;
                  return {
                    ...prev,
                    messages: prev.messages.map(m => 
                      m.id === aiMessageId ? { ...m, content: aiContent } : m
                    )
                  };
                });
              }
            } catch (e) { }
          }
        }
      }
      
      storage.updateMessageContent(session.id, aiMessageId, aiContent);
      const finalData = storage.getSession(session.id);
      if (finalData) setCurrentSession(finalData);

    } catch (error) {
      console.error('AI Error:', error);
      alert('AI 응답을 가져오는 중 오류가 발생했습니다.');
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isAiTyping) return;

    const currentInput = chatInput;
    setChatInput('');

    let session = currentSession;
    
    if (!session) {
      // 신규 세션 생성
      setIsAiTyping(true);
      try {
        const response = await fetch(`${API_BASE_URL}/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initial_input: currentInput })
        });
        if (!response.ok) throw new Error('Failed to create session');
        const data = await response.json();
        const firstImg = files.find(f => f.type === 'image')?.content;
        session = storage.createSession(currentInput, firstImg, data.session_id);
        setCurrentSession(session);
      } catch (error) {
        alert('세션 생성에 실패했습니다.');
        setIsAiTyping(false);
        return;
      }
    }

    // 메시지 추가
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: currentInput,
      createdAt: new Date()
    };

    const updated = storage.addMessage(session.id, userMsg);
    if (updated) {
      setCurrentSession(updated);
      await triggerAiResponse(updated, updated.messages, updated.turnCount);
    }
  };

  const handleFinish = () => {
    if (currentSession) navigate(`/result/${currentSession.id}`);
  };

  const lastAiMessage = currentSession?.messages
    .filter(m => m.role === 'assistant')
    .slice(-1)[0]?.content;

  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col bg-[#f8fafc] text-slate-900 font-sans">
      
      {/* 상단 네비게이션 */}
      <header className="h-16 border-b bg-white flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <Activity size={20} />
          </div>
          <h1 className="font-bold tracking-tight text-lg uppercase">VibeTutor <span className="text-indigo-600">Workshop</span></h1>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
          <span className="flex items-center gap-1.5"><Terminal size={14} /> System Active</span>
          <span className="w-[1px] h-4 bg-slate-200"></span>
          <span>{new Date().toLocaleDateString()}</span>
        </div>
      </header>

      {/* 메인 워크스페이스 */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* [좌측 패널] - Mission & Reference */}
        <aside className="w-[450px] border-r bg-white flex flex-col shrink-0">
          <div className="p-6 border-b bg-slate-50/50">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Code size={14} /> Mission Blueprint
            </h2>
            {!currentSession ? (
              <div className="space-y-6">
                <p className="text-sm text-slate-600 leading-relaxed">
                  학습하고자 하는 기술 스택이나 비즈니스 로직을 터미널에 입력하여 세션을 시작하세요. AI 튜터가 당신의 설계를 정교하게 분석합니다.
                </p>
                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <label className="flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-indigo-100/50 transition-colors p-4 border-2 border-dashed border-indigo-200 rounded-lg group">
                    <Upload size={24} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-tighter">이미지/파일 첨부</span>
                    <input type="file" className="hidden" onChange={handleFileChange} accept="image/*, .txt" />
                  </label>
                  <div className="mt-4 space-y-2">
                    {files.map(f => (
                      <div key={f.id} className="flex items-center justify-between bg-white p-2 rounded border border-indigo-100 text-[10px] font-bold">
                        <span className="truncate flex-1 flex items-center gap-2">
                          {f.type === 'image' ? <ImageIcon size={12}/> : <FileText size={12}/>} {f.name}
                        </span>
                        <button onClick={() => removeFile(f.id)} className="text-slate-300 hover:text-red-500"><X size={14}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-auto">
                 {currentSession.initialImage && (
                  <div className="mb-6 rounded-lg overflow-hidden border shadow-sm">
                    <img src={currentSession.initialImage} alt="Blueprint" className="w-full grayscale hover:grayscale-0 transition-all duration-500" />
                  </div>
                )}
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-500 bg-slate-900 text-slate-300 p-6 rounded-lg shadow-inner">
                  {currentSession.initialInput}
                </pre>
              </div>
            )}
          </div>
          
          {/* 하단 대화 로그 히스토리 */}
          {currentSession && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 bg-slate-100/50 border-b">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Activity size={12} /> Live Event Log
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {currentSession.messages.map((m, idx) => (
                  <div key={m.id} className="group border-l-2 border-slate-100 pl-4 hover:border-indigo-400 transition-colors">
                    <div className="text-[9px] font-bold text-slate-300 uppercase mb-1">{m.role} · {idx + 1}</div>
                    <div className={`text-sm leading-relaxed ${m.role === 'user' ? 'text-indigo-600 font-semibold' : 'text-slate-600'}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </div>
          )}
        </aside>

        {/* [우측 패널] - Terminal Execution */}
        <section className="flex-1 bg-white flex flex-col relative overflow-hidden">
          
          {/* AI 질문 영역 (Active Feedback) */}
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
            {!currentSession ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-8 mx-auto">
                  <Terminal size={32} className="text-slate-200" />
                </div>
                <h2 className="text-4xl font-black tracking-tighter text-slate-900 mb-4 uppercase">Initialize Session</h2>
                <p className="text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">
                  구조적인 질문을 통해 당신의 설계를 증명하세요.<br/>최소 5번의 논리 검증이 필요합니다.
                </p>
              </div>
            ) : (
              <div className="w-full max-w-2xl animate-in fade-in zoom-in-95 duration-500">
                <div className="flex items-center gap-2 mb-6 justify-center">
                   <div className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded uppercase tracking-widest">Active Insight</div>
                </div>
                <h2 className="text-3xl font-bold leading-[1.3] text-slate-900 tracking-tight">
                  {isAiTyping ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce delay-75"></span>
                      <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce delay-150"></span>
                    </span>
                  ) : (lastAiMessage || "첫 질문을 준비 중입니다.")}
                </h2>
              </div>
            )}
          </div>

          {/* 하단 명령 입력줄 (Command Bar) */}
          <div className="p-8 border-t bg-slate-50/50 relative z-10">
            {currentSession && (
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress: {currentSession.turnCount} / 5</span>
                </div>
                {currentSession.turnCount >= 5 && (
                  <button 
                    onClick={handleFinish}
                    className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-lg font-bold uppercase text-[10px] tracking-widest hover:bg-indigo-600 shadow-xl transition-all animate-in slide-in-from-right-4"
                  >
                    Finish & Analysis Report <ChevronRight size={14} />
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleSendMessage} className="relative bg-white border-2 border-slate-900 rounded-xl shadow-[8px_8px_0px_rgba(0,0,0,0.05)] overflow-hidden transition-all focus-within:shadow-[8px_8px_0px_rgba(79,70,229,0.1)] focus-within:border-indigo-600">
              <textarea
                ref={inputRef}
                className="w-full pl-6 pr-24 py-6 bg-transparent outline-none text-lg font-medium text-slate-700 resize-none min-h-[100px] max-h-[250px]"
                placeholder={!currentSession ? "학습할 초안을 입력하여 세션을 시작하세요 (Enter)" : "답변을 입력하여 논리를 증명하세요..."}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e as any);
                  }
                }}
                disabled={isAiTyping}
              />
              <button 
                type="submit" 
                disabled={!chatInput.trim() || isAiTyping}
                className="absolute right-4 bottom-4 w-12 h-12 bg-slate-900 text-white rounded-lg flex items-center justify-center hover:bg-indigo-600 transition-all disabled:opacity-20"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
