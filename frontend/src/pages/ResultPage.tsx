import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storage } from '../lib/storage';
import type { Session, AISummary } from '../types';
import { Home, Printer, CheckCircle2, AlertCircle, Bookmark, Award, Zap, Activity, Clock, BarChart3, Rocket, Brain, Star, FileText, Search } from 'lucide-react';

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async (currentSession: Session) => {
      try {
        const response = await fetch(`${API_BASE_URL}/sessions/${currentSession.id}/summary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            initial_input: currentSession.initialInput,
            messages: currentSession.messages.map(m => ({ role: m.role, content: m.content }))
          })
        });

        if (!response.ok) throw new Error('Summary fetch failed');
        
        const data = await response.json();
        setSummary({
          understood: data.understood || [],
          lacking: data.lacking || [],
          keyConcepts: data.key_concepts || data.keyConcepts || []
        });
      } catch (error) {
        console.error('Summary Error:', error);
        setSummary({
          understood: ['핵심 로직의 흐름 이해', '조건문의 역할 파악'],
          lacking: ['예외 상황(Edge Case) 처리', '코드의 효율성 고려'],
          keyConcepts: ['Algorithm', 'Logic', 'Clean Code']
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      const data = storage.getSession(id);
      if (data) {
        setSession(data);
        fetchSummary(data);
      } else {
        navigate('/');
      }
    }
  }, [id, navigate]);

  const getDeepestThinkingZone = () => {
    if (!session) return null;
    const userMessages = session.messages.filter(m => m.role === 'user' && m.duration);
    if (userMessages.length === 0) return null;
    return userMessages.reduce((prev, current) => (prev.duration! > current.duration! ? prev : current));
  };

  const deepThinkingZone = getDeepestThinkingZone();

  if (!session || isLoading) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center font-sans">
        <div className="flex gap-2 mb-6">
          <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce"></div>
        </div>
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">학습 데이터를 분석하고 있습니다...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 md:p-12 lg:p-16">
      {/* 인쇄 시 배경 제거를 위한 미세 패턴 */}
      <div className="fixed inset-0 opacity-[0.02] pointer-events-none print:hidden" 
           style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="max-w-5xl mx-auto relative z-10 print:max-w-full">
        
        {/* 리포트 헤더 */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16 border-b-4 border-slate-900 pb-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
              <FileText size={36} />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2">학습 결과 분석 리포트</h1>
              <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                <span>NoDap Class ID: {id?.slice(0, 8)}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                <span>발행일: {new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 print:hidden">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all">
              <Home size={18} /> 홈으로
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-indigo-600 transition-all">
              <Printer size={18} /> PDF로 저장
            </button>
          </div>
        </header>

        {/* [1] 인지적 학습 여정 지도 */}
        <section className="bg-white border-[3px] border-slate-900 rounded-3xl p-10 shadow-[12px_12px_0px_rgba(0,0,0,0.05)] mb-12">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
              <Activity size={18} className="text-indigo-600" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">사고의 성장 경로</h3>
          </div>
          
          <div className="relative flex justify-between items-start px-4">
            {/* 진행 선 */}
            <div className="absolute top-[22px] left-[40px] right-[40px] h-[3px] bg-slate-100 z-0" />
            <div className="absolute top-[22px] left-[40px] h-[3px] bg-indigo-600 z-0 transition-all duration-1000" style={{ width: `${(session.turnCount / 5) * 90}%` }} />

            {/* 단계별 스테이션 */}
            {[
              { label: "문제 정의", icon: <Search size={16} /> },
              { label: "문맥 파악", icon: <Activity size={16} /> },
              { label: "심층 사고", icon: <Brain size={16} />, isZone: true },
              { label: "논리 정교화", icon: <Zap size={16} /> },
              { label: "최종 합의", icon: <Star size={16} /> },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center relative z-10 w-20 text-center">
                <div className={`w-12 h-12 rounded-full border-[3px] border-slate-900 flex items-center justify-center shadow-md mb-4 ${
                  i < session.turnCount ? 'bg-indigo-600 text-white' : 'bg-white text-slate-200 border-slate-200'
                } ${s.isZone && deepThinkingZone ? 'ring-4 ring-indigo-100' : ''}`}>
                  {s.icon}
                </div>
                <p className={`text-[11px] font-black tracking-tighter ${i < session.turnCount ? 'text-slate-900' : 'text-slate-300'}`}>{s.label}</p>
                <p className="text-[9px] font-bold text-slate-300 mt-1 uppercase">STEP {i + 1}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          <main className="lg:col-span-8 space-y-12">
            
            {/* [2] 최종 학습 정리 */}
            <div className="bg-white border-[3px] border-slate-900 rounded-3xl p-10 shadow-[12px_12px_0px_rgba(0,0,0,0.05)]">
               <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-8 flex items-center gap-2">
                 <Bookmark size={16} /> 나의 최종 학습 정리
               </h3>
               <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-8 relative">
                 <span className="absolute -top-4 -left-2 text-6xl text-indigo-200 font-serif opacity-50">"</span>
                 <p className="text-[22px] leading-relaxed text-slate-700 font-bold italic relative z-10">
                   {session.userFinalOutput || '정리된 내용이 없습니다.'}
                 </p>
                 <span className="absolute -bottom-10 -right-2 text-6xl text-indigo-200 font-serif opacity-50 rotate-180">"</span>
               </div>
            </div>

            {/* [3] 사고 정체 구간 분석 (가장 깊은 고민의 지점) */}
            {deepThinkingZone && (
              <div className="bg-slate-900 border-[3px] border-slate-900 rounded-3xl p-10 shadow-[12px_12px_0px_rgba(15,23,42,0.1)] text-white relative overflow-hidden">
                <div className="absolute -right-10 -top-10 opacity-10 rotate-12">
                    <Brain size={240} />
                </div>
                <div className="flex items-center justify-between mb-10 relative z-10">
                  <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-indigo-400">
                     <BarChart3 size={18} /> 사고 정체 구간 정밀 분석
                  </h3>
                  <div className="px-4 py-1.5 bg-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-lg">Deep Thinking Verified</div>
                </div>
                
                <div className="space-y-8 relative z-10">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                      <Clock size={40} className="text-amber-400 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-400 mb-1">가장 깊은 몰입이 일어난 지점</p>
                      <p className="text-3xl font-black">이 질문에서 약 <span className="text-amber-400">{deepThinkingZone.duration}초</span>간 치열하게 고민했습니다.</p>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-8 italic">
                    <p className="text-[10px] font-black text-indigo-400 uppercase mb-4 tracking-widest">치열했던 사고의 흔적</p>
                    <p className="text-[20px] font-bold text-slate-100 leading-relaxed">"{deepThinkingZone.content}"</p>
                  </div>
                  <div className="flex gap-4 items-start bg-indigo-500/10 p-6 rounded-2xl border border-indigo-500/20">
                    <Lightbulb className="text-indigo-400 shrink-0 mt-1" size={20} />
                    <p className="text-[15px] font-medium text-slate-300 leading-relaxed">
                      이 지점은 학습자가 기존의 지식 체계를 새로운 개념과 통합하려 노력한 **'결정적 학습 지점(Critical Learning Point)'**입니다. 이 고민의 시간이 당신의 논리력을 한 단계 도약시켰습니다.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* [4] 전체 논리 추적 로그 */}
            <div className="bg-white border-[3px] border-slate-900 rounded-3xl p-10 shadow-[12px_12px_0px_rgba(0,0,0,0.05)]">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-12 flex items-center gap-2">
                 <Activity size={16} className="text-indigo-600" /> 전체 논리 추적 로그
              </h3>
              <div className="space-y-16 relative before:absolute before:top-2 before:bottom-2 before:left-[19px] before:w-[2px] before:bg-slate-100">
                {session.messages.filter(m => m.content !== '').map((m, idx) => (
                  <div key={idx} className="relative pl-16 group">
                    <div className={`absolute left-0 top-1 w-10 h-10 rounded-full border-[3px] bg-white flex items-center justify-center z-10 transition-all group-hover:scale-110 ${m.role === 'user' ? 'border-indigo-600 shadow-lg shadow-indigo-100' : 'border-slate-300'}`}>
                      <div className={`w-3 h-3 rounded-full ${m.role === 'user' ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-4 mb-3">
                        <span className={`text-[11px] font-black uppercase tracking-widest ${m.role === 'user' ? 'text-indigo-600' : 'text-slate-400'}`}>
                          {m.role === 'user' ? '학습자' : 'AI 튜터'} · STEP {Math.floor(idx/2)+1}
                        </span>
                        {m.duration && <span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1"><Clock size={10}/> {m.duration}초 소요</span>}
                      </div>
                      <div className={`text-[18px] leading-relaxed ${m.role === 'user' ? 'text-slate-900 font-bold' : 'text-slate-500 font-medium'}`}>
                        {m.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>

          {/* [5] 사이드 분석 바 */}
          <aside className="lg:col-span-4 space-y-12">
            <div className="bg-white border-[3px] border-slate-900 rounded-3xl p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.05)] space-y-12 sticky top-12">
              <section>
                <div className="flex items-center gap-2 mb-6 text-emerald-600">
                  <CheckCircle2 size={18} />
                  <h4 className="text-[11px] font-black uppercase tracking-widest">완벽히 습득한 개념</h4>
                </div>
                <div className="space-y-3">
                  {summary?.understood?.map((item, i) => (
                    <div key={i} className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-[14px] font-bold text-slate-700 leading-snug">
                      {item}
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-6 text-amber-600">
                  <AlertCircle size={18} />
                  <h4 className="text-[11px] font-black uppercase tracking-widest">추가 보완이 필요한 지점</h4>
                </div>
                <div className="space-y-3">
                  {summary?.lacking?.map((item, i) => (
                    <div key={i} className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl text-[14px] font-bold text-slate-700 leading-snug">
                      {item}
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-6 text-slate-400">
                  <Star size={18} />
                  <h4 className="text-[11px] font-black uppercase tracking-widest">핵심 키워드</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {summary?.keyConcepts?.map((concept, i) => (
                    <span key={i} className="px-3 py-2 bg-white border-2 border-slate-900 text-slate-900 text-[10px] font-black rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,1)] uppercase">
                      #{concept}
                    </span>
                  ))}
                </div>
              </section>

              <div className="pt-8 border-t-2 border-slate-50 text-center">
                <div className="w-20 h-20 mx-auto bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                  <Award size={40} className="text-indigo-600" />
                </div>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-1">Official Logic Certificate</p>
                <p className="text-lg font-black text-slate-900 italic tracking-tighter uppercase">답없는 교실</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
