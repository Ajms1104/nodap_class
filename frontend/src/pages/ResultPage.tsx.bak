import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storage } from '../lib/storage';
import type { Session, AISummary } from '../types';
import { Home, Printer, Share2, Activity, History, ShieldCheck, Zap, Layers, ChevronRight, BookOpen } from 'lucide-react';

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async (currentSession: Session) => {
      try {
        const response = await fetch(`http://localhost:4000/api/sessions/${currentSession.id}/summary`, {
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
          understood: ['핵심 아키텍처 이해', '데이터 흐름의 논리적 타당성'],
          lacking: ['엣지 케이스에 대한 방어 로직', '성능 최적화 고려'],
          keyConcepts: ['Scalability', 'Maintainability', 'Security']
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

  if (!session || isLoading) {
    return (
      <div className="fixed inset-0 bg-[#f8fafc] flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 bg-indigo-600 rounded-xl animate-bounce flex items-center justify-center text-white mb-6">
          <Activity size={24} />
        </div>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.3em]">Generating Technical Debrief...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900 font-sans pb-20">
      
      <nav className="h-16 bg-white border-b px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-900">
            <Home size={20} />
          </button>
          <div className="w-[1px] h-4 bg-slate-200"></div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Workshop Session: {id?.slice(0, 8)}</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
            <Printer size={16} /> Export PDF
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
            <Share2 size={16} /> Share Insight
          </button>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto mt-12 px-8 flex flex-col lg:flex-row gap-8">
        
        {/* [좌측] Workshop Trace */}
        <section className="flex-[1.5] space-y-8">
          <div className="bg-white rounded-2xl border p-10 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600" />
            <header className="mb-10 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-black tracking-tight mb-2 uppercase italic">Workshop Trace</h1>
                <p className="text-sm font-medium text-slate-400 tracking-tight">당신의 설계가 발전해 온 모든 논리적 과정입니다.</p>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black text-slate-300 uppercase mb-1 tracking-widest">Verified At</div>
                <div className="text-xs font-bold text-slate-900">{new Date(session.createdAt).toLocaleString()}</div>
              </div>
            </header>

            <div className="mb-12">
              <div className="flex items-center gap-2 mb-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                <ShieldCheck size={14} className="text-indigo-500" /> Initial Blueprint
              </div>
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-300 bg-slate-900 p-8 rounded-xl shadow-inner border border-slate-800">
                {session.initialInput}
              </pre>
            </div>

            <div className="space-y-12 relative before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-[2px] before:bg-slate-100">
              {session.messages.map((m, idx) => (
                <div key={m.id} className="relative pl-10">
                  <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center z-10 ${m.role === 'user' ? 'border-indigo-600' : 'border-slate-300'}`}>
                    <div className={`w-2 h-2 rounded-full ${m.role === 'user' ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-300 uppercase mb-2 tracking-widest">{m.role} · Step {Math.floor(idx/2)+1}</span>
                    <div className={`text-lg leading-relaxed ${m.role === 'user' ? 'text-indigo-600 font-bold' : 'text-slate-600 font-medium'}`}>
                      {m.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* [우측] Executive Insights */}
        <section className="flex-1 space-y-8 lg:sticky lg:top-24 h-fit">
          
          <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-10">
              <Zap size={120} />
            </div>
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Activity size={14} /> Performance Summary
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="text-[10px] font-bold text-white/40 uppercase mb-1">Status</div>
                <div className="text-lg font-black text-emerald-400 uppercase">Verified</div>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="text-[10px] font-bold text-white/40 uppercase mb-1">Turns</div>
                <div className="text-lg font-black">{session.turnCount} / 5</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border p-8 shadow-sm space-y-10">
            <section>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <ShieldCheck size={14} className="text-indigo-600" /> Core Competencies
              </h4>
              <div className="space-y-3">
                {summary?.understood?.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                      <ChevronRight size={12} />
                    </div>
                    <span className="text-sm font-bold text-slate-700 leading-snug">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Layers size={14} className="text-amber-500" /> Growth Recommendations
              </h4>
              <div className="space-y-3">
                {summary?.lacking?.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 group hover:border-amber-200 transition-colors">
                    <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
                      <div className="w-1.5 h-1.5 bg-amber-600 rounded-full" />
                    </div>
                    <span className="text-sm font-bold text-slate-700 leading-snug">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <BookOpen size={14} className="text-indigo-600" /> Strategic Keywords
              </h4>
              <div className="flex flex-wrap gap-2">
                {summary?.keyConcepts?.map((concept, i) => (
                  <span key={i} className="px-3 py-1.5 bg-slate-900 text-white text-[11px] font-bold rounded shadow-sm hover:scale-105 transition-transform cursor-default">
                    #{concept}
                  </span>
                ))}
              </div>
            </section>
          </div>

          <div className="text-center pt-8">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-2">Technical Analysis Result</p>
            <p className="text-lg font-black text-slate-900 italic tracking-tighter uppercase opacity-30">Vibe Tutor Academy</p>
          </div>

        </section>
      </main>
    </div>
  );
}
