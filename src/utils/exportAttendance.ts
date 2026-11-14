import { Platform, Share } from "react-native";
import { Attendance } from "../services/attendance.service";
import { getAttendanceStatus, STATUS_LABEL } from "./attendanceStatus";
import { formatDateTime, formatDuration } from "./datetime";

const HEADERS = ["Staff", "Site", "Clock In", "Clock Out", "Duration", "Status"];

const rowOf = (r: Attendance): string[] => [
  r.staff?.full_name ?? "Unknown staff",
  r.site?.name ?? "Unknown site",
  formatDateTime(r.clock_in),
  r.clock_out ? formatDateTime(r.clock_out) : "",
  formatDuration(r.clock_in, r.clock_out),
  STATUS_LABEL[getAttendanceStatus(r)],
];

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export const toCsv = (records: Attendance[]): string =>
  [HEADERS, ...records.map(rowOf)].map((row) => row.map(csvCell).join(",")).join("\n");

const stamp = () => new Date().toISOString().slice(0, 10);

/** Web: downloads a .csv file. Native: opens the share sheet with the CSV text. */
export async function exportCsv(records: Attendance[]): Promise<void> {
  const csv = toCsv(records);
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${stamp()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  await Share.share({ title: `Attendance ${stamp()}`, message: csv });
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Web only: opens a clean printable table in a new window. */
export function printAttendance(records: Attendance[]): void {
  if (Platform.OS !== "web") return;
  const win = window.open("", "_blank");
  if (!win) return;
  const head = HEADERS.map((h) => `<th>${h}</th>`).join("");
  const body = records.map((r) => `<tr>${rowOf(r).map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("");
  win.document.write(
    `<html><head><title>Attendance ${stamp()}</title><style>
      body{font-family:system-ui,sans-serif;padding:24px}
      table{border-collapse:collapse;width:100%}
      th,td{text-align:left;padding:6px 10px;border-bottom:1px solid #ddd;font-size:13px}
    </style></head><body><h2>Attendance report</h2><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`
  );
  win.document.close();
  win.focus();
  win.print();
}
