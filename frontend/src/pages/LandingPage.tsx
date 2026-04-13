import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../lib/storage';
import type { Session, Message } from '../types';
import { Send, Paperclip, X, ImageIcon, FileText, BookOpen, Lightbulb, Sparkles, Code2, HelpCircle } from 'lucide-react';

type AttachedFile = { id: string; type: 'image' | 'text'; content: string; name: string; };
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const STEP_LABELS = ['Step 1', 'Step 2', 'Step 3', 'Step 4', 'Step 5+'];

export default function LandingPage() {
  const navigate = useNavigate();
  const [chatInput, setChatInput] = useState('');
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages, isTyping]);

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setChatInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const processFile = (content: string, type: 'image' | 'text') =>
      setFiles(prev => [...prev, { id: crypto.randomUUID(), type, content, name: file.name }]);
    if (file.type.startsWith('image/')) {
      const r = new FileReader(); r.onload = ev => processFile(ev.target?.result as string, 'image'); r.readAsDataURL(file);
    } else if (file.name.endsWith('.txt') || file.type === 'text/plain') {
      const r = new FileReader(); r.onload = ev => processFile(ev.target?.result as string, 'text'); r.readAsText(file);
    }
    e.target.value = '';
  };

  const triggerAiResponse = async (sess: Session, messages: Message[], turnCount: number) => {
    setIsTyping(true);
    const aiId = crypto.randomUUID();
    try {
      const res = await fetch(`${API_BASE_URL}/sessions/${sess.id}/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initial_input: sess.initialInput, messages: messages.map(m => ({ role: m.role, content: m.content })), turn_count: turnCount })
      });
      if (!res.body) throw new Error();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let content = '';
      const initMsg: Message = { id: aiId, role: 'assistant', content: '', createdAt: new Date() };
      const upd = storage.addMessage(sess.id, initMsg);
      if (upd) setSession(upd);
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const str = line.slice(6).trim();
          if (str === '[DONE]') continue;
          try {
            const p = JSON.parse(str);
            if (p.type === 'text') {
              content += p.value;
              setSession(prev => prev ? { ...prev, messages: prev.messages.map(m => m.id === aiId ? { ...m, content } : m) } : null);
            }
          } catch {}
        }
      }
      storage.updateMessageContent(sess.id, aiId, content);
      const final = storage.getSession(sess.id);
      if (final) setSession(final);
    } catch { alert('AI 응답 오류가 발생했습니다.'); }
    finally { setIsTyping(false); }
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isTyping) return;
    const input = chatInput;
    setChatInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    let sess = session;
    if (!sess) {
      setIsTyping(true);
      try {
        let finalInput = input;
        const imgFile = files.find(f => f.type === 'image');
        const txtFile = files.find(f => f.type === 'text');
        if (txtFile) finalInput = `[첨부 파일: ${txtFile.name}]\n${txtFile.content}\n\n[사용자 입력]\n${input}`;
        const res = await fetch(`${API_BASE_URL}/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initial_input: finalInput }) });
        if (!res.ok) throw new Error();
        const data = await res.json();
        let imgAnalysis = '';
        if (imgFile) {
          const blob = await fetch(imgFile.content).then(r => r.blob());
          const fd = new FormData(); fd.append('image', blob, imgFile.name); fd.append('user_text', input);
          const imgRes = await fetch(`${API_BASE_URL}/sessions/${data.session_id}/image`, { method: 'POST', body: fd });
          if (imgRes.ok) { const d = await imgRes.json(); imgAnalysis = d.ai_response; }
        }
        const enriched = imgAnalysis ? `${finalInput}\n\n[이미지 분석 결과]\n${imgAnalysis}` : finalInput;
        sess = storage.createSession(enriched, imgFile?.content, data.session_id);
        setSession(sess);
      } catch { alert('세션 생성에 실패했습니다.'); setIsTyping(false); return; }
    }
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: input, createdAt: new Date() };
    const upd = storage.addMessage(sess.id, userMsg);
    if (upd) { setSession(upd); await triggerAiResponse(upd, upd.messages, upd.turnCount); }
  };

  const parseAI = (content: string) => {
    const am = content.match(/\[분석\](.*?)(?=\[질문\]|$)/s);
    const qm = content.match(/\[질문\](.*?)$/s);
    return {
      analysis: am ? am[1].trim().replace(/^:/, '').trim() : content.split('[질문]')[0].trim(),
      question: qm ? qm[1].trim().replace(/^:/, '').trim() : ''
    };
  };

  const tc = session?.turnCount ?? 0;

  return (
    <div className="nd-root">

      {/* ── 사이드바 ── */}
      <aside className="nd-sidebar">
        <div className="nd-sidebar-topline" />
        <div className="nd-sidebar-header">
          <div className="nd-sidebar-logo-row">
            <div className="nd-sidebar-logo">
              <BookOpen size={16} color="#fff" />
            </div>
            <div>
              <p className="nd-sidebar-title">NodapClass</p>
              <p className="nd-sidebar-tagline">AI가 답을 주지 않습니다</p>
            </div>
          </div>
        </div>

        <div className="nd-sidebar-scroll">
          {!session ? (
            <>
              <p className="nd-sidebar-label">학습 자료 첨부</p>
              <label className="nd-sidebar-upload">
                <div className="nd-sidebar-upload-icon">
                  <Paperclip size={14} color="#A0AEC0" />
                </div>
                <p className="nd-sidebar-upload-text">이미지 또는 텍스트 파일<br />클릭하여 첨부</p>
                <input type="file" style={{ display: 'none' }} onChange={handleFileChange} accept="image/*,.txt" />
              </label>
              {files.map(f => (
                <div key={f.id} className="nd-sidebar-file-item">
                  {f.type === 'image' ? <ImageIcon size={13} color="#68D391" style={{ flexShrink: 0 }} /> : <FileText size={13} color="#63B3ED" style={{ flexShrink: 0 }} />}
                  <span className="nd-sidebar-file-name">{f.name}</span>
                  <button className="nd-file-remove" onClick={() => setFiles(p => p.filter(x => x.id !== f.id))}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </>
          ) : (
            <>
              <p className="nd-sidebar-label">학습 컨텍스트</p>
              {session.initialImage && (
                <div className="nd-sidebar-preview-image">
                  <img src={session.initialImage} alt="첨부" style={{ width: '100%', borderRadius: 8 }} />
                </div>
              )}
              <div className="nd-sidebar-preview-box">
                <p className="nd-sidebar-preview-label">Learning Context</p>
                {session.title && <p className="nd-sidebar-preview-title">{session.title}</p>}
                <pre className="nd-sidebar-preview-text">
                  {(session.initialInput ?? '').slice(0, 300)}{(session.initialInput?.length ?? 0) > 300 ? '...' : ''}
                </pre>
              </div>
            </>
          )}
        </div>

        <div className="nd-sidebar-bottom">
          <p className="nd-sidebar-bottom-text">© 2024 NodapClass. Educational Purpose Only.</p>
        </div>
      </aside>

      {/* ── 메인 ── */}
      <div className="nd-main">

        {/* 헤더 */}
        <header className="nd-header">
          <span className="nd-header-title">NodapClass - AI Tutor Chat</span>

          {session && (
            <div className="nd-header-steps">
              {STEP_LABELS.map((label, i) => {
                const done = i < tc;
                const active = i === tc - 1 || (i === 4 && tc >= 5);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                    {i > 0 && <div className={`nd-step-connector${done ? ' done' : ''}`} />}
                    <div className={`nd-step-item${done ? ' done' : active ? ' active' : ''}`}>
                      <div className={`nd-step-circle${done ? ' done' : active ? ' active' : ''}`}>
                        {done ? '✓' : i + 1}
                      </div>
                      {label}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {session && (
            <div className="nd-header-right">
              <span className="nd-turns-badge">{tc >= 5 ? '5+ Turns' : `${tc} / 5`}</span>
              {tc >= 5 && (
                <button className="nd-finish-btn" onClick={() => navigate(`/result/${session.id}`)}>
                  <Sparkles size={12} /> Finish
                </button>
              )}
            </div>
          )}
        </header>

        {/* 채팅 */}
        <div className="nd-chat-wrap">
          {!session ? (
            <div className="nd-empty-state">
              <div className="nd-empty-board">
                <div className="nd-empty-board-line" />
                <p className="nd-empty-board-title">답없는 교실에 오신 걸 환영합니다</p>
                <div className="nd-empty-board-divider" />
                <p className="nd-empty-board-desc">AI 튜터는 절대 답을 주지 않습니다.<br />질문으로 당신이 스스로 찾아가도록 이끕니다.</p>
                <div className="nd-empty-board-divider" />
                <p className="nd-empty-board-hint">↓ 아래에 학습할 내용을 입력하세요</p>
              </div>
              <div className="nd-empty-tags">
                <span className="nd-empty-tag"><Code2 size={12} /> 코드</span>
                <span className="nd-empty-tag"><FileText size={12} /> 기획안</span>
                <span className="nd-empty-tag"><Lightbulb size={12} /> 아이디어</span>
                <span className="nd-empty-tag"><HelpCircle size={12} /> 개념 정리</span>
              </div>
            </div>
          ) : (
            <div className="nd-chat-inner">
              {session.messages.map(m => {
                if (m.role === 'assistant') {
                  const { analysis, question } = parseAI(m.content);
                  return (
                    <div key={m.id} className="nd-ai-row">
                      <div className="nd-ai-avatar"><BookOpen size={14} color="#fff" /></div>
                      <div className="nd-ai-content">
                        <p className="nd-ai-label"><span className="nd-ai-label-dot" />AI Tutor</p>
                        {m.content === '' ? (
                          <div className="nd-typing-card">
                            <div className="nd-typing-dots">
                              <div className="nd-typing-dot" />
                              <div className="nd-typing-dot" />
                              <div className="nd-typing-dot" />
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {analysis && (
                              <div className="nd-analysis-card">
                                <p className="nd-analysis-card-label"><Lightbulb size={10} /> Analysis</p>
                                <p className="nd-analysis-card-text">{analysis}</p>
                              </div>
                            )}
                            {question && (
                              <div className="nd-question-card">
                                <p className="nd-question-card-label"><Sparkles size={10} /> Key Question:</p>
                                <p className="nd-question-card-text">{question}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={m.id} className="nd-user-block">
                    <p className="nd-user-label">You</p>
                    <div className="nd-user-bubble">{m.content}</div>
                  </div>
                );
              })}

              {isTyping && session.messages[session.messages.length - 1]?.role === 'user' && (
                <div className="nd-ai-row">
                  <div className="nd-ai-avatar"><BookOpen size={14} color="#fff" /></div>
                  <div className="nd-ai-content">
                    <p className="nd-ai-label"><span className="nd-ai-label-dot" />AI Tutor</p>
                    <div className="nd-typing-card">
                      <div className="nd-typing-dots">
                        <div className="nd-typing-dot" />
                        <div className="nd-typing-dot" />
                        <div className="nd-typing-dot" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* 입력창 */}
        <div className="nd-input-area">
          <div className="nd-input-wrap">
            <form onSubmit={handleSend} className="nd-input-box">
              <textarea
                ref={textareaRef}
                className="nd-input-textarea"
                placeholder="Type your answer here or paste code..."
                value={chatInput}
                onChange={autoResize}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as any); } }}
                disabled={isTyping}
                rows={1}
              />
              <div className="nd-input-footer">
                <div className="nd-input-footer-left">
                  <label className="nd-attach-btn">
                    <Paperclip size={13} /> Attach File
                    <input type="file" style={{ display: 'none' }} onChange={handleFileChange} accept="image/*,.txt" />
                  </label>
                  <span className="nd-attach-btn" style={{ cursor: 'default' }}>
                    <Code2 size={13} /> Insert Code Snippet
                  </span>
                </div>
                <button type="submit" disabled={!chatInput.trim() || isTyping} className="nd-send-btn">
                  <Send size={13} /> Send
                </button>
              </div>
            </form>
            {session && (
              <p className="nd-input-hint">
                {tc < 5 ? `${5 - tc}번 더 대화하면 결과 보고서를 생성할 수 있어요` : '✓ Finish 버튼을 눌러 결과 보고서를 생성하세요'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
