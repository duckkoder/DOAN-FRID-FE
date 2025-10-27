/**
 * Smart Polling Hook for Attendance Updates
 * Polls backend để lấy attendance records với exponential backoff
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../apis/axios';

export interface AttendanceRecord {
  id: number;
  session_id: number;
  student_id: number;
  student_code: string;
  full_name: string;
  status: 'present' | 'late' | 'absent';
  check_in_time: string | null;
  confidence_score: number | null;
  recognition_method: string | null;
}

export interface AttendanceStatistics {
  total_students: number;
  present: number;
  late: number;
  absent: number;
  attendance_rate: number;
}

export interface AttendanceData {
  session: {
    id: number;
    class_id: number;
    status: string;
    start_time: string;
    end_time: string | null;
  };
  records: AttendanceRecord[];
  statistics: AttendanceStatistics;
}

interface UseSmartPollingOptions {
  sessionId: number | null;
  enabled: boolean;
  initialInterval?: number; // ms
  maxInterval?: number; // ms
  backoffMultiplier?: number;
}

export const useSmartPolling = ({
  sessionId,
  enabled,
  initialInterval = 2000, // Start với 2s
  maxInterval = 10000, // Max 10s
  backoffMultiplier = 1.5,
}: UseSmartPollingOptions) => {
  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const intervalRef = useRef(initialInterval);
  const lastRecordCountRef = useRef(0);
  const consecutiveNoChangeRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);

  const fetchData = useCallback(async () => {
    if (!sessionId || !enabled) return;

    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/attendance/sessions/${sessionId}`);
      const newData: AttendanceData = response.data;

      setData(newData);

      // Smart interval adjustment
      const currentRecordCount = newData.records.length;
      
      if (currentRecordCount > lastRecordCountRef.current) {
        // Có update mới → reset interval về initial
        console.log('[SmartPolling] New records detected, resetting interval');
        intervalRef.current = initialInterval;
        consecutiveNoChangeRef.current = 0;
      } else {
        // Không có update → tăng interval (exponential backoff)
        consecutiveNoChangeRef.current++;
        const newInterval = Math.min(
          intervalRef.current * backoffMultiplier,
          maxInterval
        );
        
        if (newInterval !== intervalRef.current) {
          console.log(`[SmartPolling] No changes, increasing interval to ${newInterval}ms`);
          intervalRef.current = newInterval;
        }
      }

      lastRecordCountRef.current = currentRecordCount;

      // Stop polling nếu session finished
      if (newData.session.status === 'finished') {
        console.log('[SmartPolling] Session finished, stopping poll');
        return;
      }

    } catch (err: any) {
      console.error('[SmartPolling] Error:', err);
      setError(err.response?.data?.detail || 'Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  }, [sessionId, enabled, initialInterval, maxInterval, backoffMultiplier]);

  useEffect(() => {
    if (!enabled || !sessionId) {
      // Clear timeout nếu disabled
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Initial fetch
    fetchData();

    // Setup polling
    const poll = () => {
      if (!enabled || !sessionId) return;

      fetchData().then(() => {
        // Schedule next poll nếu session chưa finished
        if (data?.session.status !== 'finished') {
          timeoutRef.current = setTimeout(poll, intervalRef.current);
        }
      });
    };

    // Start polling
    timeoutRef.current = setTimeout(poll, intervalRef.current);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [enabled, sessionId, fetchData, data?.session.status]);

  // Manual refresh
  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh,
    currentInterval: intervalRef.current,
  };
};
