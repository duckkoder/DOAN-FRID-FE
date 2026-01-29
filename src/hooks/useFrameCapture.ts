/**
 * useFrameCapture Hook
 * 
 * Features:
 * 1. Dynamic Frame Rate - tự động điều chỉnh FPS dựa trên processing time
 * 2. Web Worker cho Canvas Operations - không block main thread
 * 3. Backpressure handling - skip frame nếu chưa xử lý xong
 */

import { useRef, useCallback, useEffect, useState } from 'react';

interface FrameCaptureConfig {
  /** Target FPS (default: 10) */
  targetFps?: number;
  /** Min FPS khi server chậm (default: 2) */
  minFps?: number;
  /** Max FPS khi server nhanh (default: 15) */
  maxFps?: number;
  /** JPEG quality (0-1, default: 0.8) */
  quality?: number;
  /** Enable Web Worker (default: true, fallback nếu không support) */
  useWorker?: boolean;
  /** Callback khi frame ready */
  onFrameReady?: (blob: Blob) => void;
  /** Callback khi có error */
  onError?: (error: string) => void;
  /** Callback khi frame được skip (backpressure) */
  onFrameSkipped?: () => void;
}

interface FrameCaptureStats {
  /** Current FPS đang capture */
  currentFps: number;
  /** Actual FPS đã xử lý thành công */
  actualFps: number;
  /** Processing time trung bình (ms) */
  avgProcessingTime: number;
  /** Số frame đã skip do backpressure */
  skippedFrames: number;
  /** Worker có đang được sử dụng không */
  usingWorker: boolean;
}

interface UseFrameCaptureReturn {
  /** Start capturing frames từ video element */
  startCapture: (video: HTMLVideoElement) => void;
  /** Stop capturing */
  stopCapture: () => void;
  /** Check if đang capture */
  isCapturing: boolean;
  /** Mark frame processing complete (gọi khi nhận response từ server) */
  markFrameComplete: () => void;
  /** Stats */
  stats: FrameCaptureStats;
}

