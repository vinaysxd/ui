import api from "../lib/api";
import { getErrorMessage } from "../constants/errors";

export interface ProfileMe {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: "admin" | "staff" | "client";
  avatar_url: string | null;
  is_active: boolean;
  profile_id?: string;
  employee_id?: string | null;
  address?: string | null;
  emergency_contact?: string | null;
  company_name?: string | null;
  billing_address?: string | null;
  contact_person?: string | null;
  signed_avatar_url: string |null;
  created_at?: string;
}

export interface ProfileUpdatePayload {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  address?: string;
  emergency_contact?: string;
}

export const getProfile = async (): Promise<ProfileMe> => {
  try {
    const response = await api.get("/profile/me");
    return response.data;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const updateProfile = async (data: ProfileUpdatePayload): Promise<ProfileMe> => {
  try {
    const response = await api.put("/profile/me", data);
    return response.data;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const uploadAvatar = async (uri: string): Promise<string> => {
  try {
    const filename = uri.split("/").pop() ?? `avatar-${Date.now()}.jpg`;
    const imageResponse = await fetch(uri);
    const blob = await imageResponse.blob();

    const formData = new FormData();
    formData.append("avatar", blob, filename);

    const response = await api.post("/profile/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.avatar_url;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};
