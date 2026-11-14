const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year} ${hours}:${minutes}`;
};

export const formatTime = (iso: string): string => {
  const date = new Date(iso);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole calendar days between `iso` and now (0 = today, 1 = yesterday). */
export const daysAgo = (iso: string, now: Date = new Date()): number =>
  Math.round((startOfDay(now) - startOfDay(new Date(iso))) / DAY_MS);

/** "Today 14:07", "Yesterday 20:31", "12 Nov 09:02" (adds the year when it isn't this year). */
export const formatRelativeDateTime = (iso: string, now: Date = new Date()): string => {
  const date = new Date(iso);
  const diff = daysAgo(iso, now);
  const time = formatTime(iso);
  if (diff === 0) return `Today ${time}`;
  if (diff === 1) return `Yesterday ${time}`;
  const year = date.getFullYear() !== now.getFullYear() ? ` ${date.getFullYear()}` : "";
  return `${date.getDate()} ${MONTHS[date.getMonth()]}${year} ${time}`;
};

/** Like formatRelativeDateTime, but just the time when `iso` falls on the same day as `reference`. */
export const formatTimeOrDate = (iso: string, reference: string, now: Date = new Date()): string =>
  daysAgo(iso, now) === daysAgo(reference, now) ? formatTime(iso) : formatRelativeDateTime(iso, now);

/** "8h 12m", "45m", or "1d 2h" for multi-day spans. */
export const formatDuration = (fromIso: string, toIso?: string | null, now: Date = new Date()): string => {
  const end = toIso ? new Date(toIso).getTime() : now.getTime();
  const mins = Math.max(0, Math.round((end - new Date(fromIso).getTime()) / 60000));
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m`;
};

/** Clock-out time; overnight / multi-day shifts get a "+1d" style marker instead of an ambiguous bare time. */
export const formatClockOut = (clockInIso: string, clockOutIso: string): string => {
  const offset = Math.round(
    (startOfDay(new Date(clockOutIso)) - startOfDay(new Date(clockInIso))) / DAY_MS
  );
  const time = formatTime(clockOutIso);
  return offset > 0 ? `${time} +${offset}d` : time;
};
