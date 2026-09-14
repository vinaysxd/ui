import api from "../lib/api";
import { getErrorMessage } from "../constants/errors";

export interface Staff {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: "staff";
  avatar_url: string | null;
  is_active: boolean;
  created_at?: string;
  profile_id?: string;
  employee_id?: string | null;
  address?: string | null;
  emergency_contact?: string | null;
}

export interface StaffUpdatePayload {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  employee_id?: string;
  address?: string;
  emergency_contact?: string;
}

export interface StaffInvitePayload {
  full_name: string;
  email: string;
  phone: string;
}

export interface InvitedUser {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: "staff";
}

export const getAllStaff = async (): Promise<Staff[]> => {
  try {
    const response = await api.get("/admin/staff");
    return response.data.staff;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const getStaff = async (id: string): Promise<Staff> => {
  try {
    const response = await api.get(`/admin/staff/${id}`);
    return response.data.staff;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const updateStaff = async (id: string, data: StaffUpdatePayload): Promise<Staff> => {
  try {
    const response = await api.put(`/admin/staff/${id}`, data);
    return response.data.staff;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const deactivateStaff = async (id: string): Promise<void> => {
  try {
    await api.delete(`/admin/staff/${id}`);
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const inviteStaff = async (data: StaffInvitePayload): Promise<InvitedUser> => {
  try {
    const response = await api.post("/admin/invite", { ...data, role: "staff" });
    return response.data.user;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};
