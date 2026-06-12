/**
 * Timezone Utilities for Spark Stage
 * 
 * CRITICAL: All business operations are in WIB (UTC+7) timezone
 * 
 * RULES:
 * 1. Database stores dates/times as UTC (PostgreSQL TIMESTAMPTZ)
 * 2. Database stores time_slot as TIME WITHOUT TIMEZONE (treated as WIB local time)
 * 3. All user-facing times are displayed in WIB
 * 4. All comparisons must be timezone-aware
 * 
 * NEVER use:
 * - new Date() without timezone context
 * - Date.now() for business logic
 * - toISOString() without understanding it returns UTC
 * 
 * ALWAYS use:
 * - Functions from this file
 * - Explicit timezone conversion
 * - WIB-aware comparisons
 */

export const WIB_OFFSET_HOURS = 7;
export const WIB_OFFSET_MS = WIB_OFFSET_HOURS * 60 * 60 * 1000;

/**
 * Get current time in WIB timezone
 * Use this instead of new Date() for business logic
 * Returns a Date object representing current WIB time
 */
export function nowWIB(): Date {
  // Return actual UTC time (absolute moment)
  // The timezone conversion happens in other functions when needed
  return new Date();
}

/**
 * Convert UTC Date to WIB Date
 */
export function utcToWIB(utcDate: Date): Date {
  return new Date(utcDate.getTime() + WIB_OFFSET_MS);
}

/**
 * Convert WIB Date to UTC Date
 */
export function wibToUTC(wibDate: Date): Date {
  return new Date(wibDate.getTime() - WIB_OFFSET_MS);
}

/**
 * Parse date string from database (UTC) and convert to WIB
 */
export function parseDBDateToWIB(dbDateString: string): Date {
  const utcDate = new Date(dbDateString);
  return utcToWIB(utcDate);
}

/**
 * Format Date to ISO string in WIB timezone
 * Use this when sending dates to backend that expects WIB
 */
export function toWIBISOString(date: Date): string {
  const wibDate = new Date(date.getTime() + WIB_OFFSET_MS);
  return wibDate.toISOString();
}

/**
 * Get today's date at midnight in WIB
 * Use this for date comparisons
 */
export function todayWIB(): Date {
  return createWIBDate(toLocalDateString(nowWIB()));
}

/**
 * Create a Date object for a specific date and time in WIB
 * @param dateString - YYYY-MM-DD format
 * @param timeString - HH:MM or HH:MM:SS format (optional)
 * @returns Date object representing the WIB time
 */
export function createWIBDate(dateString: string, timeString?: string): Date {
  // Parse as if it's in WIB timezone (UTC+7)
  // Add :00 for seconds if timeString is HH:MM format
  const fullTimeString = timeString 
    ? (timeString.split(':').length === 2 ? `${timeString}:00` : timeString)
    : '00:00:00';
  
  const isoString = `${dateString}T${fullTimeString}+07:00`;
  return new Date(isoString);
}

/**
 * Format date to local date string (YYYY-MM-DD)
 * Handles timezone properly - uses WIB date
 */
