import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Button, Input, Typography, Space, Spin, message,
  Tooltip, Avatar, Tag, Checkbox, Badge, Divider, Segmented, Switch,
} from 'antd';
import {
  ArrowLeftOutlined, SendOutlined, RobotOutlined,
  FilePdfOutlined, BookOutlined, CloseOutlined, FileTextOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import ReactMarkdown from 'react-markdown';

import { Worker, Viewer, SpecialZoomLevel } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { searchPlugin } from '@react-pdf-viewer/search';
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import '@react-pdf-viewer/search/lib/styles/index.css';
import '@react-pdf-viewer/page-navigation/lib/styles/index.css';

import { getClassDocuments } from '../../apis/fileAPIs/document';
import { getChatHistory, streamChat, saveChatMessage } from '../../apis/ragAPIs/rag';
import type { Citation, CreativityMode, DetailLevel, SourcesPayload } from '../../apis/ragAPIs/rag';
import api from '../../apis/axios';
import aiLogo from '../../assets/logo_pbl.png';

const { Text } = Typography;
const { TextArea } = Input;

const WORKER_URL = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
const STREAM_RENDER_INTERVAL_MS = 18;
const STREAM_MIN_CHARS_PER_TICK = 1;
const STREAM_MAX_CHARS_PER_TICK = 8;

interface ClassDoc { 
  documentId: string; 
  title: string; 
  createdAt: string; 
  isEmbedding: boolean;
}
interface ChatMsg {
  id: string; role: 'user' | 'ai'; content: string; timestamp: Date;
  citations?: { page: number; textSnippet: string; documentId?: string }[];
}

const toUiCitations = (citations?: Array<Partial<Citation> & { textSnippet?: string }>) =>
  (citations ?? [])
    .filter(c => typeof c.page === 'number')
    .map(c => ({
      page: c.page as number,
      textSnippet: c.snippet ?? c.textSnippet ?? '',
      documentId: c.document_id ?? '',
    }));

const stripInlineSources = (content: string) => {
  const citations: Citation[] = [];
  const cleaned = content.replace(/<sources>\s*([\s\S]*?)\s*<\/sources>/gi, (_match, rawJson) => {
    try {
      const parsed = JSON.parse(rawJson);
      const pages = Array.isArray(parsed) ? parsed : parsed?.pages;
      if (Array.isArray(pages)) {
        pages.forEach((item: Partial<Citation>) => {
          if (typeof item.page === 'number') {
            citations.push({
              page: item.page,
              document_id: item.document_id ?? '',
              snippet: item.snippet ?? '',
            });
          }
        });
      }
    } catch {
      // Ignore malformed inline sources; the text tag still should not render.
    }
    return '';
  }).trim();

  const openTagIndex = cleaned.toLowerCase().indexOf('<sources>');
  const visibleContent = openTagIndex >= 0 ? cleaned.slice(0, openTagIndex).trim() : cleaned;

  return { content: visibleContent, citations };
};

const LearningWorkspacePage: React.FC = () => {
  const { classId, documentId } = useParams<{ classId: string; documentId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { className?: string } | null;

  // PDF plugins
  const searchPluginInstance = searchPlugin();
  const defaultLayoutPluginInstance = defaultLayoutPlugin({ sidebarTabs: () => [] });
  const pageNavigationPluginInstance = pageNavigationPlugin();
  const { highlight } = searchPluginInstance;
  const { jumpToPage } = pageNavigationPluginInstance;

  // State
  const [docs, setDocs] = useState<ClassDoc[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(documentId ? [documentId] : []));
  const [activeDocId, setActiveDocId] = useState<string | null>(documentId ?? null);
  const [activeTitle, setActiveTitle] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [docPanelOpen, setDocPanelOpen] = useState(false);
  const [className, setClassName] = useState(state?.className || '');

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [creativityMode, setCreativityMode] = useState<CreativityMode>(() => {
    return (localStorage.getItem('rag_creativity_mode') as CreativityMode) || 'strict';
  });
  const [detailLevel, setDetailLevel] = useState<DetailLevel>(() => {
    return (localStorage.getItem('rag_detail_level') as DetailLevel) || 'normal';
  });
  const bottomRef = useRef<HTMLDivElement>(null);
  const blobRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load document list
  useEffect(() => {
    const idNum = parseInt(classId ?? '', 10);
    if (isNaN(idNum)) return;

    setLoadingDocs(true);
    getClassDocuments(idNum)
      .then(res => {
        const allDocs: ClassDoc[] = res.data.map(d => ({
          documentId: d.document_id,
          title: d.title,
          createdAt: d.created_at,
          isEmbedding: d.is_embedding
        }));

        setDocs(allDocs);

        // Filter only embedding-enabled docs for the RAG selection
        const embeddingDocs = allDocs.filter(d => d.isEmbedding);
        
        // Auto-select the documentId from URL param if it's embeddable, or first embeddable doc
        if (documentId && embeddingDocs.some(d => d.documentId === documentId)) {
          setSelectedIds(new Set([documentId]));
        } else if (embeddingDocs.length > 0 && selectedIds.size === 0) {
          setSelectedIds(new Set([embeddingDocs[0].documentId]));
        }

        if (!activeDocId && allDocs.length > 0) {
          setActiveDocId(documentId || allDocs[0].documentId);
        }

        // Load chat history
        const welcomeMsg = (len: number): ChatMsg => ({
          id: 'welcome', role: 'ai', timestamp: new Date(),
          content: len > 0 
            ? `Xin chào! Tôi là **AI Trợ Giảng** 🎓\n\nTìm thấy **${len} tài liệu** có thể hỗ trợ giải đáp trong lớp học. Hãy chọn tài liệu bạn muốn hỏi và gửi câu hỏi cho tôi nhé!`
            : `Xin chào! Hiện tại lớp học chưa có tài liệu nào được kích hoạt AI để hỗ trợ giải đáp.`,
        });

        getChatHistory(idNum)
          .then(hist => {
            if (hist.length > 0) {
              setMessages(hist.map(m => {
                const inline = stripInlineSources(m.content);
                return {
                  id: m.created_at,
                  role: m.role,
                  content: inline.content,
                  timestamp: new Date(m.created_at),
                  citations: [
                    ...toUiCitations(m.citations),
                    ...toUiCitations(inline.citations),
                  ],
                };
              }));
            } else {
              setMessages([welcomeMsg(embeddingDocs.length)]);
            }
          })
          .catch(() => setMessages([welcomeMsg(embeddingDocs.length)]));
      })
      .catch(() => message.error('Không thể tải danh sách tài liệu'))
      .finally(() => setLoadingDocs(false));
  }, [classId]);


  // Load PDF
  useEffect(() => {
    if (!activeDocId) { setPdfUrl(null); return; }
    const found = docs.find(d => d.documentId === activeDocId);
    if (found) setActiveTitle(found.title);
    setLoadingPdf(true);
    if (blobRef.current) { URL.revokeObjectURL(blobRef.current); blobRef.current = null; }
    api.get(`/files/documents/${activeDocId}/content`, { responseType: 'blob' })
      .then(res => {
        const url = URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] || 'application/pdf' }));
        blobRef.current = url;
        setPdfUrl(url);
      })
      .catch(() => message.error('Không thể tải file PDF'))
      .finally(() => setLoadingPdf(false));
  }, [activeDocId, docs]);

  // Execute pending citation jump after PDF finishes loading
  useEffect(() => {
    if (!pdfUrl || !pendingJumpRef.current) return;
    const { page, text } = pendingJumpRef.current;
    pendingJumpRef.current = null;
    // Delay to allow PDF viewer to fully render the new document
    const timer = setTimeout(() => {
      jumpToPage(page - 1);
      if (text) {
        setTimeout(() => highlight({ keyword: text, matchCase: false }), 300);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [pdfUrl]);

  useEffect(() => () => { if (blobRef.current) URL.revokeObjectURL(blobRef.current); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);
  useEffect(() => { localStorage.setItem('rag_creativity_mode', creativityMode); }, [creativityMode]);
  useEffect(() => { localStorage.setItem('rag_detail_level', detailLevel); }, [detailLevel]);

  const toggleDoc = useCallback((id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const handleSend = () => {
    if (!input.trim() || typing || selectedIds.size === 0) return;
    const question = input.trim();

    const userMsg: ChatMsg = { id: `u${Date.now()}`, role: 'user', content: question, timestamp: new Date() };
    setMessages(p => [...p, userMsg]);
    setInput('');
    setTyping(true);

    const aiMsgId = Date.now() + '-ai';
    let isFirstToken = true;
    let fullText = '';
    let visibleRawText = '';
    let queuedText = '';
    let streamDone = false;
    let savedFinalAnswer = false;
    let hasError = false;
    let renderTimer: ReturnType<typeof window.setInterval> | null = null;
    let pendingCitations: { page: number; textSnippet: string; documentId?: string }[] | undefined = undefined;
    let currentCitations: Citation[] = [];

    // Safety timeout: if all callbacks fail to fire (e.g. dynamic import error),
    // reset typing after 30s so user is not permanently blocked.
    const safetyTimer = setTimeout(() => {
      if (typing) {
        setTyping(false);
        if (isFirstToken) {
          setMessages(p => [...p, {
            id: aiMsgId, role: 'ai',
            content: '⚠️ Yêu cầu đã hết thời gian chờ. Vui lòng thử lại.',
            timestamp: new Date()
          }]);
        }
      }
    }, 30_000);

    const getVisibleState = (rawText: string) => {
      const sanitized = stripInlineSources(rawText);
      if (sanitized.citations.length > 0) {
        currentCitations = sanitized.citations;
      }
      return {
        content: sanitized.content,
        citations: [
          ...toUiCitations(currentCitations),
          ...(pendingCitations ?? []),
        ],
      };
    };

    const upsertAiMessage = (rawText: string) => {
      const visible = getVisibleState(rawText);
      if (isFirstToken) {
        isFirstToken = false;
        setTyping(false);
        setMessages(p => [...p, {
          id: aiMsgId,
          role: 'ai',
          content: visible.content,
          timestamp: new Date(),
          citations: visible.citations,
        }]);
      } else {
        setMessages(p => p.map(m => (
          m.id === aiMsgId ? { ...m, content: visible.content, citations: visible.citations } : m
        )));
      }
    };

    const saveFinalAnswer = () => {
      if (!streamDone || queuedText.length > 0 || savedFinalAnswer || hasError) return;
      savedFinalAnswer = true;
      clearTimeout(safetyTimer);
      if (renderTimer) {
        window.clearInterval(renderTimer);
        renderTimer = null;
      }

      const sanitized = stripInlineSources(fullText);
      const answer = sanitized.content;
      if (!answer.trim()) return; // Don't save empty answers
      const citations = currentCitations.length > 0 ? currentCitations : sanitized.citations;
      setMessages(p => p.map(m => (
        m.id === aiMsgId ? { ...m, content: answer, citations: toUiCitations(citations) } : m
      )));
      saveChatMessage(parseInt(classId ?? '0', 10), question, answer, citations).catch(e => {
        console.error('Failed to save chat message:', e);
      });
    };

    const startSmoothRender = () => {
      if (renderTimer) return;
      renderTimer = window.setInterval(() => {
        if (queuedText.length === 0) {
          saveFinalAnswer();
          return;
        }

        const charsPerTick = Math.min(
          STREAM_MAX_CHARS_PER_TICK,
          Math.max(STREAM_MIN_CHARS_PER_TICK, Math.ceil(queuedText.length / 60)),
        );
        visibleRawText += queuedText.slice(0, charsPerTick);
        queuedText = queuedText.slice(charsPerTick);
        upsertAiMessage(visibleRawText);
        saveFinalAnswer();
      }, STREAM_RENDER_INTERVAL_MS);
    };

    // Cancel any previous in-flight request
    abortRef.current?.abort();

    abortRef.current = streamChat(
      parseInt(classId ?? '0', 10),
      question,
      [...selectedIds],
      { creativityMode, detailLevel },
      // onToken
      (text) => {
        fullText += text;
        queuedText += text;
        startSmoothRender();
      },
      // onSources
      (src: SourcesPayload) => {
        // Only keep the most relevant citation (the first one)
        currentCitations = src.pages.slice(0, 1).map(pg => ({
          page: pg.page,
          document_id: pg.document_id,
          snippet: pg.snippet ?? ''
        }));
        const uiCitations = currentCitations.map(c => ({ page: c.page, textSnippet: c.snippet, documentId: c.document_id }));
        if (isFirstToken) {
          pendingCitations = uiCitations;
        } else {
          setMessages(p => p.map(m => m.id === aiMsgId ? { ...m, citations: uiCitations } : m));
        }
      },
      // onError
      (err) => {
        hasError = true;
        setTyping(false);
        clearTimeout(safetyTimer);
        if (renderTimer) {
          window.clearInterval(renderTimer);
          renderTimer = null;
        }
        message.error(err || 'Lỗi kết nối AI Service');
        // Nếu lỗi xảy ra trước khi có token đầu tiên, ta có thể hiện tin nhắn lỗi
        if (isFirstToken) {
          setMessages(p => [...p, { 
            id: aiMsgId, role: 'ai', 
            content: err || '⚠️ Không thể kết nối AI Service. Vui lòng thử lại.', 
            timestamp: new Date() 
          }]);
        }
      },
      // onDone
      () => {
        setTyping(false);
        clearTimeout(safetyTimer);
        streamDone = true;
        if (hasError) return; // Don't process further if error already handled
        if (queuedText.length === 0 && fullText.length > 0) {
          upsertAiMessage(fullText);
        }
        saveFinalAnswer();
      },
    );
  };

  const pendingJumpRef = useRef<{ page: number; text: string } | null>(null);

  const handleCitation = (page: number, text: string, citationDocId?: string) => {
    // If citation belongs to a different document, switch to it first
    if (citationDocId && citationDocId !== activeDocId) {
      // Store the pending jump so we can execute it after the PDF loads
      pendingJumpRef.current = { page, text };
      setActiveDocId(citationDocId);
      const docTitle = docs.find(d => d.documentId === citationDocId)?.title ?? '';
      message.info({ content: `Chuyển sang "${docTitle}" — trang ${page}`, duration: 2, icon: <FilePdfOutlined /> });
    } else {
      // Same document or no doc info — jump immediately
      jumpToPage(page - 1);
      if (text) {
        setTimeout(() => highlight({ keyword: text, matchCase: false }), 200);
      }
      message.info({ content: `Chuyển đến trang ${page}`, duration: 1.5, icon: <FilePdfOutlined /> });
    }
  };

  /* ─── STYLES ─────────────────────────────────────── */
  const surface0 = '#ffffff';
  const surface1 = '#f8fafc';
  const border = '#e2e8f0';
  const textPrimary = '#1e293b';
  const textSec = '#64748b';
  const accent = '#6366f1';   // indigo
  const aiDocs = docs.filter(d => d.isEmbedding);
  // --- Rendering Helpers ---

  const renderMessage = (msg: ChatMsg) => {
    const isAI = msg.role === 'ai';
    return (
      <div
        key={msg.id}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isAI ? 'flex-start' : 'flex-end',
          marginBottom: 16,
          animation: 'fadeInUp 0.4s ease-out forwards',
        }}
      >
        <div style={{ 
          display: 'flex', 
          flexDirection: 'row', 
          alignItems: 'flex-start', 
          gap: isAI ? 10 : 0,
          maxWidth: isAI ? '84%' : '74%',
        }}>
          {isAI && (
            <Avatar
              size={30}
              src={aiLogo}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                boxShadow: '0 6px 18px rgba(15, 23, 42, 0.08)',
                flexShrink: 0,
                marginTop: 1
              }}
            />
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: isAI ? 'flex-start' : 'flex-end' }}>
            <div
              style={{
                padding: isAI ? '11px 14px' : '10px 15px',
                borderRadius: isAI ? '5px 17px 17px 17px' : '17px 17px 5px 17px',
                background: isAI 
                  ? '#ffffff'
                  : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: isAI ? textPrimary : '#ffffff',
                border: isAI ? '1px solid rgba(226, 232, 240, 0.9)' : 'none',
                boxShadow: isAI
                  ? '0 8px 24px rgba(15, 23, 42, 0.045)'
                  : '0 10px 24px rgba(99, 102, 241, 0.18)',
                fontSize: '14px',
                lineHeight: '1.6',
                position: 'relative',
              }}
            >
              <div className={isAI ? "markdown-ai-content" : ""}>
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
              
              {isAI && msg.citations && msg.citations.length > 0 && (
                <div style={{ 
                  marginTop: 14, 
                  paddingTop: 12, 
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8 
                }}>
                  <div style={{ width: '100%', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BookOutlined style={{ fontSize: 12, color: accent }} />
                    <span style={{ fontSize: 11, color: textSec, fontWeight: 700, letterSpacing: '0.02em' }}>
                      Nguồn tham khảo
                    </span>
                  </div>
                    {msg.citations.map((c, i) => {
                      const citationDoc = c.documentId ? docs.find(d => d.documentId === c.documentId) : null;
                      const showDocName = citationDoc && c.documentId !== activeDocId;
                      const label = showDocName 
                        ? `${citationDoc.title.length > 20 ? citationDoc.title.slice(0, 20) + '…' : citationDoc.title} — Tr.${c.page}`
                        : `Trang ${c.page}`;
                      return (
                    <Tooltip key={i} title={c.textSnippet} overlayStyle={{ maxWidth: 320 }} mouseEnterDelay={0.3}>
                      <div
                        onClick={() => handleCitation(c.page, c.textSnippet, c.documentId)}
                        style={{
                          cursor: 'pointer',
                          borderRadius: 8,
                          background: showDocName ? '#fef3c7' : '#f8fafc',
                          border: `1px solid ${showDocName ? '#fcd34d' : '#e2e8f0'}`,
                          color: showDocName ? '#92400e' : '#475569',
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '4px 10px',
                          transition: 'all 0.16s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#eef2ff';
                          e.currentTarget.style.borderColor = '#c7d2fe';
                          e.currentTarget.style.color = accent;
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = showDocName ? '#fef3c7' : '#f8fafc';
                          e.currentTarget.style.borderColor = showDocName ? '#fcd34d' : '#e2e8f0';
                          e.currentTarget.style.color = showDocName ? '#92400e' : '#475569';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        {label}
                      </div>
                    </Tooltip>
                  ); })}
                </div>
              )}
            </div>
            
            <Text style={{ 
              fontSize: 10, 
              color: '#a8b3c4',
              marginTop: 5,
              fontWeight: 500,
              letterSpacing: '0.02em',
              marginRight: isAI ? 0 : 3,
              marginLeft: isAI ? 3 : 0 
            }}>
              {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: surface1, fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* ══ TOPBAR ══════════════════════════════════════════════════ */}
      <header style={{
        height: 56, flexShrink: 0, background: surface0, borderBottom: `1px solid ${border}`,
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        {/* Left: back + brand */}
        <Button
          type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}
          style={{ color: textSec, borderRadius: 8 }}
        />
        <div style={{ width: 1, height: 20, background: border }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img src={aiLogo} alt="AI" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <Text style={{ fontWeight: 700, fontSize: 14, color: textPrimary, display: 'block', lineHeight: 1.15 }}>AI Trợ Giảng</Text>
            <Text style={{ fontSize: 11, color: textSec }}>{className || `Lớp #${classId}`}</Text>
          </div>
        </div>

        {/* Center: selected context badge */}
        <div style={{ flex: 1 }} />
        {selectedIds.size > 0 && (
          <Tag
            icon={<CheckCircleFilled style={{ color: accent }} />}
            style={{ borderRadius: 20, borderColor: '#e0e7ff', background: '#eef2ff', color: accent, fontWeight: 600, fontSize: 12 }}
          >
            {selectedIds.size} tài liệu trong context
          </Tag>
        )}

        {/* Right: doc panel toggle */}
          <Button
            type={docPanelOpen ? 'primary' : 'default'}
            icon={<FileTextOutlined />}
            onClick={() => setDocPanelOpen(v => !v)}
            disabled={!loadingDocs && aiDocs.length === 0}
            style={{
              borderRadius: 10, fontWeight: 600, fontSize: 13,
              ...(docPanelOpen
                ? { background: `linear-gradient(135deg, ${accent}, #8b5cf6)`, border: 'none' }
                : { borderColor: border }),
            }}
          >
            Tài liệu
          </Button>
      </header>

      {/* ══ BODY ════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <Allotment>

          {/* ── LEFT PANE : CHAT ───────────────────────────────────── */}
          <Allotment.Pane minSize={300} preferredSize="38%">
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: surface0, borderRight: `1px solid ${border}` }}>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '22px 18px 8px' }}>
                {messages.map(msg => renderMessage(msg))}

                {/* Typing indicator */}
                {typing && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 18 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 6px 18px rgba(15, 23, 42, 0.08)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={aiLogo} alt="AI" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ background: surface0, border: `1px solid ${border}`, padding: '11px 15px', borderRadius: '5px 17px 17px 17px', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.045)' }}>
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                        {[0, 0.2, 0.4].map((d, i) => (
                          <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: accent, display: 'inline-block', animation: `blink 1.2s ${d}s ease-in-out infinite` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '10px 18px 14px', borderTop: `1px solid ${border}`, background: 'rgba(255,255,255,0.96)', boxShadow: '0 -10px 28px rgba(15,23,42,0.03)' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  marginBottom: 8,
                  padding: '6px 8px',
                  borderRadius: 14,
                  background: '#f8fafc',
                  border: `1px solid ${border}`,
                  flexWrap: 'wrap',
                }}>
                  <Tooltip title="Bật để AI được giải thích thêm kiến thức nền ngoài phần tài liệu đã chọn">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Switch
                        size="small"
                        checked={creativityMode === 'expanded'}
                        onChange={checked => setCreativityMode(checked ? 'expanded' : 'strict')}
                      />
                      <Text style={{ fontSize: 12, fontWeight: 600, color: creativityMode === 'expanded' ? accent : textSec }}>
                        {creativityMode === 'expanded' ? 'Mở rộng ngoài tài liệu' : 'Bám tài liệu'}
                      </Text>
                    </div>
                  </Tooltip>
                  <Segmented
                    size="small"
                    value={detailLevel}
                    onChange={value => setDetailLevel(value as DetailLevel)}
                    options={[
                      { label: 'Ngắn', value: 'brief' },
                      { label: 'Vừa', value: 'normal' },
                      { label: 'Chi tiết', value: 'detailed' },
                    ]}
                  />
                </div>
                {selectedIds.size === 0 && !loadingDocs && aiDocs.length > 0 && (
                  <div style={{ marginBottom: 10, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10 }}>
                    <Text style={{ color: '#92400e', fontSize: 12 }}>⚠️ Bấm nút <strong>Tài liệu</strong> góc trên phải để chọn ít nhất 1 tài liệu cho AI</Text>
                  </div>
                )}
                {!loadingDocs && aiDocs.length === 0 && (
                  <div style={{ marginBottom: 10, padding: '8px 12px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10 }}>
                    <Text style={{ color: '#9f1239', fontSize: 12 }}>📭 Lớp học chưa có tài liệu nào. Giảng viên cần đăng tài liệu trước.</Text>
                  </div>
                )}
                <div style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'flex-end',
                  background: '#ffffff',
                  border: `1.5px solid ${input ? '#818cf8' : border}`,
                  borderRadius: 18,
                  padding: '8px 8px 8px 15px',
                  transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
                  boxShadow: input ? '0 0 0 4px rgba(99,102,241,0.08)' : '0 8px 24px rgba(15,23,42,0.04)',
                }}>
                  <TextArea
                    placeholder={aiDocs.length === 0 ? 'Chưa có tài liệu AI trong lớp...' : selectedIds.size === 0 ? 'Chọn ít nhất 1 tài liệu trước...' : 'Hỏi về nội dung tài liệu...'}
                    autoSize={{ minRows: 1, maxRows: 5 }}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onPressEnter={e => { if (!e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    disabled={selectedIds.size === 0 || aiDocs.length === 0}
                    bordered={false}
                    style={{ background: 'transparent', color: textPrimary, fontSize: 14, flex: 1, padding: '4px 0', resize: 'none', lineHeight: 1.55 }}
                  />
                  <Button
                    type="primary" icon={<SendOutlined />} onClick={handleSend}
                    disabled={!input.trim() || typing || selectedIds.size === 0 || aiDocs.length === 0}
                    style={{
                      height: 36, width: 36, borderRadius: 12, flexShrink: 0,
                      background: (input.trim() && selectedIds.size > 0) ? `linear-gradient(135deg, ${accent}, #8b5cf6)` : '#e2e8f0',
                      border: 'none', padding: 0,
                      boxShadow: (input.trim() && selectedIds.size > 0) ? '0 8px 18px rgba(99,102,241,0.24)' : 'none',
                    }}
                  />
                </div>
                <Text style={{ display: 'block', textAlign: 'center', fontSize: 11, color: '#cbd5e1', marginTop: 7 }}>
                  Nhấn Enter để gửi · Shift+Enter để xuống dòng
                </Text>
              </div>
            </div>
          </Allotment.Pane>

          {/* ── RIGHT PANE : PDF ───────────────────────────────────── */}
          <Allotment.Pane minSize={400}>
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>
              {/* PDF Sub-header */}
              <div style={{ padding: '10px 16px', background: surface0, borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 10, minHeight: 48, flexShrink: 0 }}>
                <FilePdfOutlined style={{ color: '#ef4444', fontSize: 18 }} />
                <Text style={{ fontWeight: 600, fontSize: 13, color: textPrimary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeTitle || (activeDocId ? 'Đang tải...' : 'Chưa chọn tài liệu')}
                </Text>
                {activeDocId && (
                  <Button size="small" type="text" icon={<CloseOutlined />} onClick={() => { setPdfUrl(null); setActiveDocId(null); setActiveTitle(''); }} style={{ color: textSec }} />
                )}
              </div>

              {/* PDF View */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                {!activeDocId ? (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                    <div style={{ width: 72, height: 72, borderRadius: 20, background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <BookOutlined style={{ fontSize: 34, color: accent }} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <Text style={{ display: 'block', fontWeight: 600, color: textPrimary, fontSize: 15, marginBottom: 6 }}>Chưa có tài liệu nào được chọn</Text>
                      <Text style={{ color: textSec, fontSize: 13 }}>Bấm nút <strong>Tài liệu</strong> góc trên phải, sau đó click vào tài liệu để xem tại đây</Text>
                    </div>
                    <Button type="primary" icon={<FileTextOutlined />} onClick={() => setDocPanelOpen(true)} style={{ background: `linear-gradient(135deg, ${accent}, #8b5cf6)`, border: 'none', borderRadius: 10 }}>
                      Chọn tài liệu
                    </Button>
                  </div>
                ) : loadingPdf ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
                    <Spin size="large" />
                    <Text style={{ color: textSec }}>Đang tải PDF...</Text>
                  </div>
                ) : pdfUrl ? (
                  <Worker workerUrl={WORKER_URL}>
                    <Viewer fileUrl={pdfUrl} plugins={[defaultLayoutPluginInstance, searchPluginInstance, pageNavigationPluginInstance]} defaultScale={SpecialZoomLevel.PageFit} />
                  </Worker>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#ef4444' }}>Không thể tải PDF. Thử lại sau.</Text>
                  </div>
                )}
              </div>
            </div>
          </Allotment.Pane>
        </Allotment>

        {/* ══ DOCUMENT PANEL (slide-in from right) ════════════════ */}
        <>
          {/* Backdrop */}
          {docPanelOpen && (
            <div onClick={() => setDocPanelOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.25)', zIndex: 40, backdropFilter: 'blur(2px)' }} />
          )}
          {/* Panel */}
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: 340,
            background: surface0, borderLeft: `1px solid ${border}`,
            boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
            zIndex: 50, display: 'flex', flexDirection: 'column',
            transform: docPanelOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            {/* Panel header */}
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <Text style={{ fontWeight: 700, fontSize: 15, color: textPrimary, display: 'block' }}>Tài liệu lớp học</Text>
                <Text style={{ fontSize: 12, color: textSec }}>
                  {loadingDocs ? 'Đang tải...' : `${aiDocs.length} tài liệu AI · ${selectedIds.size} đã chọn`}
                </Text>
              </div>
              <Button type="text" icon={<CloseOutlined />} onClick={() => setDocPanelOpen(false)} style={{ color: textSec }} />
            </div>

            {/* Actions */}
            <div style={{ padding: '12px 20px', borderBottom: `1px solid ${border}`, display: 'flex', gap: 8 }}>
              <Button size="small" style={{ borderRadius: 8, flex: 1 }} onClick={() => setSelectedIds(new Set(aiDocs.map(d => d.documentId)))}>
                Chọn tất cả
              </Button>
              <Button size="small" style={{ borderRadius: 8, flex: 1 }} onClick={() => setSelectedIds(new Set())}>
                Bỏ chọn
              </Button>
            </div>

            {/* Document list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px' }}>
              {loadingDocs ? (
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 32 }}><Spin /></div>
              ) : aiDocs.length === 0 ? (
                <div style={{ textAlign: 'center', paddingTop: 40, padding: '0 20px' }}>
                  <RobotOutlined style={{ fontSize: 32, color: '#cbd5e1', marginBottom: 12 }} />
                  <Text style={{ display: 'block', color: textSec, fontSize: 13 }}>
                    Không có tài liệu nào được kích hoạt AI (is_embedding) trong lớp học này.
                  </Text>
                </div>
              ) : (
                aiDocs.map(doc => {
                  const isSelected = selectedIds.has(doc.documentId);
                  const isActive = activeDocId === doc.documentId;
                  return (
                    <div key={doc.documentId} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 12, marginBottom: 4,
                      cursor: 'pointer', transition: 'all 0.15s',
                      background: isActive ? '#eef2ff' : isSelected ? '#f8fafc' : 'transparent',
                      border: `1px solid ${isActive ? '#c7d2fe' : isSelected ? '#e2e8f0' : 'transparent'}`,
                    }}>
                      <Checkbox checked={isSelected} onChange={() => toggleDoc(doc.documentId)} onClick={e => e.stopPropagation()} />
                      <div style={{ flex: 1, minWidth: 0 }} onClick={() => { setActiveDocId(doc.documentId); setDocPanelOpen(false); }}>
                        <Text style={{ display: 'block', fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? accent : textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <FilePdfOutlined style={{ color: '#ef4444', marginRight: 6 }} />
                          {doc.title}
                        </Text>
                        <Text style={{ fontSize: 11, color: textSec }}>
                          {new Date(doc.createdAt).toLocaleDateString('vi-VN')}
                        </Text>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer CTA */}
            {selectedIds.size > 0 && (
              <div style={{ padding: '14px 20px', borderTop: `1px solid ${border}`, flexShrink: 0 }}>
                <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircleFilled style={{ color: accent, fontSize: 16 }} />
                  <div>
                    <Text style={{ fontWeight: 600, fontSize: 13, color: accent, display: 'block' }}>
                      {selectedIds.size} tài liệu trong context AI
                    </Text>
                    <Text style={{ fontSize: 11, color: '#818cf8' }}>AI sẽ tìm kiếm trong các tài liệu này</Text>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      </div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 0.3; transform: scale(0.7); } 50% { opacity: 1; transform: scale(1); } }
        html, body { overflow: hidden; }
        .ai-md p { margin: 0 0 6px; }
        .ai-md p:last-child { margin-bottom: 0; }
        .ai-md blockquote { border-left: 3px solid #6366f1; margin: 8px 0; padding: 6px 12px; background: #eef2ff; border-radius: 0 8px 8px 0; color: #4338ca; font-style: italic; font-size: 13px; }
        .ai-md code { background: #f1f5f9; color: #6366f1; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
        .ai-md strong { color: #1e293b; }
        .ai-md ul, .ai-md ol { padding-left: 20px; margin: 6px 0; }
        .rpv-core__viewer { height: 100% !important; }
        /* hide all native scrollbars on this page */
        ::-webkit-scrollbar { width: 0px; height: 0px; }
        * { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>
    </div>
  );
};

// --- Styles & Animations ---
const globalStyles = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes blink {
    0%, 100% { opacity: 0.3; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1.1); }
  }

  .markdown-ai-content p { margin-bottom: 12px; }
  .markdown-ai-content p:last-child { margin-bottom: 0; }
  .markdown-ai-content h1, .markdown-ai-content h2, .markdown-ai-content h3 { 
    margin: 16px 0 8px; color: #1e293b; font-weight: 700; 
  }
  .markdown-ai-content ul, .markdown-ai-content ol { padding-left: 20px; margin-bottom: 12px; }
  .markdown-ai-content code { 
    background: #f1f5f9; padding: 2px 6px; borderRadius: 4px; font-family: monospace; font-size: 0.9em; 
  }
  .markdown-ai-content pre {
    background: #1e293b; color: #f8fafc; padding: 14px; borderRadius: 12px; overflow-x: auto; margin: 12px 0;
  }
  .markdown-ai-content pre code { background: transparent; padding: 0; color: inherit; }
  
  .citation-tag:hover {
    background: #eef2ff !important;
    border-color: #c7d2fe !important;
    color: #6366f1 !important;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = globalStyles;
  document.head.appendChild(styleSheet);
}

export default LearningWorkspacePage;
