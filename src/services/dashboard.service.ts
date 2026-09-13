import api from "../lib/api";
import { getErrorMessage } from "../constants/errors";

export interface StaffClockedInToday {
  staff_name: string | null;
  site_name: string | null;
  clock_in: string;
}

export interface AdminDashboard {
  total_staff: number;
  total_clients: number;
  total_sites: number;
  todays_attendance_count: number;
  staff_clocked_in_today: StaffClockedInToday[];
}

export const getAdminDashboard = async (): Promise<AdminDashboard> => {
  try {
    const response = await api.get("/admin/dashboard");
    return response.data;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};
