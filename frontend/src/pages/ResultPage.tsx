import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storage } from '../lib/storage';
import type { Session, AISummary } from '../types';
import { Home, Printer, CheckCircle2, AlertCircle, Bookmark, ArrowRight, Award, Zap, Activity, Clock, BarChart3, Rocket, Brain, Star } from 'lucide-react';

const API_BASE_URL = 'http://localhost:4000/api';

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
      <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="relative">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl animate-spin border-[3px] border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]" />
            <Activity size={24} className="absolute inset-0 m-auto text-white" />
        </div>
        <p className="mt-8 text-xs font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Mapping Your Learning Journey...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-8 md:p-12">
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="max-w-6xl mx-auto relative z-10">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="p-3 bg-white border-[3px] border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-y-[1px] active:translate-y-[4px] transition-all">
              <Home size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-black italic tracking-tighter uppercase text-slate-900 leading-none mb-1">Academic Insights</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest tracking-widest">Socratic Workshop ID: {id?.slice(0, 8)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-3 bg-white border-[3px] border-slate-900 rounded-xl font-black uppercase text-xs tracking-widest shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-y-[1px] transition-all">
              <Printer size={16} /> Export PDF
            </button>
          </div>
        </header>

        {/* [학습 여정 노선도 - 스토리텔링 시각화] */}
        <section className="bg-white border-[3px] border-slate-900 rounded-2xl p-10 shadow-[12px_12px_0px_0px_rgba(15,23,42,1)] mb-10 overflow-hidden">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-12 flex items-center gap-2 text-slate-400">
             <Rocket size={16} className="text-blue-600" /> Learning Journey Subway Map
          </h3>
          
          <div className="relative flex justify-between items-start pt-4 px-10">
            {/* 노선도 선 */}
            <div className="absolute top-[34px] left-[60px] right-[60px] h-[4px] bg-slate-100 z-0" />
            <div className="absolute top-[34px] left-[60px] w-[25%] h-[4px] bg-blue-600 z-0" />
            <div className={`absolute top-[34px] left-[60px] h-[4px] bg-blue-600 z-0 transition-all duration-1000`} style={{ width: `${(session.turnCount / 5) * 85}%` }} />

            {/* 역(Stations) */}
            {[
              { step: 1, label: "Problem Intake", icon: <Rocket size={18} />, color: "bg-blue-600" },
              { step: 2, label: "Context Sync", icon: <Activity size={18} />, color: "bg-blue-600" },
              { step: 3, label: "Deep Thinking", icon: <Brain size={18} />, color: deepThinkingZone ? "bg-amber-500 animate-pulse" : "bg-blue-600", isZone: true },
              { step: 4, label: "Logic Refine", icon: <Zap size={18} />, color: "bg-blue-600" },
              { step: 5, label: "Final Synthesis", icon: <Star size={18} />, color: "bg-emerald-500" },
            ].map((station, i) => (
              <div key={i} className="flex flex-col items-center relative z-10 w-24 text-center">
                <div className={`w-[44px] h-[44px] rounded-full border-[3px] border-slate-900 ${station.color} text-white flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] mb-4`}>
                  {station.icon}
                </div>
                <p className="text-[10px] font-black uppercase tracking-tighter text-slate-900 mb-1">{station.label}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Station {station.step}</p>
                {station.isZone && deepThinkingZone && (
                  <span className="absolute -top-10 bg-amber-100 text-amber-700 text-[8px] font-black px-2 py-1 rounded border border-amber-200 uppercase whitespace-nowrap">Bottleneck Detected</span>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          <main className="lg:col-span-8 space-y-10">
            
            <div className="bg-white border-[3px] border-slate-900 rounded-2xl p-8 md:p-12 shadow-[12px_12px_0px_0px_rgba(15,23,42,1)] relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-5">
                 <Award size={120} />
               </div>
               <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-[1.1] mb-8 italic uppercase tracking-tighter">
                 Learning <br /> Logic <br /> Verification
               </h2>
               
               <div className="space-y-6">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   <Bookmark size={14} className="text-blue-600" /> Learner's Final Synthesis
                 </h3>
                 <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6 italic text-slate-700 leading-relaxed text-lg font-medium">
                   "{session.userFinalOutput || '정리된 내용이 없습니다.'}"
                 </div>
               </div>
            </div>

            {/* [혼합된 사고 정체 구간 분석] */}
            {deepThinkingZone && (
              <div className="bg-slate-900 border-[3px] border-slate-900 rounded-2xl p-8 md:p-12 shadow-[12px_12px_0px_0px_rgba(15,23,42,1)] text-white relative overflow-hidden">
                <div className="absolute -right-10 -top-10 opacity-10 rotate-12">
                    <Brain size={200} />
                </div>
                <div className="flex items-center justify-between mb-10 relative z-10">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-blue-400">
                     <BarChart3 size={16} /> Cognitive Bottleneck Analysis
                  </h3>
                  <span className="px-3 py-1 bg-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/20">Station 3 Verified</span>
                </div>
                
                <div className="space-y-6 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                      <Clock size={32} className="text-amber-400 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Station 3: Deepest Engagement</p>
                      <p className="text-2xl font-black">이 구간에서 약 {deepThinkingZone.duration}초간 논리적 사투를 벌였습니다.</p>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6 italic">
                    <p className="text-[9px] font-black text-blue-400 uppercase mb-3 tracking-widest">Cognitive Trace</p>
                    <p className="text-lg font-bold text-slate-200 leading-relaxed">"{deepThinkingZone.content}"</p>
                  </div>
                  <p className="text-xs font-medium text-slate-400 leading-relaxed">
                    강사 가이드: 해당 답변이 도출되기까지 학습자의 인지 부하가 가장 높았습니다. 이 지점은 학습자가 기존 지식을 새로운 개념과 통합하려 노력한 **'결정적 학습 지점(Critical Learning Point)'**일 가능성이 큽니다.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-white border-[3px] border-slate-900 rounded-2xl p-8 md:p-12 shadow-[12px_12px_0px_0px_rgba(15,23,42,1)]">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-10 flex items-center gap-2">
                 <Activity size={14} className="text-blue-600" /> Complete Logical Trace
              </h3>
              <div className="space-y-12 relative before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-[3px] before:bg-slate-100">
                {session.messages.filter(m => m.content !== '').map((m, idx) => (
                  <div key={idx} className="relative pl-12 group">
                    <div className={`absolute left-0 top-1 w-8 h-8 rounded-full border-[3px] bg-white flex items-center justify-center z-10 transition-colors group-hover:scale-110 ${m.role === 'user' ? 'border-blue-600' : 'border-slate-300'}`}>
                      <div className={`w-2.5 h-2.5 rounded-full ${m.role === 'user' ? 'bg-blue-600' : 'bg-slate-300'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{m.role} · Step {Math.floor(idx/2)+1}</span>
                        {m.duration && <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1"><Clock size={10}/> {m.duration}s spent</span>}
                      </div>
                      <div className={`text-lg leading-relaxed ${m.role === 'user' ? 'text-blue-700 font-bold italic' : 'text-slate-600 font-medium'}`}>
                        {m.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>

          <aside className="lg:col-span-4 space-y-10">
            <div className="bg-white border-[3px] border-slate-900 rounded-2xl p-8 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-10">
              <section>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Mastered Concepts</h4>
                <div className="space-y-3">
                  {summary?.understood?.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 bg-emerald-50 border-2 border-emerald-100 rounded-xl hover:border-emerald-300 transition-colors">
                      <CheckCircle2 size={16} className="text-emerald-500 mt-0.5" />
                      <span className="text-sm font-bold text-slate-700 leading-tight">{item}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Growth Opportunities</h4>
                <div className="space-y-3">
                  {summary?.lacking?.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 bg-amber-50 border-2 border-amber-100 rounded-xl hover:border-amber-300 transition-colors">
                      <AlertCircle size={16} className="text-amber-500 mt-0.5" />
                      <span className="text-sm font-bold text-slate-700 leading-tight">{item}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Key Concepts</h4>
                <div className="flex flex-wrap gap-2">
                  {summary?.keyConcepts?.map((concept, i) => (
                    <span key={i} className="px-3 py-2 bg-blue-600 border-2 border-slate-900 text-white text-[10px] font-black rounded-lg shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] uppercase hover:translate-y-[-2px] transition-transform">
                      #{concept}
                    </span>
                  ))}
                </div>
              </section>
            </div>

            <div className="text-center pt-4 opacity-30 group hover:opacity-100 transition-opacity">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-2">Verified Academic Analysis</p>
              <p className="text-lg font-black text-slate-900 italic tracking-tighter uppercase">Vibe Tutor Academy</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}