export function useFrameCapture(config: FrameCaptureConfig = {}): UseFrameCaptureReturn {
  const {
    targetFps = 10,
    minFps = 2,
    maxFps = 15,
    quality = 0.8,
    useWorker = true,
    onFrameReady,
    onError,
    onFrameSkipped,
  } = config;

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const captureTimeoutRef = useRef<number | null>(null);
  const isCapturingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const workerReadyRef = useRef(false);

  // Dynamic frame rate tracking
  const processingTimesRef = useRef<number[]>([]);
  const currentIntervalRef = useRef(1000 / targetFps);
  const lastCaptureTimeRef = useRef(0);

  // Stats
  const [stats, setStats] = useState<FrameCaptureStats>({
    currentFps: targetFps,
    actualFps: 0,
    avgProcessingTime: 0,
    skippedFrames: 0,
    usingWorker: false,
  });
  
  // FPS counter
  const frameCountRef = useRef(0);
  const skippedCountRef = useRef(0);
  const fpsIntervalRef = useRef<number | null>(null);

  /**
   * Initialize Web Worker
   */
  const initWorker = useCallback(() => {
    if (!useWorker || typeof Worker === 'undefined') {
      return false;
    }

    try {
      // Check if OffscreenCanvas is supported
      if (typeof OffscreenCanvas === 'undefined') {
        console.log('[FrameCapture] OffscreenCanvas not supported, using main thread');
        return false;
      }

      const worker = new Worker('/canvasWorker.js');
      
      worker.onmessage = (event) => {
        const { type, blob, processingTime, error } = event.data;

        switch (type) {
          case 'ready':
            workerReadyRef.current = true;
            console.log('[FrameCapture] Worker ready');
            break;

          case 'frame_result':
            if (blob && onFrameReady) {
              onFrameReady(blob);
            }
            // Update processing time for dynamic FPS
            if (processingTime) {
              updateProcessingTime(processingTime);
            }
            break;

          case 'error':
            console.warn('[FrameCapture] Worker error:', error, '- will use main thread');
            // Disable worker và fallback về main thread
            workerReadyRef.current = false;
            isProcessingRef.current = false;
            // Không gọi onError để tránh spam - chỉ log warning
            break;

          case 'pong':
            // Health check response
            break;
        }
      };

      worker.onerror = (error) => {
        console.error('[FrameCapture] Worker fatal error:', error);
        workerRef.current = null;
        workerReadyRef.current = false;
      };

      workerRef.current = worker;
      return true;
    } catch (err) {
      console.warn('[FrameCapture] Failed to init worker:', err);
      return false;
    }
  }, [useWorker, onFrameReady, onError]);

  /**
   * Update processing time và điều chỉnh interval
   */
  const updateProcessingTime = useCallback((time: number) => {
    const times = processingTimesRef.current;
    times.push(time);
    
    // Keep last 10 samples
    if (times.length > 10) {
      times.shift();
    }

    // Calculate average
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

    // Dynamic interval adjustment
    // Nếu processing time > target interval, tăng interval lên
    // Nếu processing time < target interval / 2, giảm interval xuống
    const targetInterval = 1000 / targetFps;
    const minInterval = 1000 / maxFps;
    const maxInterval = 1000 / minFps;

    let newInterval = currentIntervalRef.current;

    if (avgTime > targetInterval * 0.8) {
      // Server đang chậm, giảm FPS
      newInterval = Math.min(maxInterval, avgTime * 1.5);
    } else if (avgTime < targetInterval * 0.3) {
      // Server đang nhanh, có thể tăng FPS
      newInterval = Math.max(minInterval, targetInterval * 0.8);
    } else {
      // Maintain target FPS
      newInterval = targetInterval;
    }

    currentIntervalRef.current = newInterval;

    // Update stats
    setStats(prev => ({
      ...prev,
      currentFps: Math.round(1000 / newInterval),
      avgProcessingTime: Math.round(avgTime),
    }));
  }, [targetFps, minFps, maxFps]);

  /**
   * Capture frame using main thread (fallback)
   */
  const captureFrameMainThread = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) {
      isProcessingRef.current = false;
      return;
    }

    // Get or create canvas
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      isProcessingRef.current = false;
      return;
    }

    const startTime = performance.now();
    
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const processingTime = performance.now() - startTime;
          updateProcessingTime(processingTime);
          onFrameReady?.(blob);
        } else {
          isProcessingRef.current = false;
        }
      },
      'image/jpeg',
      quality
    );
  }, [quality, onFrameReady, updateProcessingTime]);

  /**
   * Capture frame using Web Worker
   */
  const captureFrameWorker = useCallback(async () => {
    const video = videoRef.current;
    const worker = workerRef.current;
    
    // Check if worker is available and ready
    if (!video || !worker || !workerReadyRef.current || video.videoWidth === 0) {
      // Fallback to main thread
      await captureFrameMainThread();
      return;
    }

    try {
      // Create ImageBitmap from video (this is fast)
      const imageBitmap = await createImageBitmap(video);
      
      // Validate ImageBitmap before sending
      if (!imageBitmap || imageBitmap.width === 0 || imageBitmap.height === 0) {
        console.warn('[FrameCapture] Invalid ImageBitmap, using main thread');
        await captureFrameMainThread();
        return;
      }
      
      // Send to worker for processing
      worker.postMessage({
        type: 'processFrame',
        id: Date.now(),
        imageBitmap,
        quality,
      }, [imageBitmap]); // Transfer ownership of ImageBitmap
      
    } catch (err) {
      console.warn('[FrameCapture] Worker capture failed, using main thread:', err);
      // Disable worker for future frames
      workerReadyRef.current = false;
      await captureFrameMainThread();
    }
  }, [quality, captureFrameMainThread]);

  /**
   * Main capture loop with dynamic timing
   */
  const captureLoop = useCallback(async () => {
    if (!isCapturingRef.current) return;

    const now = performance.now();
    const elapsed = now - lastCaptureTimeRef.current;
    const interval = currentIntervalRef.current;

    // Check if enough time has passed
    if (elapsed < interval * 0.9) {
      // Schedule next check
      captureTimeoutRef.current = window.setTimeout(captureLoop, interval - elapsed);
      return;
    }

    // Check backpressure
    if (isProcessingRef.current) {
      skippedCountRef.current++;
      onFrameSkipped?.();
      // Schedule next attempt sooner
      captureTimeoutRef.current = window.setTimeout(captureLoop, interval / 2);
      return;
    }

    // Mark as processing
    isProcessingRef.current = true;
    lastCaptureTimeRef.current = now;
    frameCountRef.current++;

    // Capture frame
    if (workerRef.current && workerReadyRef.current) {
      await captureFrameWorker();
    } else {
      await captureFrameMainThread();
    }

    // Schedule next capture
    captureTimeoutRef.current = window.setTimeout(captureLoop, interval);
  }, [captureFrameWorker, captureFrameMainThread, onFrameSkipped]);

  /**
   * Start capturing
   */
  const startCapture = useCallback((video: HTMLVideoElement) => {
    if (isCapturingRef.current) return;

    videoRef.current = video;
    isCapturingRef.current = true;
    isProcessingRef.current = false;
    lastCaptureTimeRef.current = performance.now();
    frameCountRef.current = 0;
    skippedCountRef.current = 0;
    processingTimesRef.current = [];
    currentIntervalRef.current = 1000 / targetFps;

    // Try to init worker
    const workerInited = initWorker();
    setStats(prev => ({ ...prev, usingWorker: workerInited }));

    console.log('[FrameCapture] Starting capture', {
      targetFps,
      minFps,
      maxFps,
      usingWorker: workerInited,
      workerSupported: typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined',
    });

    // Start FPS counter
    fpsIntervalRef.current = window.setInterval(() => {
      setStats(prev => ({
        ...prev,
        actualFps: frameCountRef.current,
        skippedFrames: prev.skippedFrames + skippedCountRef.current,
        usingWorker: workerReadyRef.current, // Update worker status
      }));
      frameCountRef.current = 0;
      skippedCountRef.current = 0;
    }, 1000);

    // Start capture loop
    captureLoop();
  }, [targetFps, initWorker, captureLoop]);

  /**
   * Stop capturing
   */
  const stopCapture = useCallback(() => {
    isCapturingRef.current = false;
    isProcessingRef.current = false;

    if (captureTimeoutRef.current) {
      clearTimeout(captureTimeoutRef.current);
      captureTimeoutRef.current = null;
    }

    if (fpsIntervalRef.current) {
      clearInterval(fpsIntervalRef.current);
      fpsIntervalRef.current = null;
    }

    // Terminate worker
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      workerReadyRef.current = false;
    }

    videoRef.current = null;
    
    console.log('[FrameCapture] Stopped');
  }, []);

  /**
   * Mark frame processing complete
   */
  const markFrameComplete = useCallback(() => {
    isProcessingRef.current = false;
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopCapture();
    };
  }, [stopCapture]);

  return {
    startCapture,
    stopCapture,
    isCapturing: isCapturingRef.current,
    markFrameComplete,
    stats,
  };
}

export default useFrameCapture;
