/**
 * RAG Chat & Ingestion API
 * All calls go to Backend (/api/v1/rag/*) which proxies to AI Service.
 */
import api from '../axios';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  created_at: string;
  citations?: Citation[];
}

export interface Citation {
  page: number;
  document_id: string;
  snippet: string;
}

export interface SourcesPayload {
  pages: Citation[];
}

export type CreativityMode = 'strict' | 'expanded';
export type DetailLevel = 'brief' | 'normal' | 'detailed';

/** Parsed SSE event */
export type SSEEvent =
  | { type: 'token'; text: string }
  | { type: 'sources'; payload: SourcesPayload }
  | { type: 'error'; message: string }
  | { type: 'done' };

// ─── History APIs ─────────────────────────────────────────────────────────────

/**
 * Lấy lịch sử chat của user trong lớp học (từ Backend DB)
 */
export async function getChatHistory(classId: number): Promise<ChatMessage[]> {
  const res = await api.get('/rag/chat/history', { params: { class_id: classId } });
  // Backend returns Array directly now
  return Array.isArray(res.data) ? res.data : [];
}

/**
 * Lưu cặp câu hỏi - câu trả lời vào Backend DB
 */
export async function saveChatMessage(
  classId: number, 
  question: string, 
  answer: string,
  citations?: Citation[]
): Promise<void> {
  await api.post('/rag/chat/save', {
    class_id: classId,
    question: question,
    answer: answer,
    citations: citations
  });
}

/**
 * Xoá toàn bộ lịch sử chat của user trong lớp học
 */
export async function clearChatHistory(classId: number): Promise<void> {
  await api.delete('/rag/chat/history', { params: { class_id: classId } });
}

// ─── Streaming Chat ────────────────────────────────────────────────────────────

/**
 * Stream câu trả lời từ AI qua SSE.
 *
 * @param classId      - ID lớp học (integer)
 * @param question     - Câu hỏi gốc của người dùng
 * @param documentIds  - Danh sách UUID tài liệu được chọn
 * @param onToken      - Callback nhận từng token text từ Gemini
 * @param onSources    - Callback nhận payload trích dẫn cuối stream
 * @param onError      - Callback khi có lỗi
 * @param onDone       - Callback khi stream kết thúc
 * @returns            - AbortController để cancel nếu cần
 */
export function streamChat(
  classId: number,
  question: string,
  documentIds: string[],
  options: {
    creativityMode?: CreativityMode;
    detailLevel?: DetailLevel;
  },
  onToken: (text: string) => void,
  onSources: (payload: SourcesPayload) => void,
  onError: (msg: string) => void,
  onDone: () => void,
): AbortController {
  const controller = new AbortController();

  const baseUrl = (import.meta.env.VITE_API_BASE_URL as string).replace(/\/$/, '');

  // We need the Bearer token. Use the synchronous getter from axios.ts
  import('../../apis/axios').then(({ getAccessToken }) => {
    const token = getAccessToken();

    fetch(`${baseUrl}/rag/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        class_id: classId,
        question,
        document_ids: documentIds,
        creativity_mode: options.creativityMode ?? 'strict',
        detail_level: options.detailLevel ?? 'normal',
      }),
      signal: controller.signal,
    })
      .then(async (resp) => {
        if (!resp.ok || !resp.body) {
          onError(`HTTP ${resp.status}: ${resp.statusText}`);
          onDone();
          return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();

            if (payload === '[DONE]') {
              onDone();
              return;
            }

            if (payload.startsWith('[ERROR]')) {
              onError(payload.slice(7).trim());
              onDone();
              return;
            }

            if (payload.startsWith('[SOURCES]')) {
              try {
                const src: SourcesPayload = JSON.parse(payload.slice(9).trim());
                onSources(src);
              } catch {
                // malformed sources – ignore
              }
              continue;
            }

            // Regular text token – unescape escaped newlines
            const text = payload.replace(/\\n/g, '\n');
            onToken(text);
          }
        }

        onDone();
      })
      .catch((err: unknown) => {
        if ((err as { name?: string }).name === 'AbortError') return; // cancelled
        onError(String(err));
      });
  }).catch((importErr: unknown) => {
    onError(`Lỗi khởi tạo kết nối: ${String(importErr)}`);
    onDone();
  });

  return controller;
}