export function toLocalDateString(date: Date): string {
  const wibDate = new Date(date.getTime() + WIB_OFFSET_MS);
  const year = wibDate.getUTCFullYear();
  const month = String(wibDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(wibDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if a date is today in WIB timezone
 */
export function isTodayWIB(date: Date): boolean {
  return toLocalDateString(date) === toLocalDateString(nowWIB());
}

/**
 * Check if a datetime is in the past (WIB timezone)
 */
export function isPastWIB(date: Date): boolean {
  return date.getTime() < nowWIB().getTime();
}

/**
 * Add minutes to a date (timezone-safe)
 */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

/**
 * Add hours to a date (timezone-safe)
 */
export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Add days to a date (timezone-safe)
 */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Format time for display (HH:MM format)
 */
export function formatTimeWIB(date: Date): string {
  const wibDate = utcToWIB(date);
  const hours = String(wibDate.getUTCHours()).padStart(2, '0');
  const minutes = String(wibDate.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format datetime for display in WIB
 */
export function formatDateTimeWIB(date: Date | string): string {
  let target: Date;
  
  if (typeof date === 'string') {
    // If it's a DB string without timezone, treat it as UTC
    const isUTC = !date.includes('Z') && !date.includes('+') && date.includes('T');
    target = new Date(isUTC ? `${date}Z` : date);
  } else {
    target = date;
  }

  return target.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Parse time slot string (HH:MM:SS) and create Date for today in WIB
 * Used for comparing time slots with current time
 */
export function parseTimeSlotToday(timeSlot: string, referenceDate?: Date): Date {
  const dateString = toLocalDateString(referenceDate ? new Date(referenceDate) : nowWIB());
  return createWIBDate(dateString, timeSlot);
}

/**
 * Session duration in minutes (2.5 hours)
 * Updated: January 2026 - Changed from 3 hours to 2.5 hours
 */
export const SESSION_DURATION_MINUTES = 150; // 2.5 hours

/**
 * Get the fixed session group end time for a given time slot.
 * Sessions are grouped by period with a shared hard cutoff:
 *   - Sesi Pagi    (09:xx – 11:xx) → ends 11:30
 *   - Sesi Siang   (12:xx – 14:xx) → ends 14:30
 *   - Sesi Sore    (15:xx – 17:xx) → ends 17:30
 *   - Sesi Malam   (18:xx – 20:xx) → ends 20:30
 *
 * Use this instead of start_time + SESSION_DURATION_MINUTES so that ALL slots
 * in the same session group expire at the SAME time (the group boundary),
 * not at their individual start_time + 150 min.
 *
 * @param timeSlot - Time in HH:MM:SS or HH:MM format
 * @returns session group end time string (HH:MM:SS)
 */
export function getSessionGroupEndTime(timeSlot: string): string {
  const hour = parseInt(timeSlot.split(':')[0], 10);
  if (hour >= 9 && hour < 12) return '11:30:00';
  if (hour >= 12 && hour < 15) return '14:30:00';
  if (hour >= 15 && hour < 18) return '17:30:00';
  if (hour >= 18) return '20:30:00';
  // Fallback: treat slot as expired if it doesn't map to a known session
  return '00:00:00';
}

/**
 * Check if the session GROUP that a time slot belongs to has ended.
 * Uses group boundary times (14:30, 17:30, etc.) rather than per-slot duration.
 *
 * @param dateString - Date in YYYY-MM-DD format
 * @param timeSlot   - Time in HH:MM:SS format (session start time)
 * @param referenceTime - Optional override for current time
 * @returns true if the session group's cutoff time has passed
 */
export function isSessionGroupEnded(
  dateString: string,
  timeSlot: string,
  referenceTime?: Date
): boolean {
  const groupEndTimeStr = getSessionGroupEndTime(timeSlot);
  const groupEndTime = createWIBDate(dateString, groupEndTimeStr);
  const currentTime = referenceTime ? new Date(referenceTime) : nowWIB();
  return groupEndTime <= currentTime;
}

/**
 * Get booking buffer time (current time + buffer minutes) in WIB
 * @deprecated Use isTimeSlotBookable instead - buffer logic removed
 */
export function getBookingBufferTime(bufferMinutes: number = 30): Date {
  return addMinutes(nowWIB(), bufferMinutes);
}

/**
 * Validate if a time slot is bookable
 * NEW LOGIC (Jan 2026): Allow booking as long as session hasn't ended
 * - Customers can book even after session starts
 * - Booking closes when session END time is reached
 * - No artificial 30-minute buffer
 * 
 * @param dateString - Date in YYYY-MM-DD format
 * @param timeSlot - Time in HH:MM:SS format (session start time)
 * @returns true if current time is before session end time
 * 
 * Example:
 * - Session: 18:00-20:30 (2.5 hours)
 * - Current: 18:15 → Bookable (session ends at 20:30)
 * - Current: 20:35 → Not bookable (session ended)
 */
export function isTimeSlotBookable(
  dateString: string,
  timeSlot: string,
  referenceTime?: Date
): boolean {
  const slotStartTime = createWIBDate(dateString, timeSlot);
  const slotEndTime = addMinutes(slotStartTime, SESSION_DURATION_MINUTES);
  const currentTime = referenceTime ? new Date(referenceTime) : nowWIB();
  
  // Allow booking if session hasn't ended yet
  return slotEndTime > currentTime;
}

/**
 * Get the end time of a session
 * @param dateString - Date in YYYY-MM-DD format
 * @param timeSlot - Time in HH:MM:SS format (session start time)
 * @returns Session end time as Date
 */
export function getSessionEndTime(dateString: string, timeSlot: string): Date {
  const slotStartTime = createWIBDate(dateString, timeSlot);
  return addMinutes(slotStartTime, SESSION_DURATION_MINUTES);
}

/**
 * Get minutes remaining until session ends
 * @param dateString - Date in YYYY-MM-DD format
 * @param timeSlot - Time in HH:MM:SS format (session start time)
 * @returns Minutes until session ends, or 0 if session has ended
 */
export function getMinutesUntilSessionEnd(dateString: string, timeSlot: string): number {
  const sessionEndTime = getSessionEndTime(dateString, timeSlot);
  const currentTime = nowWIB();
  const diffMs = sessionEndTime.getTime() - currentTime.getTime();
  return Math.max(0, Math.floor(diffMs / (60 * 1000)));
}

/**
 * Get month name in Indonesian format with WIB timezone
 * @param date - Date object
 * @returns Month name in format "MMMM YYYY" (e.g., "Mei 2026")
 */
export function getMonthNameWIB(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Get weekday names in Indonesian, starting with Monday (Senin)
 * Returns array: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
 * Note: Standard calendar starts with Monday in many locales, but we adjust to match UI expectation
 */
export function getWeekdayNamesIndonesian(): string[] {
  // Indonesia week starts with Senin (Monday) in calendar context
  return ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
}

/**
 * Get weekday abbreviations in Indonesian
 * Returns array: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
 */
export function getWeekdayAbbreviationsIndonesian(): string[] {
  return ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
}

/**
 * Get day of week in Indonesian (0 = Sunday in JS, but we show as Minggu at end)
 * Convert JS getDay() to Indonesian calendar display order
 * @param jsDay - Result from Date.getDay() (0=Sun, 1=Mon, ..., 6=Sat)
 * @returns Index in Indonesian calendar (0=Senin, ..., 6=Minggu)
 */
export function convertJSDayToIndonesianDay(jsDay: number): number {
  // JS: 0=Sun, 1=Mon, 2=Tue, ..., 6=Sat
  // Indo: 0=Sen(Mon), 1=Sel(Tue), ..., 5=Sab(Sat), 6=Min(Sun)
  return jsDay === 0 ? 6 : jsDay - 1;
}

/**
 * MIGRATION HELPER: Convert existing Date usage
 * Use this to audit and fix existing code
 */
export const MIGRATION_NOTES = `
BEFORE (WRONG):
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

AFTER (CORRECT):
  import { nowWIB, todayWIB } from '@/utils/timezone';
  const now = nowWIB();
  const today = todayWIB();

BEFORE (WRONG):
  const slotTime = new Date();
  slotTime.setHours(hours, minutes, 0, 0);

AFTER (CORRECT):
  import { parseTimeSlotToday } from '@/utils/timezone';
  const slotTime = parseTimeSlotToday(timeSlot, selectedDate);

BEFORE (WRONG):
  const bookingDate = new Date(dateString);

AFTER (CORRECT):
  import { createWIBDate } from '@/utils/timezone';
  const bookingDate = createWIBDate(dateString);
`;
