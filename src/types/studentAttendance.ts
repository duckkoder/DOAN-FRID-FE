export interface StudentAttendanceImageSchema {
    id: number;
    file_id?: number | null;
    file_url?: string | null;
    captured_at: string; // datetime
}

export interface StudentAttendanceRecordDetailSchema {
    id: number;
    session_id: number;
    class_id: number;
    class_name: string;
    session_name?: string | null;
    location?: string | null;
    start_time: string; // datetime
    end_time?: string | null; // datetime
    student_id: number;
    status: string; // 'present', 'absent', 'late', 'excused'
    confidence_score?: number | null;
    recorded_at?: string | null; // datetime
    notes?: string | null;
    images: StudentAttendanceImageSchema[];
}

export interface StudentAttendanceSessionSummarySchema {
    session_id: number;
    session_name?: string | null;
    start_time: string; // datetime
    end_time?: string | null; // datetime
    class_id: number;
    day_of_week?: number | null;
    period_range?: string | null;
    class_name: string;
    session_status: string; // 'scheduled', 'ongoing', 'finished'
    student_attendance_status?: string | null;
    student_recorded_at?: string | null; // datetime
    student_confidence_score?: number | null;
    has_evidence_images: boolean;
}

export interface StudentClassAttendanceSummary {
    class_id: number;
    class_name: string;
    total_sessions: number;
    attended_sessions: number;
    absent_sessions: number;
    late_sessions: number;
    attendance_rate: number;
    sessions: StudentAttendanceSessionSummarySchema[];
}

export interface StudentAttendanceReportResponse {
    student_id: number;
    student_full_name: string;
    overall_attendance_rate: number;
    classes_summary: StudentClassAttendanceSummary[];
}
