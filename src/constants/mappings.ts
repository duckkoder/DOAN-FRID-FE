/**
 * Mappings for Days of the Week
 * Backend format: 0 = Monday, 1 = Tuesday, ..., 6 = Sunday
 */
export const DAY_NAMES: Record<number, string> = {
  0: "Thứ Hai",
  1: "Thứ Ba",
  2: "Thứ Tư",
  3: "Thứ Năm",
  4: "Thứ Sáu",
  5: "Thứ Bảy",
  6: "Chủ Nhật",
};

/**
 * Array format for Dropdown options
 */
export const WEEK_DAYS_OPTIONS = Object.entries(DAY_NAMES).map(([value, label]) => ({
  value: Number(value),
  label,
}));

/**
 * Mappings for Time Slots (Periods 1-10)
 */
export const TIME_SLOTS: Record<number, string> = {
  1: "07:00",
  2: "08:00",
  3: "09:00",
  4: "10:00",
  5: "11:00",
  6: "13:00",
  7: "14:00",
  8: "15:00",
  9: "16:00",
  10: "17:00",
};

export const getEndTimeForPeriod = (period: number): string => {
  const startTime = TIME_SLOTS[period];
  if (!startTime) return "17:50"; // Default fallback
  
  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + 50; // +50 minutes
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
};

/**
 * Get start and end time string for a range of periods (x, y)
 */
export const getTimeRangeForPeriods = (startPeriod: number, endPeriod: number): { start: string; end: string } => {
  const start = TIME_SLOTS[startPeriod] || "00:00";
  const end = getEndTimeForPeriod(endPeriod);
  return { start, end };
};

/**
 * Array format for Dropdown options
 */
export const PERIOD_OPTIONS = Object.entries(TIME_SLOTS).map(([period, start]) => ({
  period: Number(period),
  start,
  end: getEndTimeForPeriod(Number(period)),
}));
