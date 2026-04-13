import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storage } from '../lib/storage';
import type { Session, Message } from '../types';
import { Send, Bot, MessageSquare, ArrowLeft, X, Loader2, Clock, Eye, Sparkles, HelpCircle, Lightbulb, Pin } from 'lucide-react';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const API_BASE_URL = 'http://localhost:4000/api';

// ============================================================
// STYLES
// ============================================================
const styles = {
  // 레이아웃
  pageWrapper: "fixed inset-0 w-screen h-screen flex flex-col items-center justify-center select-none overflow-hidden bg-slate-50 font-sans",
  bgPattern: "absolute inset-0 opacity-[0.03] pointer-events-none",
  exitButton: "absolute top-8 left-10 flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold uppercase text-xs tracking-widest z-[100]",
  mainContainer: "w-[1400px] h-[820px] flex relative rounded-xl border-[3px] border-slate-900 bg-white overflow-hidden shadow-[12px_12px_0px_0px_rgba(15,23,42,1)] z-10",

  // 좌측 패널
  leftPanel: "w-[45%] h-full bg-slate-800 flex flex-col border-r-[3px] border-slate-900 relative",
  leftHeader: "h-12 border-b-[2px] border-slate-700 flex items-center px-4 gap-2 bg-slate-900 shrink-0",
  leftHeaderDot: (color: string) => `w-3 h-3 rounded-full bg-${color}-500`,
  leftHeaderTitle: "ml-4 text-xs font-mono text-slate-500 uppercase tracking-widest",
  leftContent: "flex-1 overflow-auto custom-scrollbar p-8",
  initialImage: "mb-8 border-2 border-slate-700 rounded-lg overflow-hidden bg-slate-900 max-w-sm shadow-2xl",
  pinHint: "mb-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2",
  codeBlock: "whitespace-pre-wrap font-mono text-[14px] leading-7 text-slate-300",
  codeLine: (isPinned: boolean) => `flex transition-colors group ${isPinned ? 'bg-blue-900/30' : 'hover:bg-slate-700/50'}`,
  lineNumber: (isPinned: boolean) => `text-slate-600 mr-4 select-none w-8 text-right font-mono text-xs pt-1 cursor-pointer hover:text-blue-400 transition-colors ${isPinned ? 'text-blue-400 font-black' : ''}`,
  lineContent: (isPinned: boolean) => isPinned ? 'text-blue-100 font-medium' : '',

  // 우측 패널
  rightPanel: "w-[55%] h-full flex flex-col bg-slate-50 relative",
  rightHeader: "h-20 border-b-[2px] border-slate-200 flex items-center justify-between px-8 bg-white shrink-0 z-20",
  rightHeaderLeft: "flex items-center gap-3 text-slate-400",
  rightHeaderTitle: "text-xs font-black uppercase tracking-widest text-slate-600 tracking-[0.2em]",
  rightHeaderRight: "flex items-center gap-2",
  turnDots: "flex gap-1.5",
  turnDot: (isActive: boolean) => `w-8 h-1.5 rounded-full transition-all duration-500 ${isActive ? 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]' : 'bg-slate-200'}`,
  turnCount: "text-[10px] font-black text-slate-400 ml-2 tracking-tighter uppercase",

  // Sticky Context
  stickyWrapper: (show: boolean) => `absolute top-24 left-8 right-8 z-40 transition-all duration-300 transform ${show ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-2 opacity-0 scale-95 pointer-events-none'}`,
  stickyInner: "bg-slate-900 border-[3px] border-slate-900 p-3 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex items-center justify-between",
  stickyLeft: "flex items-center gap-3 overflow-hidden",
  stickyIcon: "w-8 h-8 bg-blue-600 rounded flex items-center justify-center shrink-0",
  stickyLabel: "text-[9px] font-black text-blue-400 uppercase tracking-widest",
  stickyTitle: "text-xs font-bold text-white truncate",
  stickyButton: "px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-[9px] font-black uppercase rounded-lg transition-colors border border-white/10",

  // 채팅 영역
  chatScroll: "flex-1 overflow-auto px-8 py-10 space-y-12 custom-scrollbar pb-64 relative z-10",
  messageRow: (isUser: boolean) => `flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`,

  // AI 메시지
  aiMessageWrapper: "w-[90%]",
  aiMessageLabel: "flex items-center gap-2 mb-2 text-blue-600 font-black text-[10px] uppercase tracking-widest",
  aiMessageBubble: "border-l-[4px] border-blue-600 bg-white shadow-sm p-6 rounded-r-xl relative overflow-hidden",
  aiTypingDot: (delay: string) => `w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce`,
  aiTypingWrapper: "flex items-center gap-1.5 h-6",
  aiMarkdownWrapper: "prose prose-slate prose-sm max-w-none",
  inlineCode: "bg-slate-100 text-blue-600 px-1.5 py-0.5 rounded font-mono text-[0.9em]",
  codeBlockWrapper: "my-4 rounded-lg overflow-hidden border border-slate-200",
  questionHighlight: "bg-yellow-200/80 font-bold text-slate-900 px-2 py-1.5 border-l-4 border-yellow-500 shadow-sm inline-block",
  markdownParagraph: "text-slate-700 leading-relaxed text-[15px] mb-4 last:mb-0",

  // 사용자 메시지
  userMessageWrapper: "w-[80%] text-right",
  userMessageMeta: "flex items-center justify-end gap-3 mb-2",
  userThoughtTime: "flex items-center gap-1 text-[9px] font-black text-slate-300 uppercase tracking-widest",
  userLabel: "text-slate-400 font-black text-[10px] uppercase tracking-widest",
  userMessageBubble: (isDeepThinking: boolean) => `inline-block text-left text-slate-800 font-bold text-[15px] leading-relaxed p-5 rounded-l-2xl border-r-[4px] shadow-sm ${isDeepThinking ? 'bg-amber-50 border-amber-400' : 'bg-slate-200/40 border-slate-400'}`,
  deepThinkingBadge: "mt-3 pt-3 border-t border-amber-200 text-[10px] font-black text-amber-600 uppercase flex items-center gap-1.5 animate-pulse",

  // 하단 영역
  bottomArea: "absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent z-30",
  thinkingChips: "flex gap-2 mb-4 animate-in slide-in-from-bottom-2 duration-300",
  thinkingChip: "flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-900 rounded-full text-[11px] font-black uppercase tracking-tight shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-y-[1px] transition-all",
  chipIcon: "text-blue-600",
  finishButton: "w-full flex items-center justify-center gap-3 px-8 py-5 bg-blue-600 text-white rounded-xl font-black uppercase tracking-[0.2em] text-xs border-[3px] border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] hover:translate-y-[2px] active:translate-y-[6px] transition-all",
  finishButtonWrapper: "flex justify-center animate-in slide-in-from-bottom-4",

  // 최종 정리 영역
  finalizingWrapper: "bg-white p-6 rounded-xl border-[3px] border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]",
  finalizingHeader: "flex justify-between items-center mb-4",
  finalizingTitle: "text-[10px] font-black text-slate-800 uppercase tracking-widest",
  finalizingCloseButton: "text-slate-400 hover:text-slate-900",
  finalizingTextarea: "w-full h-32 p-5 bg-slate-50 border-[2px] border-slate-200 rounded-lg outline-none text-slate-800 text-[15px] font-medium mb-4 focus:border-blue-500",
  finalizingSubmitButton: "w-full py-4 bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-xs border-[2px] border-slate-900 rounded-lg active:scale-[0.98] transition-all flex justify-center items-center gap-2",

  // 입력 폼
  inputForm: (isHidden: boolean) => `relative flex items-center transition-all duration-300 ${isHidden ? 'opacity-0 scale-95 pointer-events-none absolute' : 'opacity-100 scale-100'}`,
  inputField: "flex-1 pl-6 pr-24 py-6 bg-white border-[3px] border-slate-900 rounded-xl outline-none text-[18px] font-bold text-slate-800 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] focus:translate-y-[1px] transition-all disabled:bg-slate-100",
  sendButton: "absolute right-3 top-3 bottom-3 w-16 bg-blue-600 border-[2px] border-slate-900 text-white rounded-lg flex items-center justify-center active:scale-90 transition-all z-20",
}

