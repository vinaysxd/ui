import api from "../lib/api";
import { getErrorMessage } from "../constants/errors";

export interface AttendancePhoto {
  id: string;
  attendance_id: string;
  label: string;
  before_photo_url: string | null;
  after_photo_url: string | null;
}

export interface AttendanceStaff {
  id: string;
  full_name: string;
  email: string;
  phone: string;
}

export interface Attendance {
  id: string;
  staff_id: string;
  site_id: string;
  clock_in: string;
  clock_in_lat: number;
  clock_in_lng: number;
  clock_out: string | null;
  clock_out_lat: number | null;
  clock_out_lng: number | null;
  staff: AttendanceStaff | null;
  photos: AttendancePhoto[];
}

export const getAttendanceBySite = async (site_id: string): Promise<Attendance[]> => {
  try {
    const response = await api.get(`/attendance/site/${site_id}`);
    return response.data.attendance;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};
