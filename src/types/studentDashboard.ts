export interface DashboardSummarySchema {
    my_classes: number;
    attendance_rate: number;
    total_absences: number;
    this_week_attended: number;
    this_week_total: number;
}

export interface AttendanceDistributionItemSchema {
    status: string;
    count: number;
    percentage: number;
}

export interface WeeklyAttendanceItemSchema {
    day: string;
    present_count: number;
    absent_count: number;
}

export interface MonthlyTrendItemSchema {
    month: string;
    attendance_rate: number;
}

export interface SubjectAttendanceItemSchema {
    subject_name: string;
    attendance_rate: number;
    total_sessions: number;
}

export interface RecentActivityItemSchema {
    description: string;
    timestamp: string; // Assuming datetime from backend will be string in frontend
}

export interface StudentDashboardResponseSchema {
    summary: DashboardSummarySchema;
    attendance_distribution: AttendanceDistributionItemSchema[];
    weekly_attendance: WeeklyAttendanceItemSchema[];
    monthly_trend: MonthlyTrendItemSchema[];
    subject_wise_attendance: SubjectAttendanceItemSchema[];
    recent_activity: RecentActivityItemSchema[];
}