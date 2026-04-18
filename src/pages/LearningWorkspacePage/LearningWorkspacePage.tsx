import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Button, Input, Typography, Space, Spin, message,
  Tooltip, Avatar, Tag, Checkbox, Badge, Divider,
} from 'antd';
import {
  ArrowLeftOutlined, SendOutlined, RobotOutlined, UserOutlined,
  FilePdfOutlined, BookOutlined, CloseOutlined, FileTextOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import ReactMarkdown from 'react-markdown';

import { Worker, Viewer, SpecialZoomLevel } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { searchPlugin } from '@react-pdf-viewer/search';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import '@react-pdf-viewer/search/lib/styles/index.css';

import { getClassPosts } from '../../apis/classesAPIs/classPosts';
import { getStudentClassDetails } from '../../apis/classesAPIs/studentClass';
import { getChatHistory, streamChat } from '../../apis/ragAPIs/rag';
import type { SourcesPayload } from '../../apis/ragAPIs/rag';
import api from '../../apis/axios';

const { Text } = Typography;
const { TextArea } = Input;

const WORKER_URL = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

interface ClassDoc { documentId: string; title: string; postId: number; createdAt: string; }
interface ChatMsg {
  id: string; role: 'user' | 'ai'; content: string; timestamp: Date;
  citations?: { page: number; textSnippet: string }[];
}

const LearningWorkspacePage: React.FC = () => {
  const { classId, documentId } = useParams<{ classId: string; documentId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { className?: string } | null;

  // PDF plugins
  const searchPluginInstance = searchPlugin();
  const defaultLayoutPluginInstance = defaultLayoutPlugin({ sidebarTabs: () => [] });
  const { highlight } = searchPluginInstance;

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
  const bottomRef = useRef<HTMLDivElement>(null);
  const blobRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch class name (try student API first, teacher API as fallback)
  useEffect(() => {
    if (className) return; // have it from location.state
    const id = parseInt(classId ?? '', 10);
    if (isNaN(id)) return;
    getStudentClassDetails(id)
      .then(res => setClassName(res.data.class.className))
      .catch(() => {
        // Fallback for teacher role — use generic class endpoint
        api.get(`/teacher/classes/${id}`).then(r => setClassName(r.data?.data?.class?.subject || '')).catch(() => {});
      });
  }, [classId, className]);

  // Load document list
  useEffect(() => {
    const id = parseInt(classId ?? '', 10);
    if (isNaN(id)) return;
    setLoadingDocs(true);
    getClassPosts(id, { includeComments: false, limit: 100, offset: 0 })
      .then(res => {
        const map = new Map<string, ClassDoc>();
        res.data.items.forEach(post => post.attachments.forEach(att => {
          if (!map.has(att.documentId)) map.set(att.documentId, {
            documentId: att.documentId,
            title: att.title || `Tài liệu ${att.documentId.slice(0, 8)}`,
            postId: post.id,
            createdAt: post.createdAt,
          });
        }));
        const list = [...map.values()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setDocs(list);

        // Auto-select the documentId from URL param (or first doc if none specified)
        if (documentId && list.some(d => d.documentId === documentId)) {
          setSelectedIds(new Set([documentId]));
        } else if (list.length > 0 && selectedIds.size === 0) {
          setSelectedIds(new Set([list[0].documentId]));
          if (!activeDocId) setActiveDocId(list[0].documentId);
        }

        // Load chat history
        const idNum = parseInt(classId ?? '', 10);
        if (!isNaN(idNum)) {
          const welcomeMsg = (len: number): ChatMsg => ({
            id: 'welcome', role: 'ai', timestamp: new Date(),
            content: `Xin chào! Tôi là **AI Trợ Giảng** 🎓\n\nTìm thấy **${len} tài liệu** trong lớp học. Hãy bấm nút **Tài liệu** góc trên phải để chọn tài liệu bạn muốn hỏi, sau đó gửi câu hỏi cho tôi nhé!`,
          });

          getChatHistory(idNum)
            .then(hist => {
              if (hist.length > 0) {
                setMessages(hist.map(m => ({
                  id: m.created_at,
                  role: m.role,
                  content: m.content,
                  timestamp: new Date(m.created_at),
                })));
              } else {
                setMessages([welcomeMsg(list.length)]);
              }
            })
            .catch(() => setMessages([welcomeMsg(list.length)]));
        }
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

  useEffect(() => () => { if (blobRef.current) URL.revokeObjectURL(blobRef.current); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

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

    const aiMsgId = `a${Date.now()}`;
    setMessages(p => [...p, { id: aiMsgId, role: 'ai', content: '', timestamp: new Date() }]);

    let fullText = '';

    // Cancel any previous in-flight request
    abortRef.current?.abort();

    abortRef.current = streamChat(
      parseInt(classId ?? '0', 10),
      question,
      [...selectedIds],
      // onToken
      (text) => {
        fullText += text;
        setMessages(p => p.map(m => m.id === aiMsgId ? { ...m, content: fullText } : m));
      },
      // onSources
      (src: SourcesPayload) => {
        const citations = src.pages.map(pg => ({ page: pg.page, textSnippet: pg.snippet ?? '' }));
        setMessages(p => p.map(m => m.id === aiMsgId ? { ...m, citations } : m));
      },
      // onError
      (err) => {
        message.error(err || 'Lỗi kết nối AI Service');
        setMessages(p => p.map(m =>
          m.id === aiMsgId ? { ...m, content: fullText || '⚠️ Không thể kết nối AI Service. Vui lòng thử lại.' } : m
        ));
      },
      // onDone
      () => setTyping(false),
    );
  };

  const handleCitation = (page: number, text: string) => {
    if (text) highlight({ keyword: text, matchCase: false });
    message.info({ content: `Chuyển đến trang ${page}`, duration: 1.5, icon: <FilePdfOutlined /> });
  };

  /* ─── STYLES ─────────────────────────────────────── */
  const surface0 = '#ffffff';
  const surface1 = '#f8fafc';
  const border = '#e2e8f0';
  const textPrimary = '#1e293b';
  const textSec = '#64748b';
  const accent = '#6366f1';   // indigo

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
            background: `linear-gradient(135deg, ${accent} 0%, #8b5cf6 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <RobotOutlined style={{ color: '#fff', fontSize: 15 }} />
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
        <Badge count={!loadingDocs ? docs.length : 0} size="small" color={accent} offset={[-4, 4]}>
          <Button
            type={docPanelOpen ? 'primary' : 'default'}
            icon={<FileTextOutlined />}
            onClick={() => setDocPanelOpen(v => !v)}
            disabled={!loadingDocs && docs.length === 0}
            style={{
              borderRadius: 10, fontWeight: 600, fontSize: 13,
              ...(docPanelOpen
                ? { background: `linear-gradient(135deg, ${accent}, #8b5cf6)`, border: 'none' }
                : { borderColor: border }),
            }}
          >
            Tài liệu
          </Button>
        </Badge>
      </header>

      {/* ══ BODY ════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <Allotment>

          {/* ── LEFT PANE : CHAT ───────────────────────────────────── */}
          <Allotment.Pane minSize={300} preferredSize="38%">
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: surface0, borderRight: `1px solid ${border}` }}>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 8px' }}>
                {messages.map(msg => (
                  <div key={msg.id} style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                      {/* Avatar */}
                      {msg.role === 'ai' && (
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg, ${accent}, #8b5cf6)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <RobotOutlined style={{ color: '#fff', fontSize: 14 }} />
                        </div>
                      )}

                      {/* Bubble */}
                      <div style={{
                        maxWidth: '82%',
                        background: msg.role === 'user' ? `linear-gradient(135deg, ${accent}, #8b5cf6)` : surface1,
                        color: msg.role === 'user' ? '#fff' : textPrimary,
                        padding: '12px 16px', borderRadius: msg.role === 'user' ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                        fontSize: 14, lineHeight: 1.65,
                        border: msg.role === 'ai' ? `1px solid ${border}` : 'none',
                      }}>
                        {msg.role === 'ai'
                          ? <div className="ai-md"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                          : <span>{msg.content}</span>}

                        {/* Citations */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${msg.role === 'user' ? 'rgba(255,255,255,0.2)' : border}` }}>
                            <Text style={{ fontSize: 11, fontWeight: 700, color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : textSec, display: 'block', marginBottom: 6 }}>📎 NGUỒN</Text>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {msg.citations.map((c, i) => (
                                <button key={i} onClick={() => handleCitation(c.page, c.textSnippet)} style={{
                                  background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
                                  borderRadius: 6, padding: '3px 10px', cursor: 'pointer',
                                  color: accent, fontSize: 12, fontWeight: 600,
                                }}>
                                  Trang {c.page}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <Text style={{ display: 'block', fontSize: 10, color: '#cbd5e1', marginTop: 4, textAlign: msg.role === 'user' ? 'right' : 'left', paddingLeft: msg.role === 'ai' ? 42 : 0 }}>
                      {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </div>
                ))}

                {/* Typing indicator */}
                {typing && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 24 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg, ${accent}, #8b5cf6)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <RobotOutlined style={{ color: '#fff', fontSize: 14 }} />
                    </div>
                    <div style={{ background: surface1, border: `1px solid ${border}`, padding: '14px 18px', borderRadius: '4px 18px 18px 18px' }}>
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
              <div style={{ padding: '12px 20px 16px', borderTop: `1px solid ${border}`, background: surface0 }}>
                {selectedIds.size === 0 && !loadingDocs && docs.length > 0 && (
                  <div style={{ marginBottom: 10, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10 }}>
                    <Text style={{ color: '#92400e', fontSize: 12 }}>⚠️ Bấm nút <strong>Tài liệu</strong> góc trên phải để chọn ít nhất 1 tài liệu cho AI</Text>
                  </div>
                )}
                {!loadingDocs && docs.length === 0 && (
                  <div style={{ marginBottom: 10, padding: '8px 12px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10 }}>
                    <Text style={{ color: '#9f1239', fontSize: 12 }}>📭 Lớp học chưa có tài liệu nào. Giảng viên cần đăng tài liệu trước.</Text>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: surface1, border: `1.5px solid ${input ? accent : border}`, borderRadius: 16, padding: '8px 8px 8px 16px', transition: 'border-color 0.2s' }}>
                  <TextArea
                    placeholder={docs.length === 0 ? 'Chưa có tài liệu trong lớp...' : selectedIds.size === 0 ? 'Chọn ít nhất 1 tài liệu trước...' : 'Hỏi về nội dung tài liệu...'}
                    autoSize={{ minRows: 1, maxRows: 5 }}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onPressEnter={e => { if (!e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    disabled={selectedIds.size === 0 || docs.length === 0}
                    bordered={false}
                    style={{ background: 'transparent', color: textPrimary, fontSize: 14, flex: 1, padding: 0, resize: 'none' }}
                  />
                  <Button
                    type="primary" icon={<SendOutlined />} onClick={handleSend}
                    disabled={!input.trim() || typing || selectedIds.size === 0 || docs.length === 0}
                    style={{
                      height: 38, width: 38, borderRadius: 10, flexShrink: 0,
                      background: (input.trim() && selectedIds.size > 0) ? `linear-gradient(135deg, ${accent}, #8b5cf6)` : '#e2e8f0',
                      border: 'none', padding: 0,
                    }}
                  />
                </div>
                <Text style={{ display: 'block', textAlign: 'center', fontSize: 11, color: '#cbd5e1', marginTop: 8 }}>
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
                    <Viewer fileUrl={pdfUrl} plugins={[defaultLayoutPluginInstance, searchPluginInstance]} defaultScale={SpecialZoomLevel.PageFit} />
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
                  {loadingDocs ? 'Đang tải...' : `${docs.length} tài liệu · ${selectedIds.size} đã chọn`}
                </Text>
              </div>
              <Button type="text" icon={<CloseOutlined />} onClick={() => setDocPanelOpen(false)} style={{ color: textSec }} />
            </div>

            {/* Actions */}
            <div style={{ padding: '12px 20px', borderBottom: `1px solid ${border}`, display: 'flex', gap: 8 }}>
              <Button size="small" style={{ borderRadius: 8, flex: 1 }} onClick={() => setSelectedIds(new Set(docs.map(d => d.documentId)))}>
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
              ) : docs.length === 0 ? (
                <div style={{ textAlign: 'center', paddingTop: 40 }}>
                  <Text style={{ color: textSec }}>Không có tài liệu nào trong lớp</Text>
                </div>
              ) : (
                docs.map(doc => {
                  const isActive = activeDocId === doc.documentId;
                  const isSelected = selectedIds.has(doc.documentId);
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

export default LearningWorkspacePage;
