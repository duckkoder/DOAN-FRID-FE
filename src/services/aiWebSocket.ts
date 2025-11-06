/**
 * AI-Service WebSocket Client
 * Connect trực tiếp tới AI-Service để stream frames
 */

export interface DetectionInfo {
  bbox: number[]; // [x1, y1, x2, y2]
  track_id: number | null;
  student_id: string | null;
  student_name: string | null;
  confidence: number | null;
  is_validated: boolean;
  status?: 'detecting' | 'unknown' | 'recognized' | 'validated'; // ✅ Recognition status
  
  // Anti-spoofing fields
  is_live?: boolean | null; // True if live face, False if print/replay
  spoofing_type?: string | null; // 'live', 'print', 'replay'
  spoofing_confidence?: number | null; // Confidence of anti-spoofing prediction (0.0-1.0)
}

export interface ValidatedStudent {
  student_code: string;
  student_name: string;
  track_id: number;
  avg_confidence: number;
  frame_count: number;
  recognition_count: number;
  validation_passed_at: string;
}

export interface SessionStats {
  total_frames_processed: number;
  total_faces_detected: number;
  validated_students: number;
}

export type WSMessageType =
  | 'connection_established'
  | 'frame_processed'
  | 'student_validated'
  | 'session_status'
  | 'anti_spoofing_alert'
  | 'error';

export interface WSMessage {
  type: WSMessageType;
  detections?: DetectionInfo[];
  total_faces?: number;
  timestamp?: string;
  student?: ValidatedStudent;
  stats?: SessionStats;
  message?: string;
  session_id?: string;
  status?: string;
}

export interface AISessionInfo {
  session_id: number; // Backend session ID
  ai_session_id: string; // AI-Service session ID
  ai_ws_url: string; // WebSocket URL
  ai_ws_token: string; // JWT token
  expires_at: string;
  status: string;
}

export class AIWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isManualClose = false;
  
  // Callbacks
  private onConnectedCallback?: () => void;
  private onDisconnectedCallback?: (code: number, reason: string) => void;
  private onFrameProcessedCallback?: (detections: DetectionInfo[], totalFaces: number) => void;
  private onStudentValidatedCallback?: (student: ValidatedStudent) => void;
  private onSessionStatusCallback?: (status: string, stats: SessionStats) => void;
  private onErrorCallback?: (error: string) => void;

  constructor() {}

  /**
   * Connect tới AI-Service WebSocket
   */
  connect(wsUrl: string, token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.isManualClose = false;
        
        // Add token as query parameter
        const url = `${wsUrl}?token=${token}`;
        
        console.log('[AIWebSocket] Connecting to:', wsUrl);
        
        this.ws = new WebSocket(url);
        
        this.ws.onopen = () => {
          console.log('[AIWebSocket] Connected successfully');
          this.reconnectAttempts = 0;
          this.onConnectedCallback?.();
          resolve();
        };
        
        this.ws.onclose = (event) => {
          console.log('[AIWebSocket] Connection closed:', event.code, event.reason);
          
          this.onDisconnectedCallback?.(event.code, event.reason);
          
          // Handle different close codes
          if (event.code === 1008) {
            // Unauthorized/Session invalid
            console.error('[AIWebSocket] Unauthorized or session invalid');
            this.onErrorCallback?.('Session không hợp lệ hoặc đã hết hạn');
            return;
          }
          
          // Auto-reconnect (if not manual close)
          if (!this.isManualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
            const delay = 1000 * Math.pow(2, this.reconnectAttempts);
            console.log(`[AIWebSocket] Reconnecting in ${delay}ms...`);
            
            this.reconnectTimeout = setTimeout(() => {
              this.reconnectAttempts++;
              this.connect(wsUrl, token);
            }, delay);
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('[AIWebSocket] Error:', error);
          this.onErrorCallback?.('WebSocket connection error');
          reject(error);
        };
        
        this.ws.onmessage = (event) => {
          try {
            const data: WSMessage = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('[AIWebSocket] Failed to parse message:', error);
          }
        };
        
      } catch (error) {
        console.error('[AIWebSocket] Connection failed:', error);
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: WSMessage) {
    console.log('[AIWebSocket] Message received:', data.type);
    
    switch (data.type) {
      case 'connection_established':
        console.log('[AIWebSocket] Connection established:', data.message);
        break;
        
      case 'frame_processed':
        console.log('[AIWebSocket] Frame processed data:', data); // Debug
        console.log('[AIWebSocket] Detections:', data.detections); // Debug detections detail
        if (data.detections && data.total_faces !== undefined) {
          this.onFrameProcessedCallback?.(data.detections, data.total_faces);
        } else {
          console.warn('[AIWebSocket] Frame processed but missing detections or total_faces');
        }
        break;
        
      case 'student_validated':
        if (data.student) {
          console.log('[AIWebSocket] Student validated:', data.student.student_name);
          this.onStudentValidatedCallback?.(data.student);
        }
        break;
        
      case 'session_status':
        if (data.status && data.stats) {
          this.onSessionStatusCallback?.(data.status, data.stats);
        }
        break;
        
      case 'anti_spoofing_alert':
        // Log anti-spoofing alert (optional: có thể thêm callback nếu cần UI notification)
        console.warn('[AIWebSocket] Anti-spoofing alert:', {
          message: data.message,
          suspicious_faces: (data as any).suspicious_faces,
          total_suspicious: (data as any).total_suspicious,
          total_live: (data as any).total_live
        });
        break;
        
      case 'error':
        if (data.message) {
          console.error('[AIWebSocket] Server error:', data.message);
          this.onErrorCallback?.(data.message);
        }
        break;
        
      default:
        console.warn('[AIWebSocket] Unknown message type:', data.type);
    }
  }

  /**
   * Send frame to AI-Service
   */
  sendFrame(frameBlob: Blob) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(frameBlob);
    } else {
      console.warn('[AIWebSocket] Cannot send frame, connection not open');
    }
  }

  /**
   * Close WebSocket connection
   */
  disconnect() {
    console.log('[AIWebSocket] Disconnecting...');
    this.isManualClose = true;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Event handlers
  onConnected(callback: () => void) {
    this.onConnectedCallback = callback;
  }

  onDisconnected(callback: (code: number, reason: string) => void) {
    this.onDisconnectedCallback = callback;
  }

  onFrameProcessed(callback: (detections: DetectionInfo[], totalFaces: number) => void) {
    this.onFrameProcessedCallback = callback;
  }

  onStudentValidated(callback: (student: ValidatedStudent) => void) {
    this.onStudentValidatedCallback = callback;
  }

  onSessionStatus(callback: (status: string, stats: SessionStats) => void) {
    this.onSessionStatusCallback = callback;
  }

  onError(callback: (error: string) => void) {
    this.onErrorCallback = callback;
  }
}
