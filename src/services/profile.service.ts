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
  company_name?: string;
  billing_address?: string;
  contact_person?: string;
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
    console.log("Starting avatar upload", uri);
    const filename = uri.split("/").pop() ?? `avatar-${Date.now()}.jpg`;
    const ext = filename.split(".").pop()?.toLowerCase();
    const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

    const formData = new FormData();
    // React Native needs a { uri, name, type } object; blobs from fetch(uri) are not sent reliably.
    formData.append("avatar", { uri, name: filename, type } as any);
    console.log("Avatar FormData parts:", (formData as any).getParts?.() ?? formData);

    console.log("Calling POST /profile/avatar");
    const response = await api.post("/profile/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      transformRequest: (data, headers) => {
        console.log("Avatar request headers:", JSON.stringify(headers));
        return data;
      },
    });
    console.log("Avatar upload response:", response.status, response.data);
    return response.data.avatar_url;
  } catch (error: any) {
    console.log(
      "Avatar upload error:",
      error?.message,
      error?.code,
      error?.response?.status,
      error?.response?.data
    );
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};
