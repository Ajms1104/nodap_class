import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../lib/storage';
import type { Session, Message } from '../types';
import { Upload, Send, Bot, ImageIcon, FileText, X, Terminal, Code, Activity, ChevronRight, MessageSquare, Lightbulb, HelpCircle, Home } from 'lucide-react';

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

  const handleGoHome = () => {
    if (currentSession) {
      if (!window.confirm('진행 중인 세션을 종료하고 처음 화면으로 돌아가시겠습니까?')) return;
    }
    setCurrentSession(null);
    setFiles([]);
    setChatInput('');
    navigate('/');
  };

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
          turn_count: turnCount,
          initial_image: session.initialImage
        })
      });

      if (!response.body) throw new Error('No response body');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiContent = '';

      // 초기 빈 메시지 추가
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

  const renderAiContent = () => {
    if (isAiTyping && (!lastAiMessage || currentSession?.messages[currentSession.messages.length-1].role === 'user')) {
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-2">
            <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce"></div>
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">AI가 분석하고 있습니다...</p>
        </div>
      );
    }

    if (!lastAiMessage) return (
      <div className="text-center space-y-6 opacity-30">
        <Bot size={64} className="mx-auto text-slate-300" />
        <h2 className="text-2xl font-black text-slate-400 uppercase tracking-widest">분석 세션을 시작하세요</h2>
      </div>
    );

    const analysisMatch = lastAiMessage.match(/\[분석\](.*?)(?=\[질문\]|$)/s);
    const questionMatch = lastAiMessage.match(/\[질문\](.*?)$/s);

    const analysis = analysisMatch ? analysisMatch[1].trim() : lastAiMessage.split('[질문]')[0].trim();
    const question = questionMatch ? questionMatch[1].trim() : '';

    return (
      <div className="w-full max-w-4xl space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {analysis && (
          <div className="text-left bg-slate-50 border-2 border-slate-100 p-8 rounded-3xl">
            <div className="flex items-center gap-2 mb-4 text-indigo-600 font-black text-xs">
              <Lightbulb size={16} /> 튜터의 분석 피드백
            </div>
            <p className="text-[20px] leading-relaxed text-slate-600 font-bold">
              {analysis.replace(':', '').trim()}
            </p>
          </div>
        )}

        {question && (
          <div className="text-left px-4">
            <div className="flex items-center gap-2 mb-6 text-slate-400 font-black text-xs">
              <HelpCircle size={16} /> 다음 단계로 넘어가기 위한 핵심 질문
            </div>
            <h3 className="text-[38px] md:text-[48px] font-black text-slate-900 leading-tight tracking-tight">
              {question.replace(':', '').trim()}
            </h3>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 w-screen h-screen flex items-center justify-center bg-white font-sans p-8">
      
      <div className="w-full h-full max-w-[1500px] max-h-[900px] flex flex-col bg-white rounded-[40px] border-[3px] border-slate-900 shadow-[20px_20px_0px_rgba(0,0,0,0.05)] overflow-hidden relative z-10">
        
        {/* 상단 헤더 */}
        <header className="h-20 border-b-[3px] border-slate-900 bg-white flex items-center justify-between px-12 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <Activity size={24} />
            </div>
            <h1 className="font-black tracking-tighter text-2xl uppercase">답없는 교실</h1>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-6 text-[11px] font-black text-slate-400 uppercase tracking-widest border-r pr-8">
              <span className="flex items-center gap-2 text-emerald-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                NoDap Class System
              </span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
            
            <button 
              onClick={handleGoHome}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black text-xs uppercase transition-all active:scale-95"
            >
              <Home size={16} /> 홈으로
            </button>
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden">
          {/* 좌측 패널 */}
          <aside className="w-[450px] border-r-[3px] border-slate-900 bg-white flex flex-col shrink-0">
            <div className="p-8 border-b">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Code size={14} /> 초기 입력 내용
              </h2>
              
              {!currentSession ? (
                <div className="space-y-6">
                  <p className="text-sm text-slate-500 leading-relaxed font-bold">
                    학습할 내용이나 코드를 입력하여 세션을 시작하세요.
                  </p>
                  <div className="p-5 bg-slate-50 rounded-[24px] border-2 border-slate-100 space-y-4">
                    <label className="flex flex-col items-center justify-center gap-4 cursor-pointer bg-white p-6 border-2 border-dashed border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                      <Upload size={24} className="text-indigo-500" />
                      <span className="text-[11px] font-black text-slate-700">이미지/파일 첨부하기</span>
                      <input type="file" className="hidden" onChange={handleFileChange} accept="image/*, .txt" />
                    </label>

                    <div className="space-y-2">
                      {files.map(f => (
                        <div key={f.id} className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 text-[16px] font-bold">
                          <span className="truncate flex-1 flex items-center gap-3 text-slate-700">
                            {f.type === 'image' ? <ImageIcon size={18} className="text-indigo-500"/> : <FileText size={18} className="text-blue-500"/>} 
                            {f.name}
                          </span>
                          <button onClick={() => removeFile(f.id)} className="text-slate-300 hover:text-red-500"><X size={20}/></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-auto custom-scrollbar p-6 space-y-6">
                   {currentSession.initialImage && (
                    <div className="rounded-2xl overflow-hidden border-2 border-slate-900 shadow-md bg-white">
                      <img 
                        src={currentSession.initialImage} 
                        alt="초기 첨부 이미지" 
                        className="w-full h-auto object-contain block"
                      />
                    </div>
                  )}
                  <div className="bg-slate-900 p-6 rounded-2xl shadow-inner border-2 border-slate-800">
                    <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4 opacity-50">초기 텍스트 데이터</p>
                    <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-300">
                      {currentSession.initialInput}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {currentSession && (
              <div className="flex-1 flex flex-col overflow-hidden border-t-2 border-slate-50 bg-slate-50/30">
                <div className="p-6 pb-2">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Activity size={12} /> 워크숍 대화 기록
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar flex flex-col">
                  {currentSession.messages.map((m, idx) => (
                    <div 
                      key={m.id} 
                      className={`flex flex-col max-w-[90%] ${m.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}
                    >
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <span className={`text-[11px] font-black uppercase tracking-widest ${m.role === 'user' ? 'text-indigo-600' : 'text-slate-400'}`}>
                          {m.role === 'user' ? '학습자' : 'AI 튜터'}
                        </span>
                        <span className="text-[10px] text-slate-300 font-bold">단계 {idx + 1}</span>
                      </div>
                      
                      <div className={`p-5 rounded-[22px] text-[16px] leading-relaxed shadow-sm border-2 ${
                        m.role === 'user' 
                          ? 'bg-indigo-600 text-white border-indigo-600 rounded-tr-none font-bold' 
                          : 'bg-white text-slate-600 border-slate-100 rounded-tl-none font-medium'
                      }`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              </div>
            )}
          </aside>

          {/* 중앙 패널 */}
          <section className="flex-1 bg-white flex flex-col relative">
            <div className="flex-1 flex flex-col items-center justify-center p-12 md:p-24 overflow-auto custom-scrollbar">
              {renderAiContent()}
            </div>

            {/* 하단 입력창 */}
            <div className="p-10 border-t-[3px] border-slate-900">
              {currentSession && (
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[16px] font-black text-slate-900 uppercase tracking-widest">
                    검증 진행도: <span className="text-indigo-600">{currentSession.turnCount} / 5</span>
                  </span>
                  {currentSession.turnCount >= 5 && (
                    <button onClick={handleFinish} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm uppercase hover:bg-slate-900 transition-all shadow-lg">결과 보고서 생성하기</button>
                  )}
                </div>
              )}

              <form onSubmit={handleSendMessage} className="relative bg-white border-[3px] border-slate-900 rounded-[24px] overflow-hidden focus-within:border-indigo-600 transition-colors shadow-sm">
                <div className="flex items-center justify-between px-8 py-4 border-b-2 border-slate-50 bg-slate-50/20">
                  <div className="flex items-center gap-3">
                    <Terminal size={18} className="text-slate-400" />
                    <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">질문에 대한 답변을 입력하세요</span>
                  </div>
                </div>
                <textarea
                  ref={inputRef}
                  className="w-full pl-8 pr-24 py-8 bg-transparent outline-none text-[20px] font-bold text-slate-800 placeholder:text-slate-300 resize-none min-h-[150px]"
                  placeholder={!currentSession ? "학습할 내용을 입력하여 세션을 시작하세요..." : "논리적인 근거를 바탕으로 답변해 주세요..."}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e as any); } }}
                  disabled={isAiTyping}
                />
                <button type="submit" disabled={!chatInput.trim() || isAiTyping} className="absolute right-6 bottom-6 w-14 h-14 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-indigo-600 transition-all shadow-lg">
                  <Send size={24} />
                </button>
              </form>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
