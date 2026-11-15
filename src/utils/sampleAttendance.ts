import { Attendance } from "../services/attendance.service";

// Dev-only sample data for the admin dashboard (see USE_SAMPLE_ATTENDANCE there).
// Generated relative to "now" so dates always read Today / Yesterday / etc.
const STAFF = [
  "Marcus Reid", "Priya Nair", "Tom Hargreaves", "Elena Rossi",
  "Jamal Carter", "Sofia Lindqvist", "Daniel Okafor", "Aisha Rahman",
];
const SITES = [
  "Harbour View Offices", "Greenfield Mall", "St. Mary's Hospital",
  "Riverside Apartments", "Northgate Warehouse",
];

// Deterministic pseudo-random so the list doesn't reshuffle on every render.
let seed = 7;
const rand = () => {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
};

const at = (daysBack: number, hour: number, minute: number, now: Date) =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysBack, hour, minute);

export function buildSampleAttendance(now: Date = new Date()): Attendance[] {
  seed = 7;
  const records: Attendance[] = [];
  let n = 0;
  const push = (staffIdx: number, siteIdx: number, clockIn: Date, clockOut: Date | null) => {
    if (clockIn.getTime() > now.getTime()) return;
    const out = clockOut && clockOut.getTime() > now.getTime() ? null : clockOut;
    n += 1;
    records.push({
      id: `sample-${n}`,
      staff_id: `staff-${staffIdx}`,
      site_id: `site-${siteIdx}`,
      clock_in: clockIn.toISOString(),
      clock_in_lat: 0,
      clock_in_lng: 0,
      clock_out: out ? out.toISOString() : null,
      clock_out_lat: out ? 0 : null,
      clock_out_lng: out ? 0 : null,
      staff: { id: `staff-${staffIdx}`, full_name: STAFF[staffIdx], email: "", phone: "" },
      site: { id: `site-${siteIdx}`, name: SITES[siteIdx], address: "" },
      photos: [],
    });
  };

  // Today (fewer than yesterday so the trend indicator has something to show).
  for (let s = 0; s < 5; s++) {
    const inMin = 6 * 60 + 15 + Math.floor(rand() * 75) + (s === 3 ? 75 : 0); // s===3 is late
    const dur = 7.5 * 60 + Math.floor(rand() * 90);
    push(s, s % SITES.length, at(0, 0, inMin, now), at(0, 0, inMin + dur, now));
  }
  // Previous six days, five to seven shifts each.
  for (let d = 1; d <= 6; d++) {
    const count = 5 + Math.floor(rand() * 3);
    for (let s = 0; s < count; s++) {
      const staff = (s + d) % STAFF.length;
      const late = rand() < 0.15;
      const inMin = 6 * 60 + 10 + Math.floor(rand() * 80) + (late ? 70 : 0);
      const dur = 7 * 60 + 30 + Math.floor(rand() * 100);
      push(staff, (staff + d) % SITES.length, at(d, 0, inMin, now), at(d, 0, inMin + dur, now));
    }
  }
  // Edge cases: overnight, very short, and a multi-day shift that was left open then closed.
  push(2, 3, at(2, 22, 5, now), at(1, 6, 20, now));
  push(5, 0, at(3, 10, 2, now), at(3, 10, 8, now));
  push(7, 4, at(5, 8, 0, now), at(0, 0, 5, now));
  // One forgotten clock-out from yesterday.
  push(6, 1, at(1, 7, 42, now), null);

  return records;
}