// ============================================================
// CONSTANTS
// ============================================================
const THINKING_CHIPS = [
  { label: "힌트가 더 필요해요", icon: <HelpCircle size={14} />, text: "이 부분에 대해 조금 더 구체적인 힌트를 주실 수 있나요?" },
  { label: "제 논리가 맞나요?", icon: <Lightbulb size={14} />, text: "제가 방금 설명한 논리 구조에 오류가 없는지 궁금해요." },
  { label: "다른 관점의 질문", icon: <Sparkles size={14} />, text: "이 문제를 해결하기 위해 제가 놓치고 있는 다른 관점이 있을까요?" },
];

// ============================================================
// COMPONENT
// ============================================================
export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [userFinalOutput, setUserFinalOutput] = useState('');
  const [showSticky, setShowSticky] = useState(false);
  const [pinnedLines, setPinnedLines] = useState<number[]>([]);

  const lastAiQuestionTime = useRef<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      const data = storage.getSession(id);
      if (data) {
        setSession(data);
        if (data.messages.length === 0) {
          triggerAiResponse(data, [{ role: 'user', content: '학습을 시작하고 싶습니다. 제가 제출한 내용을 분석해주세요.' }], 0);
        }
      } else {
        navigate('/');
      }
    }
  }, [id, navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setShowSticky(e.currentTarget.scrollTop > 200);
  };

  const togglePin = (lineIndex: number) => {
    setPinnedLines(prev =>
      prev.includes(lineIndex) ? prev.filter(l => l !== lineIndex) : [...prev, lineIndex]
    );
  };

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
            } catch (e) {}
          }
        }
      }

      lastAiQuestionTime.current = Date.now();
      storage.updateMessageContent(currentSession.id, aiMessageId, aiContent);
      const finalData = storage.getSession(currentSession.id);
      if (finalData) setSession(finalData);

    } catch (error) {
      console.error('AI Error:', error);
      alert('AI 응답을 가져오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const finalInput = customText || input;
    if (!finalInput.trim() || !session || isLoading || isFinalizing) return;

    const duration = lastAiQuestionTime.current
      ? Math.floor((Date.now() - lastAiQuestionTime.current) / 1000)
      : 0;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: finalInput,
      createdAt: new Date(),
      duration
    };

    const updatedSession = storage.addMessage(session.id, userMessage);
    if (updatedSession) {
      setSession(updatedSession);
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

      if (!response.ok) throw new Error('Final submit failed');

      storage.updateFinalOutput(session.id, userFinalOutput);
      navigate(`/result/${session.id}`);
    } catch (error) {
      console.error('Final submit error:', error);
      alert('최종 정리 제출에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) return null;

  return (
    <div className={styles.pageWrapper}>

      <div className={styles.bgPattern}
        style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />

      <button onClick={() => navigate('/')} className={styles.exitButton}>
        <ArrowLeft size={16} /> Exit Workspace
      </button>

      <div className={styles.mainContainer}>

        {/* 좌측 패널 */}
        <div className={styles.leftPanel}>
          <div className={styles.leftHeader}>
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className={styles.leftHeaderTitle}>Active Blueprint</span>
          </div>

          <div className={styles.leftContent}>
            {session.initialImage && (
              <div className={styles.initialImage}>
                <img src={session.initialImage} alt="Reference" className="w-full" />
              </div>
            )}

            <div className={styles.pinHint}>
              <Pin size={12} className="text-blue-500" /> Click line number to focus
            </div>

            <pre className={styles.codeBlock}>
              <code className="block">
                {session.initialInput.split('\n').map((line, i) => (
                  <div key={i} className={styles.codeLine(pinnedLines.includes(i))}>
                    <span
                      onClick={() => togglePin(i)}
                      className={styles.lineNumber(pinnedLines.includes(i))}
                    >
                      {pinnedLines.includes(i) ? '●' : i + 1}
                    </span>
                    <span className={styles.lineContent(pinnedLines.includes(i))}>{line}</span>
                  </div>
                ))}
              </code>
            </pre>
          </div>
        </div>

        {/* 우측 패널 */}
        <div className={styles.rightPanel}>

          <div className={styles.rightHeader}>
            <div className={styles.rightHeaderLeft}>
              <MessageSquare size={18} className="text-blue-500" />
              <span className={styles.rightHeaderTitle}>Mentoring Flow</span>
            </div>

            <div className={styles.rightHeaderRight}>
              <div className={styles.turnDots}>
                {[1, 2, 3, 4, 5].map((step) => (
                  <div key={step} className={styles.turnDot(session.turnCount >= step)} />
                ))}
              </div>
              <span className={styles.turnCount}>{session.turnCount}/5</span>
            </div>
          </div>

          {/* Sticky Context */}
          <div className={styles.stickyWrapper(showSticky)}>
            <div className={styles.stickyInner}>
              <div className={styles.stickyLeft}>
                <div className={styles.stickyIcon}>
                  <Eye size={16} className="text-white" />
                </div>
                <div className="truncate">
                  <p className={styles.stickyLabel}>Active Blueprint</p>
                  <p className={styles.stickyTitle}>{session.title}</p>
                </div>
              </div>
              <button
                onClick={() => scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                className={styles.stickyButton}
              >
                Focus
              </button>
            </div>
          </div>

          {/* 채팅 영역 */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className={styles.chatScroll}
          >
            {session.messages.map((m) => (
              <div key={m.id} className={styles.messageRow(m.role === 'user')}>

                {m.role === 'assistant' && (
                  <div className={styles.aiMessageWrapper}>
                    <div className={styles.aiMessageLabel}>
                      <Bot size={14} /> AI Mentor
                    </div>
                    <div className={styles.aiMessageBubble}>
                      {m.content === '' ? (
                        <div className={styles.aiTypingWrapper}>
                          <div className={styles.aiTypingDot('0ms')} style={{ animationDelay: '0ms' }} />
                          <div className={styles.aiTypingDot('150ms')} style={{ animationDelay: '150ms' }} />
                          <div className={styles.aiTypingDot('300ms')} style={{ animationDelay: '300ms' }} />
                        </div>
                      ) : (
                        <div className={styles.aiMarkdownWrapper}>
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code({ node, inline, className, children, ...props }: any) {
                                const match = /language-(\w+)/.exec(className || '');
                                return !inline && match ? (
                                  <div className={styles.codeBlockWrapper}>
                                    <SyntaxHighlighter
                                      style={atomDark}
                                      language={match[1]}
                                      PreTag="div"
                                      customStyle={{ margin: 0, padding: '1.5rem', fontSize: '13px' }}
                                      {...props}
                                    >
                                      {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                  </div>
                                ) : (
                                  <code className={styles.inlineCode} {...props}>{children}</code>
                                );
                              },
                              p({ children }) {
                                const text = String(children);
                                if (text.startsWith('[질문]')) {
                                  return (
                                    <p className="mt-6 mb-2">
                                      <span className={styles.questionHighlight}>
                                        Q: {text.replace('[질문]', '').replace(':', '').trim()}
                                      </span>
                                    </p>
                                  );
                                }
                                return <p className={styles.markdownParagraph}>{children}</p>;
                              }
                            }}
                          >
                            {m.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {m.role === 'user' && (
                  <div className={styles.userMessageWrapper}>
                    <div className={styles.userMessageMeta}>
                      {m.duration && (
                        <span className={styles.userThoughtTime}>
                          <Clock size={10} /> Thought for {m.duration}s
                        </span>
                      )}
                      <span className={styles.userLabel}>You</span>
                    </div>
                    <div className={styles.userMessageBubble((m.duration || 0) > 120)}>
                      {m.content}
                      {(m.duration || 0) > 120 && (
                        <div className={styles.deepThinkingBadge}>
                          <Sparkles size={12} /> Deep Thinking Zone
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* 하단 영역 */}
          <div className={styles.bottomArea}>

            {!isFinalizing && session.turnCount < 5 && !isLoading && (
              <div className={styles.thinkingChips}>
                {THINKING_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage({} as FormEvent, chip.text)}
                    className={styles.thinkingChip}
                  >
                    <span className={styles.chipIcon}>{chip.icon}</span>
                    {chip.label}
                  </button>
                ))}
              </div>
            )}

            {session.turnCount >= 5 && !isFinalizing && (
              <div className={styles.finishButtonWrapper}>
                <button onClick={startFinalizing} className={styles.finishButton}>
                  <Bot size={18} /> Finish Workshop & Generate Report
                </button>
              </div>
            )}

            {isFinalizing ? (
              <div className={styles.finalizingWrapper}>
                <div className={styles.finalizingHeader}>
                  <h4 className={styles.finalizingTitle}>Final Learning Summary</h4>
                  <button onClick={() => setIsFinalizing(false)} className={styles.finalizingCloseButton}>
                    <X size={20} />
                  </button>
                </div>
                <textarea
                  autoFocus
                  className={styles.finalizingTextarea}
                  placeholder="오늘의 학습을 통해 배운 내용을 자신만의 언어로 정리해 보세요..."
                  value={userFinalOutput}
                  onChange={(e) => setUserFinalOutput(e.target.value)}
                />
                <button onClick={handleFinalSubmit} className={styles.finalizingSubmitButton}>
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Confirm & Analysis'}
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSendMessage}
                className={styles.inputForm(session.turnCount >= 5)}
              >
                <input
                  disabled={isLoading || session.turnCount >= 5}
                  className={styles.inputField}
                  placeholder="Type your answer or question..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading || session.turnCount >= 5}
                  className={styles.sendButton}
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
