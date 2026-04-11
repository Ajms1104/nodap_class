import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storage } from '../lib/storage';
import type { Session, Message } from '../types';
import { Send, Bot, Layout, MessageSquare, ArrowLeft, X, Loader2 } from 'lucide-react';

const API_BASE_URL = 'http://localhost:4000/api';

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [userFinalOutput, setUserFinalOutput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      const data = storage.getSession(id);
      if (data) {
        setSession(data);
        // 첫 진입 시 메시지가 없으면 AI 첫 인사 트리거
        if (data.messages.length === 0) {
          triggerAiResponse(data, [{ role: 'user', content: '학습을 시작하고 싶습니다. 제가 제출한 내용을 분석해주세요.' }], 0);
        }
      } else {
        navigate('/');
      }
    }
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages]);

  const triggerAiResponse = async (currentSession: Session, messages: Message[], turnCount: number) => {
    setIsLoading(true);
    const aiMessageId = crypto.randomUUID();
    
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${currentSession.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initial_input: currentSession.initialInput,
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
      
      const updated = storage.addMessage(currentSession.id, initialAiMsg);
      if (updated) setSession(updated);

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
                setSession(prev => {
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
      
      storage.updateMessageContent(currentSession.id, aiMessageId, aiContent);
      // 최종 상태 동기화
      const finalData = storage.getSession(currentSession.id);
      if (finalData) setSession(finalData);

    } catch (error) {
      console.error('AI Error:', error);
      alert('AI 응답을 가져오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !session || isLoading || isFinalizing) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      createdAt: new Date(),
    };

    const updatedSession = storage.addMessage(session.id, userMessage);
    if (updatedSession) {
      setSession(updatedSession);
      const userMsgContent = input;
      setInput('');
      await triggerAiResponse(updatedSession, updatedSession.messages, updatedSession.turnCount);
    }
  };

  const startFinalizing = () => {
    if (session!.turnCount < 5) {
      alert('최소 5턴 이상의 대화가 필요합니다.');
      return;
    }
    setIsFinalizing(true);
  };

  const handleFinalSubmit = async () => {
    if (!userFinalOutput.trim() || !session) {
      alert('최종 정리 내용을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${session.id}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_final_output: userFinalOutput })
      });

      if (!response.ok) throw new Error('Failed to finish session');

      storage.updateFinalOutput(session.id, userFinalOutput);
      navigate(`/result/${session.id}`);
    } catch (error) {
      console.error('Final submit error:', error);
      alert('최종 제출 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) return null;

  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-center select-none overflow-hidden bg-desk">
      
      {/* [뒤로가기 버튼] */}
      <button 
        onClick={() => navigate('/')}
        className="absolute top-8 left-10 flex items-center gap-2 text-slate-900/50 hover:text-slate-900 transition-colors font-black uppercase text-xs tracking-[0.3em] z-[100]"
      >
        <ArrowLeft size={16} /> Exit Workshop
      </button>

      {/* [메인 공책 바디] */}
      <div className="w-[1400px] h-[820px] flex relative rounded-[10px] shadow-[0_60px_120px_-20px_rgba(0,0,0,0.5)] border-[14px] border-[#2d3436] bg-white overflow-visible">
        
        <div className="spine-shadow" />

        {/* [좌측 페이지] - 참조 자료실 */}
        <div className="w-1/2 h-full lined-paper flex flex-col pt-24 px-20 relative rounded-l-[2px] border-r border-slate-50 overflow-hidden">
          <header className="flex items-center gap-3 mb-8 opacity-30 shrink-0">
            <Layout size={18} />
            <span className="text-[10px] font-black uppercase tracking-[0.5em]">Reference Blueprint</span>
          </header>

          <div className="flex-1 overflow-auto custom-scrollbar pr-4 relative z-10">
            {session.initialImage && (
              <div className="mb-10 p-4 bg-white shadow-xl -rotate-1 border border-slate-100 relative group max-w-[320px]">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-20 h-8 bg-blue-100/40 border-x border-blue-200/50" />
                <img src={session.initialImage} alt="Reference" className="w-full grayscale-[10%]" />
              </div>
            )}
            
            <div className="relative">
              <div className="absolute top-0 -left-6 bottom-0 w-[1px] bg-red-100 opacity-40" />
              <pre className="whitespace-pre-wrap font-mono text-lg leading-[3rem] text-slate-600 pl-4">
                {session.initialInput}
              </pre>
            </div>
          </div>
        </div>

        {/* [우측 페이지] - 대화 워크스페이스 */}
        <div className="w-1/2 h-full lined-paper flex flex-col pt-24 px-20 relative rounded-r-[2px]">
          
          {/* [포스트잇] 진행도 표시 */}
          <div className="absolute top-12 right-12 z-50 transition-transform hover:scale-105">
            <div className={`w-[160px] h-[160px] p-6 shadow-xl rotate-2 border-t-4 flex flex-col items-center justify-center ${session.turnCount >= 5 ? 'bg-green-50 border-green-400' : 'bg-[#fef08a] border-yellow-300'}`}>
              <span className={`handwritten text-lg font-bold mb-1 opacity-60 ${session.turnCount >= 5 ? 'text-green-800' : 'text-yellow-800'}`}>PROGRESS</span>
              <div className={`handwritten text-5xl border-b-2 ${session.turnCount >= 5 ? 'text-green-600 border-green-200' : 'text-yellow-900 border-yellow-400'}`}>
                {session.turnCount} / 5
              </div>
            </div>
          </div>

          <header className="flex items-center gap-3 mb-8 opacity-30 shrink-0">
            <MessageSquare size={18} />
            <span className="text-[10px] font-black uppercase tracking-[0.5em]">Structural Dialogue</span>
          </header>

          {/* 채팅 영역 */}
          <div className="flex-1 overflow-auto space-y-10 pb-40 custom-scrollbar relative z-10">
            <div className="absolute top-0 -left-6 bottom-0 w-[1px] bg-red-100 opacity-40" />
            
            {session.messages.length === 0 && isLoading && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-20 font-['Nanum_Pen_Script'] text-4xl text-slate-400">
                <Loader2 size={48} className="animate-spin mb-4" />
                <p>AI가 자료를 분석하고 있습니다...</p>
              </div>
            )}
            
            {session.messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} relative animate-in fade-in slide-in-from-bottom-2`}>
                <div className={`max-w-[90%] p-4 rounded-lg ${
                  m.role === 'user' 
                    ? 'text-blue-700 font-bold italic text-xl underline decoration-blue-100 underline-offset-8 pr-4' 
                    : 'text-slate-800 italic text-xl handwritten pl-4 bg-slate-50/50'
                }`}>
                  {m.role === 'assistant' && <Bot size={18} className="inline-block mr-3 mb-1 text-blue-400" />}
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && session.messages.length > 0 && session.messages[session.messages.length - 1].role === 'user' && (
              <div className="flex justify-start">
                <div className="bg-slate-50/50 p-4 rounded-lg">
                  <Loader2 size={24} className="animate-spin text-blue-300" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* 하단 입력바 및 마무리 버튼 */}
          <div className="absolute bottom-12 left-12 right-12 z-30">
            {/* 5턴 달성 시 나타나는 마무리 유도 버튼 */}
            {session.turnCount >= 5 && !isFinalizing && (
              <div className="mb-4 flex justify-center animate-in slide-in-from-bottom-4 duration-500">
                <button 
                  onClick={startFinalizing}
                  className="flex items-center gap-3 px-8 py-3 bg-blue-600 text-white rounded-full font-black uppercase text-xs tracking-[0.2em] shadow-[0_10px_20px_rgba(37,99,235,0.3)] hover:bg-blue-700 hover:-translate-y-1 transition-all group"
                >
                  <Bot size={16} className="group-hover:rotate-12 transition-transform" />
                  워크숍 학습 마무리하기
                </button>
              </div>
            )}

            {isFinalizing ? (
              <div className="bg-slate-900 p-8 rounded-sm shadow-2xl border-t-8 border-blue-600 animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Final Manuscript Summary</h4>
                  <button onClick={() => setIsFinalizing(false)} className="text-white/30 hover:text-white"><X size={16}/></button>
                </div>
                <textarea
                  autoFocus
                  className="w-full h-32 p-4 bg-white/5 border border-white/10 rounded-sm outline-none text-white text-xl font-['Nanum_Pen_Script'] resize-none mb-4 focus:border-blue-500 transition-colors"
                  placeholder="오늘의 대화로 얻은 결론을 기록하세요..."
                  value={userFinalOutput}
                  onChange={(e) => setUserFinalOutput(e.target.value)}
                />
                <button
                  onClick={handleFinalSubmit}
                  className="w-full py-4 bg-blue-600 text-white font-black uppercase tracking-widest hover:bg-blue-500 transition-colors shadow-lg"
                >
                  제출 및 리포트 보기
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="relative flex items-center group">
                <div className="absolute -inset-2 bg-slate-200/50 rounded-sm translate-x-1 translate-y-1 group-focus-within:translate-x-2 group-focus-within:translate-y-2 transition-all" />
                <input
                  disabled={isLoading}
                  className="flex-1 pl-10 pr-20 py-6 bg-white border-2 border-slate-900 rounded-sm outline-none text-2xl font-bold relative z-10 disabled:bg-slate-50"
                  placeholder={session.turnCount >= 5 ? "대화가 충분합니다. 마무리를 클릭해주세요!" : "구조적인 질문을 던져보세요..."}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <button 
                  type="submit" 
                  disabled={!input.trim() || isLoading}
                  className="absolute right-4 w-12 h-12 bg-slate-900 text-white rounded-sm flex items-center justify-center hover:bg-blue-600 transition-all z-20 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
