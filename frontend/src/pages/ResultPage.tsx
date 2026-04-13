import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storage } from '../lib/storage';
import type { Session, AISummary } from '../types';
import { Home, Printer, ChevronRight, CheckCircle, AlertCircle, BookOpen } from 'lucide-react';

const API_BASE_URL = 'http://localhost:4000/api';
const STEPS = [['Problem','Definition'],['Context','Exploration'],['Concept','Mapping'],['Critical','Thinking'],['Solution','Synthesis']];
const KEYWORD_CLASSES = ['rp-keyword-blue','rp-keyword-green','rp-keyword-orange','rp-keyword-purple','rp-keyword-pink'];

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [archiveOpen, setArchiveOpen] = useState(false);

  useEffect(() => {
    const fetchSummary = async (cur: Session) => {
      try {
        const res = await fetch(`${API_BASE_URL}/sessions/${cur.id}/summary`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initial_input: cur.initialInput, messages: cur.messages.map(m => ({ role: m.role, content: m.content })) })
        });
        const data = await res.json();
        setSummary({ understood: data.understood || [], lacking: data.lacking || [], keyConcepts: data.key_concepts || data.keyConcepts || [] });
      } catch {
        setSummary({ understood: ['핵심 로직의 흐름 이해'], lacking: ['예외 상황 처리'], keyConcepts: ['Algorithm','Logic'] });
      } finally { setIsLoading(false); }
    };
    if (id) {
      const data = storage.getSession(id);
      if (data) { setSession(data); fetchSummary(data); } else navigate('/');
    }
  }, [id, navigate]);

  if (!session || isLoading) return (
    <div className="rp-loading">
      <div style={{ display: 'flex', gap: 8 }}>
        {[0,150,300].map(d => <div key={d} className="rp-loading-dot" style={{ animationDelay: `${d}ms` }} />)}
      </div>
      <p className="rp-loading-text">학습 데이터를 분석하고 있습니다...</p>
    </div>
  );

  const tc = session.turnCount;
  const fillPct = Math.min((tc / 5) * 90, 90);
  const msgCount = session.messages.filter(m => m.content).length;

  return (
    <div className="rp-root">

      {/* 네비 */}
      <nav className="rp-nav">
        <div className="rp-nav-left">
          <div className="rp-nav-logo"><BookOpen size={14} color="#fff" /></div>
          <span className="rp-nav-title">Nodapclass</span>
          <span className="rp-nav-divider">|</span>
          <span className="rp-nav-subtitle">Learning Analysis Report</span>
        </div>
        <div className="rp-nav-right">
          <div className="rp-ready-badge">
            <span className="rp-ready-dot" /> Report Ready
          </div>
          <button className="rp-home-btn" onClick={() => navigate('/')}>
            <Home size={13} /> 홈으로
          </button>
          <button className="rp-print-btn" onClick={() => window.print()}>
            <Printer size={13} /> PDF 저장
          </button>
        </div>
      </nav>

      <div className="rp-page">

        {/* Growth Timeline */}
        <div className="rp-card">
          <div className="rp-card-body">
            <p className="rp-timeline-title">Growth Timeline</p>
            <div className="rp-timeline-row">
              <div className="rp-timeline-track" />
              <div className="rp-timeline-fill" style={{ width: `${fillPct}%` }} />
              {STEPS.map((labels, i) => {
                const done = i < tc;
                const current = i === tc - 1;
                return (
                  <div key={i} className="rp-step-col">
                    <div className={`rp-step-dot${done ? ' done' : current ? ' current' : ''}`}>
                      {done ? <CheckCircle size={18} color="#fff" /> : <span style={{ fontSize: 12 }}>{i + 1}</span>}
                    </div>
                    <span className={`rp-step-label${done ? ' done' : ''}`}>{i + 1}. {labels[0]}</span>
                    <span className={`rp-step-label${done ? ' done' : ''}`}>{labels[1]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* User Reflection */}
        <div className="rp-card">
          <div className="rp-card-header-orange">
            <p className="rp-card-label-orange">User Reflection</p>
          </div>
          <div className="rp-card-body">
            <h3 className="rp-card-title">My Learning Reflection</h3>
            {session.userFinalOutput
              ? <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{session.userFinalOutput}</p>
              : <p style={{ fontSize: 14, color: '#CBD5E1', fontStyle: 'italic' }}>아직 최종 정리 내용이 없습니다.</p>
            }
          </div>
        </div>

        {/* AI Tutor Feedback */}
        <div className="rp-card">
          <div className="rp-card-header-blue">
            <p className="rp-card-label-blue">AI Tutor Feedback</p>
          </div>
          <div className="rp-card-body">
            <h3 className="rp-card-title">AI Tutor's Insights</h3>

            {summary?.keyConcepts && summary.keyConcepts.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 8 }}>Core Keywords</p>
                <div className="rp-keywords">
                  {summary.keyConcepts.map((k, i) => (
                    <span key={i} className={KEYWORD_CLASSES[i % KEYWORD_CLASSES.length]}>{k}</span>
                  ))}
                </div>
              </div>
            )}

            <div>
              {summary?.understood?.map((item, i) => (
                <div key={i} className="rp-analysis-row">
                  <div className="rp-analysis-dot-green"><CheckCircle size={12} color="#16A34A" /></div>
                  <div>
                    {i === 0 && <span className="rp-analysis-label-green">Understanding: </span>}
                    <span className="rp-analysis-text">{item}</span>
                  </div>
                </div>
              ))}
              {summary?.lacking?.map((item, i) => (
                <div key={i} className="rp-analysis-row">
                  <div className="rp-analysis-dot-yellow"><AlertCircle size={12} color="#D97706" /></div>
                  <div>
                    {i === 0 && <span className="rp-analysis-label-yellow">Areas for Improvement: </span>}
                    <span className="rp-analysis-text">{item}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Conversation Archive */}
        <div className="rp-card">
          <button className="rp-archive-trigger" onClick={() => setArchiveOpen(!archiveOpen)}>
            <span>View Complete Conversation Archive ({msgCount} turns)</span>
            <ChevronRight size={14} color="#94A3B8" style={{ transform: archiveOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          {archiveOpen && (
            <div className="rp-archive-content">
              {session.messages.filter(m => m.content).map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'rp-archive-msg-user' : 'rp-archive-msg-ai'}>
                  <div className={m.role === 'user' ? 'rp-archive-avatar-user' : 'rp-archive-avatar-ai'}>
                    {m.role === 'user' ? 'U' : 'AI'}
                  </div>
                  <div className={m.role === 'user' ? 'rp-archive-bubble-user' : 'rp-archive-bubble-ai'}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
