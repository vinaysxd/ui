import { Attendance } from "../services/attendance.service";

// Matches the statuses the server returns on each attendance record.
export type AttendanceStatus = "clocked_in" | "clocked_out" | "long_shift";

// Fallback used only when a record has no server `status`: an attendance still
// open this long after clock-in is treated as a long shift.
export const LONG_SHIFT_HOURS = 16;

export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  clocked_in: "Clocked In",
  clocked_out: "Clocked Out",
  long_shift: "Long Shift",
};

const isStatus = (v: unknown): v is AttendanceStatus => typeof v === "string" && v in STATUS_LABEL;

export function getAttendanceStatus(record: Attendance, now: Date = new Date()): AttendanceStatus {
  if (isStatus(record.status)) return record.status;
  if (record.clock_out) return "clocked_out";
  const elapsed = now.getTime() - new Date(record.clock_in).getTime();
  return elapsed > LONG_SHIFT_HOURS * 3600 * 1000 ? "long_shift" : "clocked_in";
}

/** Newest clock-in first. Returns a new array. */
export const sortMostRecent = (records: Attendance[]): Attendance[] =>
  [...records].sort((a, b) => new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime());

// ---- Problem flags -------------------------------------------------------
export const OVERTIME_HOURS = 8;
export const ALERT_HOURS = 12;
export const SHORT_SHIFT_MINUTES = 15;

export interface ShiftFlag {
  level: "warning" | "danger";
  label: string;
}

/**
 * Flags entries worth a second look, open or closed:
 *  - 12h+  -> red alert
 *  - 8h+   -> amber overtime
 *  - closed shifts under 15 minutes -> amber "unusually short"
 */
export function getShiftFlag(record: Attendance, now: Date = new Date()): ShiftFlag | null {
  const open = !record.clock_out;
  const end = record.clock_out ? new Date(record.clock_out) : now;
  const hours = (end.getTime() - new Date(record.clock_in).getTime()) / 3600000;
  const suffix = open ? " (still clocked in)" : "";

  if (hours >= ALERT_HOURS || (open && getAttendanceStatus(record, now) === "long_shift")) {
    return { level: "danger", label: `Over ${ALERT_HOURS} hours${suffix}` };
  }
  if (hours >= OVERTIME_HOURS) return { level: "warning", label: `Overtime, over ${OVERTIME_HOURS} hours${suffix}` };
  if (!open && hours * 60 < SHORT_SHIFT_MINUTES) return { level: "warning", label: "Unusually short shift" };
  return null;
}
