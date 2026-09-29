import { Platform } from "react-native";
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
    const filename = uri.split("/").pop()?.split("?")[0] || `avatar-${Date.now()}.jpg`;
    const ext = filename.split(".").pop()?.toLowerCase();
    const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

    const formData = new FormData();
    if (Platform.OS === "web") {
      // Browser FormData needs a real Blob/File; the uri here is a blob: or
      // data: URL from the web image picker, not a native file path.
      const blob = await (await fetch(uri)).blob();
      formData.append("avatar", blob, filename);
    } else {
      // React Native needs this { uri, name, type } object shape; a fetched
      // Blob is not sent reliably through RN's networking bridge.
      formData.append("avatar", { uri, name: filename, type } as any);
    }
    console.log("Avatar FormData parts:", (formData as any).getParts?.() ?? formData);

    console.log("Calling POST /profile/avatar");
    const response = await api.post("/profile/avatar", formData, {
      headers: {
        // Native's bridge needs this set explicitly. On web, a manually-set
        // "multipart/form-data" has no boundary parameter, which corrupts the
        // request; passing null drops the header so the browser can generate
        // the correct one itself.
        "Content-Type": Platform.OS === "web" ? null : "multipart/form-data",
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
