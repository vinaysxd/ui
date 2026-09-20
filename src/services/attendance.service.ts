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

export interface AttendanceSite {
  id: string;
  name: string;
  address: string;
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
  site?: AttendanceSite | null;
  photos: AttendancePhoto[];
}

export interface ActiveAttendanceSite {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface ActiveAttendance extends Omit<Attendance, "site"> {
  site: ActiveAttendanceSite | null;
}

export interface ActiveAttendanceResponse {
  active: boolean;
  attendance?: ActiveAttendance;
}

export const getActiveAttendance = async (): Promise<ActiveAttendanceResponse> => {
  try {
    const response = await api.get("/attendance/active");
    return response.data;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const clockIn = async (
  site_id: string,
  latitude: number,
  longitude: number
): Promise<Attendance> => {
  try {
    const response = await api.post("/attendance/clockin", { site_id, latitude, longitude });
    return response.data.attendance;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const clockOut = async (
  site_id: string,
  latitude: number,
  longitude: number
): Promise<Attendance> => {
  try {
    const response = await api.post("/attendance/clockout", { site_id, latitude, longitude });
    return response.data.attendance;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const getSignedPhotoUrl = async (path: string): Promise<string> => {
  try {
    const response = await api.get("/attendance/photos/signed-url", { params: { path } });
    return response.data.signed_url;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const getAttendancePhotos = async (attendance_id: string): Promise<AttendancePhoto[]> => {
  try {
    const response = await api.get(`/attendance/photos/${attendance_id}`);
    return response.data.photos;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

const mimeFromFilename = (filename: string): string => {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic") return "image/heic";
  return "image/jpeg";
};

export const uploadBeforePhoto = async (
  attendance_id: string,
  label: string,
  uri: string
): Promise<AttendancePhoto> => {
  try {
    console.log("Starting upload for attendance_id:", attendance_id);
    const filename = uri.split("/").pop() ?? `before-${Date.now()}.jpg`;
    const formData = new FormData();
    formData.append("attendance_id", attendance_id);
    formData.append("label", label);
    // React Native needs a { uri, name, type } object; blobs from fetch(uri) are not sent reliably.
    formData.append("photo", { uri, name: filename, type: mimeFromFilename(filename) } as any);
    console.log("FormData parts:", (formData as any).getParts?.() ?? formData);

    console.log("Calling POST /attendance/photos/before");
    const response = await api.post("/attendance/photos/before", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      transformRequest: (data, headers) => {
        console.log("Axios request headers:", JSON.stringify(headers));
        return data;
      },
    });
    console.log("Upload response:", response.status, response.data);
    return response.data.photo;
  } catch (error: any) {
    console.log("Upload error:", error?.message, error?.code, error?.response?.status, error?.response?.data);
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const uploadAfterPhoto = async (photo_id: string, uri: string): Promise<AttendancePhoto> => {
  try {
    console.log("Starting after upload for photo_id:", photo_id);
    const filename = uri.split("/").pop() ?? `after-${Date.now()}.jpg`;
    const formData = new FormData();
    formData.append("after_photo", { uri, name: filename, type: mimeFromFilename(filename) } as any);
    console.log("FormData parts:", (formData as any).getParts?.() ?? formData);

    console.log(`Calling PATCH /attendance/photos/${photo_id}/after`);
    const response = await api.patch(`/attendance/photos/${photo_id}/after`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    console.log("Upload response:", response.status, response.data);
    return response.data.photo;
  } catch (error: any) {
    console.log("Upload error:", error?.message, error?.code, error?.response?.status, error?.response?.data);
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const getMyHistory = async (): Promise<Attendance[]> => {
  try {
    const response = await api.get("/attendance/my-history");
    return response.data.attendance;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const getClientHistory = async (): Promise<Attendance[]> => {
  try {
    const response = await api.get("/attendance/client-history");
    return response.data.attendance;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const getAttendanceBySite = async (site_id: string): Promise<Attendance[]> => {
  try {
    const response = await api.get(`/attendance/site/${site_id}`);
    return response.data.attendance;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const getRecentAttendance = async (limit: number = 10): Promise<Attendance[]> => {
  try {
    const response = await api.get("/attendance/recent", { params: { limit } });
    return response.data.attendance;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};
